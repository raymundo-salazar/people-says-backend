"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_runtime", {
      game_id: {
        type: S.INTEGER,
        primaryKey: true,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      game_round_id: { type: S.INTEGER, allowNull: true },
      question_id: { type: S.INTEGER, allowNull: true },
      round_index: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      pot: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      round_winner: { type: S.STRING(8), allowNull: true },
      round_points: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      control: { type: S.STRING(8), allowNull: true },
      steal_team: { type: S.STRING(8), allowNull: true },
      faceoff_strike_team: { type: S.STRING(8), allowNull: true },
      faceoff_first_team: { type: S.STRING(8), allowNull: true },
      faceoff_first_index: { type: S.INTEGER, allowNull: true },
      faceoff_second_team: { type: S.STRING(8), allowNull: true },
      faceoff_second_index: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
  },
  async down(q) {
    await q.dropTable("game_runtime")
  },
}
