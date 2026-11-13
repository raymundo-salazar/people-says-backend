"use strict"

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("game_strikes", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      game_round_id: { type: Sequelize.INTEGER, allowNull: true },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "questions", key: "id" },
        onDelete: "CASCADE",
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "teams", key: "id" },
        onDelete: "SET NULL",
      },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "players", key: "id" },
        onDelete: "SET NULL",
      },
      round_index: { type: Sequelize.INTEGER, allowNull: false },
      phase: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "turn" },
      source: { type: Sequelize.STRING(16), allowNull: false, defaultValue: "manual" },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable("game_strikes")
  },
}
