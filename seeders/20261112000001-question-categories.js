"use strict"
module.exports = {
  async up(q, S) {
    const categories = await q.sequelize.query("SELECT id FROM categories ORDER BY id", { type: S.QueryTypes.SELECT })
    if (!categories.length) throw new Error("categories_required")
    const cases = categories.map((category, index) => `WHEN ((id - 1) % ${categories.length}) = ${index} THEN ${Number(category.id)}`).join(" ")
    await q.sequelize.query(`UPDATE questions SET category_id = CASE ${cases} END WHERE category_id IS NULL`)
  },
  async down(q) { await q.sequelize.query("UPDATE questions SET category_id=NULL") },
}
