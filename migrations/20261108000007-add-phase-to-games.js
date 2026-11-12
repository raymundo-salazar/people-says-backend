"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.sequelize.query(
      queryInterface.sequelize.getDialect() === "sqlite"
        ? "PRAGMA table_info(games)"
        : "SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'games'",
      { type: require("sequelize").QueryTypes.SELECT }
    )
    if (columns.some((column) => column.name === "phase")) return
    await queryInterface.addColumn("games", "phase", {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: "lobby",
      after: "mode",
    })
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("games", "phase")
  },
}
