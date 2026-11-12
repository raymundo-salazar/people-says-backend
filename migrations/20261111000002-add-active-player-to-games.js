"use strict"

module.exports = {
  async up(queryInterface) { await queryInterface.addConstraint("games", { fields: ["active_player_id"], type: "foreign key", name: "games_active_player_id_fkey", references: { table: "players", field: "id" }, onDelete: "SET NULL", onUpdate: "CASCADE" }) },
  async down(queryInterface) { await queryInterface.removeConstraint("games", "games_active_player_id_fkey") },
}
