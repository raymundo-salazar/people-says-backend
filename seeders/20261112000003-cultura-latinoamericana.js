"use strict"

const fs = require("node:fs")
const path = require("node:path")

function parseCsvLine(line) {
  const values = []
  let value = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"'
      index += 1
      continue
    }
    if (character === '"') {
      quoted = !quoted
      continue
    }
    if (character === "," && !quoted) {
      values.push(value)
      value = ""
      continue
    }
    value += character
  }
  values.push(value)
  return values
}

module.exports = {
  async up(queryInterface) {
    const [category] = await queryInterface.sequelize.query(
      "SELECT id FROM categories WHERE name = 'Cultura latinoamericana' LIMIT 1"
    )
    if (!category.length) throw new Error("cultura_latinoamericana_category_required")
    const filePath = path.resolve(process.cwd(), "seeders/data/cultura-latinoamericana.csv")
    if (!fs.existsSync(filePath)) throw new Error("cultura_latinoamericana_csv_not_found")
    const [header, ...lines] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/)
    const headers = parseCsvLine(header).map((item) => item.replace(/^\uFEFF/, "").trim())
    const position = Object.fromEntries(headers.map((name, index) => [name, index]))
    const questions = new Map()
    for (const line of lines) {
      if (!line.trim()) continue
      const row = parseCsvLine(line)
      const prompt = row[position.pregunta]?.trim()
      const answer = row[position.respuesta]?.trim()
      if (!prompt || !answer) continue
      if (!questions.has(prompt)) {
        questions.set(prompt, {
          answerCount: Number(row[position.cantidad_respuestas]),
          answers: [],
        })
      }
      questions.get(prompt).answers.push({
        text: answer,
        votes: Number(row[position.votos_respuesta_simulados]) || 0,
        position: Number(row[position.posicion]) || questions.get(prompt).answers.length + 1,
      })
    }
    for (const [prompt, data] of questions) {
      await queryInterface.sequelize.query(
        "INSERT INTO questions (prompt, region, answers_count, category_id, created_at, updated_at) VALUES (:prompt, 'latam', :answerCount, :categoryId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        {
          replacements: {
            prompt,
            answerCount: data.answerCount || data.answers.length,
            categoryId: category[0].id,
          },
        }
      )
      const [inserted] = await queryInterface.sequelize.query(
        "SELECT id FROM questions WHERE prompt = :prompt ORDER BY id DESC LIMIT 1",
        { replacements: { prompt } }
      )
      await queryInterface.bulkInsert(
        "answers",
        data.answers
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            question_id: inserted[0].id,
            text: item.text,
            votes: item.votes,
            position: item.position,
            created_at: new Date(),
            updated_at: new Date(),
          }))
      )
    }
  },
  async down(queryInterface) {
    const [questions] = await queryInterface.sequelize.query(
      "SELECT id FROM questions WHERE category_id = (SELECT id FROM categories WHERE name = 'Cultura latinoamericana' LIMIT 1)"
    )
    for (const question of questions)
      await queryInterface.bulkDelete("answers", { question_id: question.id })
    await queryInterface.bulkDelete("questions", { id: questions.map((question) => question.id) })
  },
}
