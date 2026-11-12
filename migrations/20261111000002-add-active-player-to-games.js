"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("games", "active_player_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "players", key: "id" },
      onDelete: "SET NULL",
    })

    const [games] = await queryInterface.sequelize.query("SELECT id, active_team, state FROM games")
    for (const game of games) {
      const state = typeof game.state === "string" ? JSON.parse(game.state) : (game.state ?? {})
      const activeTeam = game.active_team ?? state.control ?? state.faceoff?.activeTeam
      const playerId = activeTeam
        ? state.playerIds?.[activeTeam]?.[state.turnIndex?.[activeTeam] ?? 0]
        : null
      if (playerId)
        await queryInterface.bulkUpdate("games", { active_player_id: playerId }, { id: game.id })
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("games", "active_player_id")
  },
}
