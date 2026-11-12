export type TeamId = "blue" | "red"
export type GameMode = "classic" | "stage" | "buttons" | "auto"
export type RoundConfig = { answerCount: number; multiplier: 1 | 2 | 3 }
export type TeamConfig = { id: TeamId; name: string; players: string[] }
export type SurveyAnswer = { text: string; points: number; position: number }
export type Phase =
  "lobby" | "faceoff" | "decision" | "turn" | "steal" | "round_result" | "tiebreaker" | "final"
export type GameState = {
  phase: Phase
  roundIndex: number
  roundConfigs: RoundConfig[]
  teams: [TeamConfig, TeamConfig]
  scores: Record<TeamId, number>
  turnIndex: Record<TeamId, number>
  control: TeamId | null
  revealed: number[]
  strikes: Record<TeamId, number>
  faceoffStrikes: Record<TeamId, number>
  faceoffStrikeTeam?: TeamId
  pot: number
  faceoff?: {
    bluePlayer?: string
    redPlayer?: string
    firstTeam?: TeamId
    activeTeam?: TeamId
    firstIndex?: number
    secondTeam?: TeamId
    secondIndex?: number
  }
  stealTeam?: TeamId | null
}
export const otherTeam = (team: TeamId): TeamId => (team === "blue" ? "red" : "blue")
export function validateAnswers(answers: SurveyAnswer[], expectedCount?: number): string[] {
  const errors: string[] = []
  if (expectedCount !== undefined && answers.length !== expectedCount)
    errors.push(`Se esperaban ${expectedCount} respuestas.`)
  if (answers.length < 4 || answers.length > 10)
    errors.push("La pregunta debe tener entre 4 y 10 respuestas.")
  if (answers.some((a) => !Number.isInteger(a.points) || a.points <= 0))
    errors.push("Todos los puntos deben ser enteros positivos.")
  if (new Set(answers.map((a) => a.points)).size !== answers.length)
    errors.push("Las puntuaciones no pueden repetirse.")
  if (answers.reduce((s, a) => s + a.points, 0) !== 100)
    errors.push("La suma debe ser exactamente 100.")
  return errors
}
export function validateRoundConfigs(configs: RoundConfig[]): string[] {
  const errors: string[] = []
  if (!configs.length) errors.push("Debe existir al menos una ronda.")
  configs.forEach((c, i) => {
    if (!Number.isInteger(c.answerCount) || c.answerCount < 4 || c.answerCount > 10)
      errors.push(`La ronda ${i + 1} debe tener entre 4 y 10 respuestas.`)
    if (![1, 2, 3].includes(c.multiplier))
      errors.push(`La ronda ${i + 1} tiene un multiplicador inválido.`)
    if (i > 0 && c.answerCount >= configs[i - 1].answerCount)
      errors.push("Cada ronda debe tener menos respuestas que la anterior.")
  })
  return errors
}
export function createInitialState(
  roundConfigs: RoundConfig[],
  teams: [TeamConfig, TeamConfig]
): GameState {
  const errors = validateRoundConfigs(roundConfigs)
  if (errors.length) throw new Error(errors.join(" "))
  if (teams.some((t) => !t.players.length))
    throw new Error("Cada equipo necesita al menos un participante.")
  return {
    phase: "lobby",
    roundIndex: 0,
    roundConfigs,
    teams,
    scores: { blue: 0, red: 0 },
    turnIndex: { blue: 0, red: 0 },
    control: null,
    revealed: [],
    strikes: { blue: 0, red: 0 },
    faceoffStrikes: { blue: 0, red: 0 },
    pot: 0,
    faceoff: undefined,
    stealTeam: null,
  }
}
export function currentPlayer(state: GameState, team: TeamId) {
  const config = state.teams.find((t) => t.id === team)!
  return config.players[state.turnIndex[team] % config.players.length]
}
export function advancePlayer(state: GameState, team: TeamId): GameState {
  const config = state.teams.find((t) => t.id === team)!
  return {
    ...state,
    turnIndex: { ...state.turnIndex, [team]: (state.turnIndex[team] + 1) % config.players.length },
  }
}
export function revealAnswer(state: GameState, answer: SurveyAnswer, index: number): GameState {
  if (
    !["turn", "faceoff", "decision", "tiebreaker"].includes(state.phase) ||
    state.revealed.includes(index)
  )
    return state
  const next = {
    ...state,
    revealed: [...state.revealed, index],
    pot: state.pot + answer.points * state.roundConfigs[state.roundIndex].multiplier,
  }
  if (next.revealed.length === state.roundConfigs[state.roundIndex].answerCount)
    next.phase = "round_result"
  return next
}
export function registerStrike(state: GameState, team: TeamId): GameState {
  if (state.phase !== "turn") return state
  const strikes = { ...state.strikes, [team]: Math.min(3, state.strikes[team] + 1) }
  return {
    ...state,
    strikes,
    phase: strikes[team] >= 3 ? "steal" : state.phase,
    stealTeam: strikes[team] >= 3 ? otherTeam(team) : state.stealTeam,
  }
}
export function finishRound(state: GameState, winner: TeamId): GameState {
  const scores = { ...state.scores, [winner]: state.scores[winner] + state.pot }
  const final = state.roundIndex >= state.roundConfigs.length - 1
  return {
    ...state,
    scores,
    phase: final ? (scores.blue === scores.red ? "tiebreaker" : "final") : "round_result",
    control: null,
  }
}
export function startTiebreaker(state: GameState, answerCount = 5): GameState {
  if (state.scores.blue !== state.scores.red) return state
  const roundConfigs = [...state.roundConfigs, { answerCount, multiplier: 1 as const }]
  return {
    ...state,
    roundConfigs,
    roundIndex: roundConfigs.length - 1,
    phase: "faceoff",
    control: null,
    revealed: [],
    strikes: { blue: 0, red: 0 },
    pot: 0,
    faceoff: undefined,
    stealTeam: null,
  }
}
