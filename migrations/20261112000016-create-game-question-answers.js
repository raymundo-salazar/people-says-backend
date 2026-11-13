"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_question_answers", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_round_question_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "game_round_questions", key: "id" },
        onDelete: "CASCADE",
      },
      answer_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "answers", key: "id" },
        onDelete: "RESTRICT",
      },
      text: { type: S.STRING(160), allowNull: false },
      votes: { type: S.INTEGER, allowNull: false },
      points: { type: S.INTEGER, allowNull: false },
      position: { type: S.INTEGER, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_question_answers", {
      fields: ["game_round_question_id", "answer_id"],
      type: "unique",
      name: "game_question_answers_round_answer_unique",
    })
  },
  async down(q) {
    await q.dropTable("game_question_answers")
  },
}
