"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("category_type_categories", {
      category_type_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "category_types", key: "id" },
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
    await q.addConstraint("category_type_categories", {
      fields: ["category_type_id", "category_id"],
      type: "unique",
      name: "category_type_categories_unique",
    })
  },
  async down(q) {
    await q.dropTable("category_type_categories")
  },
}
