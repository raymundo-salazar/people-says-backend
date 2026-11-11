"use strict"

module.exports = {
  async up(queryInterface) {
    const [games] = await queryInterface.sequelize.query('SELECT id, state FROM "games"')
    for (const game of games) {
      const state = typeof game.state === "string" ? JSON.parse(game.state) : (game.state ?? {})
      await queryInterface.bulkUpdate(
        "games",
        { phase: typeof state.phase === "string" ? state.phase : "lobby" },
        { id: game.id }
      )
    }
  },
  async down() {},
}
