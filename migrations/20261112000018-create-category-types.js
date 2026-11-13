"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("category_types", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      slug: { type: S.STRING(40), allowNull: false, unique: true },
      name: { type: S.STRING(80), allowNull: false },
      description: { type: S.STRING(280), allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
  },
  async down(q) {
    await q.dropTable("category_types")
  },
}
