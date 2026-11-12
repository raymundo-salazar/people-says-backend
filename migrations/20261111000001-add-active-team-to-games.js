"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("games", "active_team", {
      type: Sequelize.STRING(8),
      allowNull: true,
    })

    const [games] = await queryInterface.sequelize.query("SELECT id, state FROM games")
    for (const game of games) {
      const state = typeof game.state === "string" ? JSON.parse(game.state) : (game.state ?? {})
      const activeTeam =
        state.control ?? state.faceoff?.activeTeam ?? state.faceoff?.firstTeam ?? null
      if (activeTeam)
        await queryInterface.bulkUpdate("games", { active_team: activeTeam }, { id: game.id })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("games", "active_team")
  },
}
