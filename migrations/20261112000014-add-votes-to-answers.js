"use strict"
module.exports = {
  async up(q, S) {
    await q.addColumn("answers", "votes", { type: S.INTEGER, allowNull: false, defaultValue: 0 })
    await q.sequelize.query("UPDATE answers SET votes = points")
    await q.removeColumn("answers", "points")
  },
  async down(q, S) {
    await q.addColumn("answers", "points", { type: S.INTEGER, allowNull: false, defaultValue: 0 })
    await q.sequelize.query("UPDATE answers SET points = votes")
    await q.removeColumn("answers", "votes")
  },
}
