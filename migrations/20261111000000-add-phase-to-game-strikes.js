"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("game_strikes", "phase", {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: "turn",
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("game_strikes", "phase")
  },
}
