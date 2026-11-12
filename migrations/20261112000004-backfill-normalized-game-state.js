"use strict"
const { QueryTypes } = require("sequelize")
module.exports = {
  async up(q) {
    const columns = await q.sequelize.query(
      q.sequelize.getDialect() === "sqlite"
        ? "PRAGMA table_info(games)"
        : "SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'games'",
      { type: QueryTypes.SELECT }
    )
    if (!columns.some((column) => column.name === "state")) return
    const [games] = await q.sequelize.query("SELECT * FROM games")
    for (const game of games) {
      const state = typeof game.state === "string" ? JSON.parse(game.state) : (game.state || {})
      await q.bulkInsert("game_runtime", [{ game_id: game.id, question_id: state.questionId ?? null, round_index: state.roundIndex ?? 0, pot: state.pot ?? 0, control: state.control ?? null, steal_team: state.stealTeam ?? null, faceoff_strike_team: state.faceoffStrikeTeam ?? null, faceoff_first_team: state.faceoff?.firstTeam ?? null, faceoff_first_index: state.faceoff?.firstIndex ?? null, faceoff_second_team: state.faceoff?.secondTeam ?? null, faceoff_second_index: state.faceoff?.secondIndex ?? null, created_at: new Date(), updated_at: new Date() }])
      for (let i = 0; i < (state.roundConfigs || []).length; i++) {
        const config = state.roundConfigs[i]
        await q.bulkInsert("game_round_configs", [{ game_id: game.id, round_index: i, answer_count: config.answerCount, multiplier: config.multiplier, created_at: new Date(), updated_at: new Date() }])
      }
      for (const key of ["blue", "red"]) {
        const team = (state.teams || []).find((item) => item.id === key) || { name: key === "blue" ? "Equipo Azul" : "Equipo Rojo" }
        await q.bulkInsert("game_team_states", [{ game_id: game.id, team_key: key, team_name: team.name, score: state.scores?.[key] || 0, turn_index: state.turnIndex?.[key] || 0, strikes: state.strikes?.[key] || 0, faceoff_strikes: state.faceoffStrikes?.[key] || 0, created_at: new Date(), updated_at: new Date() }])
      }
      for (let i = 0; i < (state.answers || []).length; i++) {
        const answer = state.answers[i]
        await q.bulkInsert("game_runtime_answers", [{ game_id: game.id, answer_index: i, answer_id: state.answerIds?.[i] ?? null, text: answer.text, points: answer.points, position: answer.position, revealed: (state.revealed || []).includes(i), created_at: new Date(), updated_at: new Date() }])
      }
    }
  },
  async down(q) {
    await q.sequelize.query("DELETE FROM game_runtime_answers")
    await q.sequelize.query("DELETE FROM game_team_states")
    await q.sequelize.query("DELETE FROM game_round_configs")
    await q.sequelize.query("DELETE FROM game_runtime")
  },
}
