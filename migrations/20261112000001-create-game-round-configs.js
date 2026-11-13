"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_round_configs", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      round_index: { type: S.INTEGER, allowNull: false },
      answer_count: { type: S.INTEGER, allowNull: false },
      multiplier: { type: S.INTEGER, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_round_configs", {
      fields: ["game_id", "round_index"],
      type: "unique",
      name: "game_round_configs_game_round_unique",
    })
  },
  async down(q) {
    await q.dropTable("game_round_configs")
  },
}
