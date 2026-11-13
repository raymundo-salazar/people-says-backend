"use strict"
const fs = require("node:fs")
const path = require("node:path")

function parse(line) {
  const values = []
  let value = ""
  let quoted = false
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === "," && !quoted) {
      values.push(value)
      value = ""
      continue
    }
    value += char
  }
  values.push(value)
  return values
}

function readCsv(file) {
  const [header, ...lines] = fs
    .readFileSync(path.resolve(process.cwd(), file), "utf8")
    .trim()
    .split(/\r?\n/)
  const keys = parse(header.replace(/^\uFEFF/, ""))
  return lines
    .filter(Boolean)
    .map((line) => Object.fromEntries(parse(line).map((value, index) => [keys[index], value])))
}

module.exports = {
  async up(q) {
    const types = readCsv("seeders/data/category-types.csv")
    const categories = readCsv("seeders/data/categories.csv")
    await q.bulkInsert(
      "category_types",
      types.map((type) => ({ ...type, created_at: new Date(), updated_at: new Date() }))
    )
    await q.bulkInsert(
      "categories",
      categories.map(({ code, name, description }) => ({
        code,
        name,
        description,
        created_at: new Date(),
        updated_at: new Date(),
      }))
    )
    const [typeRows] = await q.sequelize.query("SELECT id, slug FROM category_types")
    const [categoryRows] = await q.sequelize.query("SELECT id, name FROM categories")
    const typeIds = Object.fromEntries(typeRows.map((row) => [row.slug, row.id]))
    const categoryIds = Object.fromEntries(categoryRows.map((row) => [row.name, row.id]))
    const relations = categories.flatMap((category) =>
      category.types.split("|").map((slug) => ({
        category_type_id: typeIds[slug],
        category_id: categoryIds[category.name],
        created_at: new Date(),
        updated_at: new Date(),
      }))
    )
    await q.bulkInsert("category_type_categories", relations)
  },
  async down(q) {
    try {
      await q.bulkDelete("category_type_categories", {})
      await q.bulkDelete("categories", {})
      await q.bulkDelete("category_types", {})
    } catch (error) {
      if (!String(error).includes("no such table")) throw error
    }
  },
}
