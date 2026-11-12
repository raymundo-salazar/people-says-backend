"use strict"

module.exports = {
  async up(q, S) {
    await q.addColumn("game_runtime", "round_winner", { type: S.STRING(8), allowNull: true })
    await q.addColumn("game_runtime", "round_points", {
      type: S.INTEGER,
      allowNull: false,
      defaultValue: 0,
    })
  },
  async down(q) {
    await q.removeColumn("game_runtime", "round_points")
    await q.removeColumn("game_runtime", "round_winner")
  },
}
