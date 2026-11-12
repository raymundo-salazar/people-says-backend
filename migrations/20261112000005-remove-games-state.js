"use strict"
module.exports = {
  async up(q, S) {
    if (q.sequelize.getDialect() === "sqlite") {
      await q.sequelize.query("PRAGMA foreign_keys = OFF")
      await q.sequelize.query("ALTER TABLE games DROP COLUMN state")
      await q.sequelize.query("PRAGMA foreign_keys = ON")
    } else await q.removeColumn("games", "state")
  },
  async down(q, S) { await q.addColumn("games", "state", { type: S.JSON, allowNull: false, defaultValue: {} }) },
}
