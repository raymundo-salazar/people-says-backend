"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
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
