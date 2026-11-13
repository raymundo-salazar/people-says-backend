"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_team_states", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      team_key: { type: S.STRING(8), allowNull: false },
      team_name: { type: S.STRING(100), allowNull: false },
      score: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      turn_index: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      strikes: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      faceoff_strikes: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_team_states", {
      fields: ["game_id", "team_key"],
      type: "unique",
      name: "game_team_states_game_team_unique",
    })
  },
  async down(q) {
    await q.dropTable("game_team_states")
  },
}
