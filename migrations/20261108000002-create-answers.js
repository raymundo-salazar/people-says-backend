"use strict";
module.exports = {
  async up(q, S) {
    await q.createTable("answers", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      question_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "questions", key: "id" },
        onDelete: "CASCADE",
      },
      text: { type: S.STRING(160), allowNull: false },
      points: { type: S.INTEGER, allowNull: false },
      position: { type: S.INTEGER, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    });
  },
  async down(q) {
    await q.dropTable("answers");
  },
};
