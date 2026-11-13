"use strict"
module.exports = {
  async up(q, S) {
    await q.createTable("question_responses", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      question_id: {
        type: S.INTEGER,
        allowNull: false,
        references: { model: "questions", key: "id" },
        onDelete: "CASCADE",
      },
      answer_id: {
        type: S.INTEGER,
        allowNull: true,
        references: { model: "answers", key: "id" },
        onDelete: "SET NULL",
      },
      game_id: {
        type: S.INTEGER,
        allowNull: true,
        references: { model: "games", key: "id" },
        onDelete: "SET NULL",
      },
      game_round_id: { type: S.INTEGER, allowNull: true },
      round_index: { type: S.INTEGER, allowNull: true },
      team_id: {
        type: S.INTEGER,
        allowNull: true,
        references: { model: "teams", key: "id" },
        onDelete: "SET NULL",
      },
      player_id: {
        type: S.INTEGER,
        allowNull: true,
        references: { model: "players", key: "id" },
        onDelete: "SET NULL",
      },
      submitted_text: { type: S.STRING(160), allowNull: false },
      is_valid: { type: S.BOOLEAN, allowNull: false },
      awarded_points: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
  },
  async down(q) {
    await q.dropTable("question_responses")
  },
}
