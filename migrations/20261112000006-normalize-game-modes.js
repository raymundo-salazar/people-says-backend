"use strict"

module.exports = {
  async up(q) {
    await q.sequelize.query("UPDATE games SET mode = 'classic' WHERE mode IN ('stage', 'buttons')")
  },
  async down() {},
}
