"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("games", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: S.STRING(8), allowNull: false, unique: true },
      name: { type: S.STRING(120) },
      mode: { type: S.STRING(32), allowNull: false },
      phase: { type: S.STRING(32), allowNull: false, defaultValue: "lobby" },
      active_team: { type: S.STRING(8), allowNull: true },
      active_player_id: { type: S.INTEGER, allowNull: true },
      host_token: { type: S.STRING(80), allowNull: true, unique: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
  },
  async down(q) {
    await q.dropTable("games")
  },
}
