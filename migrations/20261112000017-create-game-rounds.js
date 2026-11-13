"use strict"

module.exports = {
  async up(q, S) {
    await q.createTable("game_rounds", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      round_index: { type: S.INTEGER, allowNull: false },
      question_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "questions", key: "id" },
        onDelete: "RESTRICT",
      },
      multiplier: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      points: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      winner_team: { type: S.STRING(8), allowNull: true },
      status: { type: S.STRING(16), allowNull: false, defaultValue: "pending" },
      started_at: { type: S.DATE, allowNull: true },
      finished_at: { type: S.DATE, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_rounds", {
      fields: ["game_id", "round_index"],
      type: "unique",
      name: "game_rounds_game_index_unique",
    })
  },
  async down(q) {
    await q.dropTable("game_rounds")
  },
}
