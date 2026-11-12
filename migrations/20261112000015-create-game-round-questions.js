"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_round_questions", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      round_index: { type: S.INTEGER, allowNull: false },
      question_id: { type: S.INTEGER, allowNull: false, references: { model: "questions", key: "id" }, onDelete: "RESTRICT" },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_round_questions", { fields: ["game_id", "round_index"], type: "unique", name: "game_round_questions_game_round_unique" })
    await q.addConstraint("game_round_questions", { fields: ["game_id", "question_id"], type: "unique", name: "game_round_questions_game_question_unique" })
  },
  async down(q) { await q.dropTable("game_round_questions") },
}
