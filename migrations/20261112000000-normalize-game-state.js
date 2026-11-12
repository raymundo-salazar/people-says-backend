"use strict"

module.exports = {
  async up(q, S) {
    await q.createTable("game_runtime", {
      game_id: { type: S.INTEGER, primaryKey: true, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      question_id: { type: S.INTEGER, allowNull: true },
      round_index: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      pot: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      control: { type: S.STRING(8), allowNull: true },
      steal_team: { type: S.STRING(8), allowNull: true },
      faceoff_strike_team: { type: S.STRING(8), allowNull: true },
      faceoff_first_team: { type: S.STRING(8), allowNull: true },
      faceoff_first_index: { type: S.INTEGER, allowNull: true },
      faceoff_second_team: { type: S.STRING(8), allowNull: true },
      faceoff_second_index: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.createTable("game_round_configs", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      round_index: { type: S.INTEGER, allowNull: false },
      answer_count: { type: S.INTEGER, allowNull: false },
      multiplier: { type: S.INTEGER, allowNull: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_round_configs", { fields: ["game_id", "round_index"], type: "unique", name: "game_round_configs_game_round_unique" })
    await q.createTable("game_team_states", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      team_key: { type: S.STRING(8), allowNull: false },
      team_name: { type: S.STRING(100), allowNull: false },
      score: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      turn_index: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      strikes: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      faceoff_strikes: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_team_states", { fields: ["game_id", "team_key"], type: "unique", name: "game_team_states_game_team_unique" })
    await q.createTable("game_runtime_answers", {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      game_id: { type: S.INTEGER, allowNull: false, references: { model: "games", key: "id" }, onDelete: "CASCADE" },
      answer_index: { type: S.INTEGER, allowNull: false },
      answer_id: { type: S.INTEGER, allowNull: true },
      text: { type: S.STRING(160), allowNull: false },
      points: { type: S.INTEGER, allowNull: false },
      position: { type: S.INTEGER, allowNull: false },
      revealed: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.NOW },
    })
    await q.addConstraint("game_runtime_answers", { fields: ["game_id", "answer_index"], type: "unique", name: "game_runtime_answers_game_index_unique" })

    const [games] = await q.sequelize.query("SELECT * FROM games")
    for (const game of games) {
      const state = typeof game.state === "string" ? JSON.parse(game.state) : (game.state || {})
      await q.bulkInsert("game_runtime", [{
        game_id: game.id, question_id: state.questionId ?? null, round_index: state.roundIndex ?? 0,
        pot: state.pot ?? 0, control: state.control ?? null, steal_team: state.stealTeam ?? null,
        faceoff_strike_team: state.faceoffStrikeTeam ?? null, faceoff_first_team: state.faceoff?.firstTeam ?? null,
        faceoff_first_index: state.faceoff?.firstIndex ?? null, faceoff_second_team: state.faceoff?.secondTeam ?? null,
        faceoff_second_index: state.faceoff?.secondIndex ?? null, created_at: new Date(), updated_at: new Date(),
      }])
      for (let i = 0; i < (state.roundConfigs || []).length; i++) {
        const c = state.roundConfigs[i]
        await q.bulkInsert("game_round_configs", [{ game_id: game.id, round_index: i, answer_count: c.answerCount, multiplier: c.multiplier, created_at: new Date(), updated_at: new Date() }])
      }
      for (const key of ["blue", "red"]) {
        const team = (state.teams || []).find((t) => t.id === key) || { name: key === "blue" ? "Equipo Azul" : "Equipo Rojo" }
        await q.bulkInsert("game_team_states", [{ game_id: game.id, team_key: key, team_name: team.name, score: state.scores?.[key] || 0, turn_index: state.turnIndex?.[key] || 0, strikes: state.strikes?.[key] || 0, faceoff_strikes: state.faceoffStrikes?.[key] || 0, created_at: new Date(), updated_at: new Date() }])
      }
      for (let i = 0; i < (state.answers || []).length; i++) {
        const a = state.answers[i]
        await q.bulkInsert("game_runtime_answers", [{ game_id: game.id, answer_index: i, answer_id: state.answerIds?.[i] ?? null, text: a.text, points: a.points, position: a.position, revealed: (state.revealed || []).includes(i), created_at: new Date(), updated_at: new Date() }])
      }
    }
    // SQLite rebuilds a table when removing a column and can fail while other
    // normalized tables reference it. Its native DROP COLUMN is safe here
    // because the state has already been copied and the new tables use the
    // stable games primary key.
    if (q.sequelize.getDialect() === "sqlite") {
      await q.sequelize.query("PRAGMA foreign_keys = OFF")
      await q.sequelize.query("ALTER TABLE games DROP COLUMN state")
      await q.sequelize.query("PRAGMA foreign_keys = ON")
    } else {
      await q.removeColumn("games", "state")
    }
  },
  async down(q, S) {
    await q.addColumn("games", "state", { type: S.JSON, allowNull: false, defaultValue: {} })
    await q.dropTable("game_runtime_answers")
    await q.dropTable("game_team_states")
    await q.dropTable("game_round_configs")
    await q.dropTable("game_runtime")
  },
}
