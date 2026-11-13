"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("players", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      team_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: S.STRING(120), allowNull: false },
      sort_order: { type: S.INTEGER, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
  },
  async down(q) {
    await q.dropTable("players")
  },
}
