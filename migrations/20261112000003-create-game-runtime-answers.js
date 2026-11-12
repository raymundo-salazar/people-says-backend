"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_runtime_answers", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true }, game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      answer_index: { type: S.INTEGER, allowNull: false }, answer_id: { type: S.INTEGER, allowNull: true }, text: { type: S.STRING(160), allowNull: false }, points: { type: S.INTEGER, allowNull: false }, position: { type: S.INTEGER, allowNull: false }, revealed: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW }, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_runtime_answers", { fields: ["game_id", "answer_index"], type: "unique", name: "game_runtime_answers_game_index_unique" })
  },
  async down(q) { await q.dropTable("game_runtime_answers") },
}
