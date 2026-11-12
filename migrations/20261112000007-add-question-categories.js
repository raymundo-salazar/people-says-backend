"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("categories", { id: { type: S.INTEGER, autoIncrement: true, primaryKey: true }, name: { type: S.STRING(100), allowNull: false, unique: true }, description: { type: S.STRING(280), allowNull: false }, created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW }, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW } })
    await q.addColumn("questions", "category_id", { type: S.INTEGER, allowNull: true, references: { model: "categories", key: "id" }, onDelete: "SET NULL" })
    await q.createTable("game_categories", { game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" }, category_id: { type: S.INTEGER, allowNull: false, references: { model: "categories", key: "id" }, onDelete: "CASCADE" }, created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW }, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW } })
    await q.addConstraint("game_categories", { fields: ["game_id", "category_id"], type: "unique", name: "game_categories_game_category_unique" })
    await q.createTable("game_questions", { game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" }, question_id: { type: S.INTEGER, allowNull: false, references: { model: "questions", key: "id" }, onDelete: "CASCADE" }, created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW }, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW } })
    await q.addConstraint("game_questions", { fields: ["game_id", "question_id"], type: "unique", name: "game_questions_game_question_unique" })
  },
  async down(q) { await q.dropTable("game_questions"); await q.dropTable("game_categories"); await q.removeColumn("questions", "category_id"); await q.dropTable("categories") },
}
