"use strict"
const { QueryTypes } = require("sequelize")
module.exports = {
  async up(q, S) {
    const columns = await q.sequelize.query(
      q.sequelize.getDialect() === "sqlite"
        ? "PRAGMA table_info(games)"
        : "SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'games'",
      { type: QueryTypes.SELECT }
    )
    if (!columns.some((column) => column.name === "state")) return
    if (q.sequelize.getDialect() === "sqlite") {
      await q.sequelize.query("PRAGMA foreign_keys = OFF")
      await q.sequelize.query("ALTER TABLE games DROP COLUMN state")
      await q.sequelize.query("PRAGMA foreign_keys = ON")
    } else await q.removeColumn("games", "state")
  },
  async down(q, S) { await q.addColumn("games", "state", { type: S.JSON, allowNull: false, defaultValue: {} }) },
}
