"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("game_categories", {
      game_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "games", key: "id" },
        onDelete: "CASCADE",
      },
      category_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "categories", key: "id" },
        onDelete: "CASCADE",
      },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_categories", {
      fields: ["game_id", "category_id"],
      type: "unique",
      name: "game_categories_game_category_unique",
    })
  },
  async down(q) {
    await q.dropTable("game_categories")
  },
}
