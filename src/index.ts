import "dotenv/config"
import express, { type Request } from "express"
import cors from "cors"
import helmet from "helmet"
import { handle as i18nHandle } from "i18next-http-middleware"
import morgan from "morgan"
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"
import { Server } from "socket.io"
import { Op, QueryTypes } from "sequelize"
import {
  Answer,
  Game,
  GameStrike,
  Player,
  Question,
  QuestionResponse,
  Team,
  database,
} from "./models/index.js"
import {
  createInitialState,
  advancePlayer,
  currentPlayer,
  finishRound,
  otherTeam,
  registerStrike,
  revealAnswer,
  startTiebreaker,
  validateRoundConfigs,
  type GameState,
  type RoundConfig,
  type TeamConfig,
  type TeamId,
} from "./game/rules.js"
import i18n from "./locales/i18n.js"

type Role = "host" | "display" | "blue_button" | "red_button" | "pending"
type Device = {
  id: string
  role: Role
  name: string
  deviceType: string
  connectedAt: number
  socketId?: string
  controller?: boolean
}
type Room = {
  game: Game
  state: StoredState
  devices: Map<string, Device>
  buzzerWinner: TeamId | null
  autoTimer?: ReturnType<typeof setTimeout>
}
type StoredState = GameState & {
  questionId: number
  questionPrompt: string
  answerIds: number[]
  answers: Array<{ text: string; points: number; position: number }>
  teamIds?: Record<TeamId, number>
  playerIds?: Record<TeamId, number[]>
}
const rooms = new Map<string, Room>()
const app = express()
const origins = [process.env.APP_ORIGIN, ...(process.env.APP_ORIGINS ?? "").split(",")]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.trim())
  .filter(Boolean)
const allowedOrigins = origins.length ? origins : ["http://localhost:5173", "http://localhost:5174"]
app.set("trust proxy", true)
app.use(helmet())
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())
app.use(morgan("combined"))
app.use(i18nHandle(i18n))
const token = () => randomBytes(24).toString("hex")
const makeCode = () => randomBytes(4).toString("hex").toUpperCase()
const publicState = (state: Record<string, unknown>) => {
  const copy = structuredClone(state)
  const answers = Array.isArray(copy.answers) ? copy.answers : []
  const revealed = Array.isArray(copy.revealed) ? copy.revealed : []
  delete copy.answerIds
  copy.answers = answers.map((answer, index) =>
    revealed.includes(index) ? answer : { ...answer, text: "", points: 0 }
  )
  copy.answerCount = answers.length
  return copy
}
const prepareFaceoff = (state: StoredState) => {
  state.faceoffStrikes = { blue: 0, red: 0 }
  state.faceoffStrikeTeam = undefined
  state.faceoff = {
    bluePlayer: currentPlayer(state, "blue"),
    redPlayer: currentPlayer(state, "red"),
  }
}
async function normalizedState(game: Game): Promise<StoredState> {
  const runtime = (await database.query<any>("SELECT * FROM game_runtime WHERE game_id = :gameId", { replacements: { gameId: game.id }, type: QueryTypes.SELECT }))[0]
  const rounds = await database.query<any>("SELECT * FROM game_round_configs WHERE game_id = :gameId ORDER BY round_index", { replacements: { gameId: game.id }, type: QueryTypes.SELECT })
  const teams = await database.query<any>("SELECT * FROM game_team_states WHERE game_id = :gameId ORDER BY team_key", { replacements: { gameId: game.id }, type: QueryTypes.SELECT })
  const runtimeAnswers = await database.query<any>("SELECT * FROM game_runtime_answers WHERE game_id = :gameId ORDER BY answer_index", { replacements: { gameId: game.id }, type: QueryTypes.SELECT })
  const configuredTeams = await Team.findAll({ where: { gameId: game.id }, include: [{ model: Player, as: "players" }], order: [["color", "ASC"]] })
  const teamConfig = (["blue", "red"] as TeamId[]).map((key) => {
    const row = configuredTeams.find((team) => team.color === key)
    return { id: key, name: teams.find((item) => item.team_key === key)?.team_name ?? row?.name ?? (key === "blue" ? "Equipo Azul" : "Equipo Rojo"), players: (row?.get("players") as Player[] | undefined)?.sort((a, b) => a.sortOrder - b.sortOrder).map((player) => player.name) ?? [] }
  }) as [TeamConfig, TeamConfig]
  const playerIds = Object.fromEntries((configuredTeams as Team[]).map((team) => [team.color, (team.get("players") as Player[] | undefined)?.sort((a, b) => a.sortOrder - b.sortOrder).map((player) => player.id) ?? []])) as Record<TeamId, number[]>
  const state: StoredState = {
    phase: game.phase as GameState["phase"], roundIndex: runtime?.round_index ?? 0,
    roundConfigs: rounds.map((row) => ({ answerCount: row.answer_count, multiplier: row.multiplier })), teams: teamConfig,
    scores: { blue: teams.find((row) => row.team_key === "blue")?.score ?? 0, red: teams.find((row) => row.team_key === "red")?.score ?? 0 },
    turnIndex: { blue: teams.find((row) => row.team_key === "blue")?.turn_index ?? 0, red: teams.find((row) => row.team_key === "red")?.turn_index ?? 0 },
    control: runtime?.control ?? null, revealed: runtimeAnswers.filter((row) => row.revealed).map((row) => row.answer_index),
    strikes: { blue: teams.find((row) => row.team_key === "blue")?.strikes ?? 0, red: teams.find((row) => row.team_key === "red")?.strikes ?? 0 },
    faceoffStrikes: { blue: teams.find((row) => row.team_key === "blue")?.faceoff_strikes ?? 0, red: teams.find((row) => row.team_key === "red")?.faceoff_strikes ?? 0 },
    faceoffStrikeTeam: runtime?.faceoff_strike_team ?? undefined, pot: runtime?.pot ?? 0, stealTeam: runtime?.steal_team ?? null,
    questionId: runtime?.question_id, questionPrompt: "", answerIds: runtimeAnswers.map((row) => row.answer_id), answers: runtimeAnswers.map((row) => ({ text: row.text, points: row.points, position: row.position })), teamIds: Object.fromEntries((configuredTeams as Team[]).map((team) => [team.color, team.id])) as Record<TeamId, number>, playerIds,
  }
  if (runtime?.faceoff_first_team || runtime?.faceoff_second_team || game.phase === "faceoff" || game.phase === "decision" || game.phase === "tiebreaker") state.faceoff = { firstTeam: runtime?.faceoff_first_team ?? undefined, firstIndex: runtime?.faceoff_first_index ?? undefined, secondTeam: runtime?.faceoff_second_team ?? undefined, secondIndex: runtime?.faceoff_second_index ?? undefined, activeTeam: game.activeTeam ?? undefined, bluePlayer: state.teams[0].players[state.turnIndex.blue], redPlayer: state.teams[1].players[state.turnIndex.red] }
  if (state.questionId) { const question = await Question.findByPk(state.questionId); state.questionPrompt = question?.prompt ?? "" }
  return state
}
const auth = (req: Request, game: Game) =>
  req.header("x-host-token") === game.hostToken ||
  req.body?.hostToken === game.hostToken ||
  req.query.hostToken === game.hostToken
const snapshot = (room: Room, privateView = false) => ({
  code: room.game.code,
  name: room.game.name,
  mode: room.game.mode,
  activeTeam: room.game.activeTeam,
  activePlayerId: room.game.activePlayerId,
  activePlayer: (() => {
    if (!room.game.activeTeam || !room.game.activePlayerId) return null
    const state = room.state
    const teamIndex = state.teams.findIndex((team) => team.id === room.game.activeTeam)
    const team = state.teams[teamIndex]
    const playerIndex =
      state.playerIds?.[room.game.activeTeam]?.indexOf(room.game.activePlayerId) ?? -1
    return team && playerIndex >= 0
      ? {
          id: room.game.activePlayerId,
          name: team.players[playerIndex],
          team: room.game.activeTeam,
        }
      : null
  })(),
  state: (() => {
    const state = structuredClone(room.state) as StoredState & {
      strikeLimit?: number
      displayStrikes?: Record<TeamId, number>
    }
    const faceoffMode = ["faceoff", "decision", "tiebreaker"].includes(state.phase)
    state.strikeLimit = faceoffMode ? 5 : 3
    state.displayStrikes = faceoffMode
      ? (state.faceoffStrikes ?? { blue: 0, red: 0 })
      : state.strikes
    return privateView ? state : publicState(state)
  })(),
  devices: [...room.devices.values()],
})
async function loadRoom(code: string) {
  const normalized = code.toUpperCase()
  const cached = rooms.get(normalized)
  if (cached) return cached
  const game = await Game.findOne({ where: { code: normalized } })
  if (!game) return null
  const state = await normalizedState(game)
  if (game.activeTeam) state.control = game.activeTeam
  const room = { game, state, devices: new Map<string, Device>(), buzzerWinner: null }
  rooms.set(normalized, room)
  return room
}
async function questionFor(count: number, gameId?: number, categoryIds?: number[]) {
  const where: any = { answersCount: count }
  if (gameId) {
    const rows = await database.query<{ question_id: number }>("SELECT question_id FROM game_questions WHERE game_id=:gameId", { replacements: { gameId }, type: QueryTypes.SELECT })
    where.id = rows.map((row) => row.question_id)
  } else if (categoryIds?.length) where.categoryId = categoryIds
  const question = await Question.findOne({ where, order: [["id", "ASC"]] })
  if (!question) throw new Error("question_not_found")
  const answers = await Answer.findAll({
    where: { questionId: question.id },
    order: [["position", "ASC"]],
  })
  return { question, answers }
}
async function persist(room: Room, state: Record<string, unknown>) {
  room.state = state as StoredState
  room.game.phase = typeof state.phase === "string" ? state.phase : "lobby"
  const faceoff = state.faceoff as { activeTeam?: TeamId; firstTeam?: TeamId } | undefined
  room.game.activeTeam =
    (["faceoff", "decision", "tiebreaker"].includes(room.game.phase)
      ? (faceoff?.activeTeam ?? faceoff?.firstTeam)
      : (state.control as TeamId | null | undefined)) ?? null
  const activePlayerIds = state.playerIds as Record<TeamId, number[]> | undefined
  const turnIndex = state.turnIndex as Record<TeamId, number> | undefined
  const activeTeam = room.game.activeTeam
  room.game.activePlayerId = activeTeam
    ? (activePlayerIds?.[activeTeam]?.[turnIndex?.[activeTeam] ?? 0] ?? null)
    : null
  const typed = room.state
  for (const key of ["blue", "red"] as TeamId[]) {
    const config = typed.teams.find((team) => team.id === key)!
    const [team] = await Team.findOrCreate({ where: { gameId: room.game.id, color: key }, defaults: { gameId: room.game.id, color: key, name: config.name } })
    team.name = config.name
    await team.save()
    const players = await Player.findAll({ where: { teamId: team.id }, order: [["sortOrder", "ASC"]] })
    for (const [sortOrder, name] of config.players.entries()) {
      const player = players[sortOrder] ?? Player.build({ teamId: team.id, name, sortOrder })
      player.name = name
      player.sortOrder = sortOrder
      await player.save()
    }
    if (players.length > config.players.length) await Player.destroy({ where: { teamId: team.id, sortOrder: { [Op.gte]: config.players.length } } })
  }
  await database.query("UPDATE game_runtime SET question_id=:questionId, round_index=:roundIndex, pot=:pot, control=:control, steal_team=:stealTeam, faceoff_strike_team=:faceoffStrikeTeam, faceoff_first_team=:firstTeam, faceoff_first_index=:firstIndex, faceoff_second_team=:secondTeam, faceoff_second_index=:secondIndex, updated_at=CURRENT_TIMESTAMP WHERE game_id=:gameId", { replacements: { gameId: room.game.id, questionId: typed.questionId ?? null, roundIndex: typed.roundIndex, pot: typed.pot, control: typed.control ?? null, stealTeam: typed.stealTeam ?? null, faceoffStrikeTeam: typed.faceoffStrikeTeam ?? null, firstTeam: typed.faceoff?.firstTeam ?? null, firstIndex: typed.faceoff?.firstIndex ?? null, secondTeam: typed.faceoff?.secondTeam ?? null, secondIndex: typed.faceoff?.secondIndex ?? null } })
  await database.query("DELETE FROM game_round_configs WHERE game_id=:gameId", { replacements: { gameId: room.game.id } })
  for (const [roundIndex, config] of typed.roundConfigs.entries()) await database.query("INSERT INTO game_round_configs (game_id, round_index, answer_count, multiplier, created_at, updated_at) VALUES (:gameId,:roundIndex,:answerCount,:multiplier,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: room.game.id, roundIndex, answerCount: config.answerCount, multiplier: config.multiplier } })
  for (const key of ["blue", "red"] as TeamId[]) await database.query("UPDATE game_team_states SET team_name=:name, score=:score, turn_index=:turnIndex, strikes=:strikes, faceoff_strikes=:faceoffStrikes, updated_at=CURRENT_TIMESTAMP WHERE game_id=:gameId AND team_key=:key", { replacements: { gameId: room.game.id, key, name: typed.teams.find((team) => team.id === key)?.name ?? key, score: typed.scores[key], turnIndex: typed.turnIndex[key], strikes: typed.strikes[key], faceoffStrikes: typed.faceoffStrikes[key] ?? 0 } })
  await database.query("UPDATE game_runtime_answers SET revealed=false, updated_at=CURRENT_TIMESTAMP WHERE game_id=:gameId", { replacements: { gameId: room.game.id } })
  for (const index of typed.revealed) await database.query("UPDATE game_runtime_answers SET revealed=true, updated_at=CURRENT_TIMESTAMP WHERE game_id=:gameId AND answer_index=:index", { replacements: { gameId: room.game.id, index } })
  await database.query("DELETE FROM game_runtime_answers WHERE game_id=:gameId", { replacements: { gameId: room.game.id } })
  for (const [index, answer] of typed.answers.entries()) await database.query("INSERT INTO game_runtime_answers (game_id, answer_index, answer_id, text, points, position, revealed, created_at, updated_at) VALUES (:gameId,:index,:answerId,:text,:points,:position,:revealed,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: room.game.id, index, answerId: typed.answerIds[index] ?? null, text: answer.text, points: answer.points, position: answer.position, revealed: typed.revealed.includes(index) } })
  await room.game.save()
  return state
}
function emitState(io: Server, room: Room) {
  io.to(room.game.code).emit("game:state", snapshot(room))
  for (const client of io.sockets.sockets.values())
    if (client.data.room === room.game.code && client.data.role === "host")
      client.emit("game:state", snapshot(room, true))
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "people-says" }))
app.post("/api/rooms", async (req, res) => {
  try {
    const configs: RoundConfig[] = (
      Array.isArray(req.body?.rounds) ? req.body.rounds : [10, 8, 6, 5, 4]
    ).map((item: unknown) =>
      typeof item === "number"
        ? { answerCount: item, multiplier: 1 as const }
        : (item as RoundConfig)
    )
    const incoming = (Array.isArray(req.body?.teams) ? req.body.teams : []) as Array<{
      name?: string
      players?: string[]
    }>
    const teams: [TeamConfig, TeamConfig] = [
      {
        id: "blue",
        name: incoming[0]?.name ?? "Equipo Azul",
        players: incoming[0]?.players?.filter(Boolean) ?? ["Jugador 1"],
      },
      {
        id: "red",
        name: incoming[1]?.name ?? "Equipo Rojo",
        players: incoming[1]?.players?.filter(Boolean) ?? ["Jugador 1"],
      },
    ]
    const state = createInitialState(configs, teams) as StoredState
    const hostToken = token()
    let code = ""
    do code = makeCode()
    while (await Game.findOne({ where: { code } }))
    const requestedCategoryIds = Array.isArray(req.body?.categoryIds) ? req.body.categoryIds.map(Number).filter(Number.isInteger) : []
    const categoryIds = requestedCategoryIds.length
      ? (await database.query<{ id: number }>("SELECT id FROM categories WHERE id IN (:ids)", { replacements: { ids: requestedCategoryIds }, type: QueryTypes.SELECT })).map((category) => category.id)
      : (await database.query<{ id: number }>("SELECT id FROM categories ORDER BY id", { type: QueryTypes.SELECT })).map((category) => category.id)
    if (categoryIds.length !== 1) throw new Error("exactly_one_category_required")
    const selected = await questionFor(configs[0].answerCount, undefined, categoryIds)
    state.questionId = selected.question.id
    state.questionPrompt = selected.question.prompt
    state.answerIds = selected.answers.map((a) => a.id)
    state.answers = selected.answers.map((a) => ({
      text: a.text,
      points: a.points,
      position: a.position,
    }))
    const game = await Game.create({
      code,
      name: req.body?.name ?? "La gente dice",
      mode: ["classic", "auto"].includes(req.body?.mode)
        ? req.body.mode
        : "classic",
      phase: state.phase,
      hostToken,
    })
    await database.query("INSERT INTO game_categories (game_id, category_id, created_at, updated_at) SELECT :gameId, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM categories WHERE id IN (:categoryIds)", { replacements: { gameId: game.id, categoryIds } })
    await database.query("INSERT INTO game_questions (game_id, question_id, created_at, updated_at) SELECT :gameId, id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM questions WHERE category_id IN (:categoryIds)", { replacements: { gameId: game.id, categoryIds } })
    await database.query("INSERT INTO game_runtime (game_id, question_id, round_index, pot, created_at, updated_at) VALUES (:gameId,:questionId,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: game.id, questionId: selected.question.id } })
    for (const [teamIndex, key] of ["blue", "red"].entries()) await database.query("INSERT INTO game_team_states (game_id, team_key, team_name, created_at, updated_at) VALUES (:gameId,:key,:name,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: game.id, key, name: teams[teamIndex].name } })
    for (let i = 0; i < configs.length; i++) await database.query("INSERT INTO game_round_configs (game_id, round_index, answer_count, multiplier, created_at, updated_at) VALUES (:gameId,:roundIndex,:answerCount,:multiplier,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: game.id, roundIndex: i, answerCount: configs[i].answerCount, multiplier: configs[i].multiplier } })
    for (const [index, answer] of selected.answers.entries()) await database.query("INSERT INTO game_runtime_answers (game_id, answer_index, answer_id, text, points, position, created_at, updated_at) VALUES (:gameId,:index,:answerId,:text,:points,:position,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)", { replacements: { gameId: game.id, index, answerId: answer.id, text: answer.text, points: answer.points, position: answer.position } })
    const room = { game, state, devices: new Map<string, Device>(), buzzerWinner: null }
    for (const team of teams) {
      const dbTeam = await Team.create({ gameId: game.id, color: team.id, name: team.name })
      await Player.bulkCreate(team.players.map((name, sortOrder) => ({ teamId: dbTeam.id, name, sortOrder })))
    }
    rooms.set(code, room)
    return res.status(201).json({
      code,
      hostToken,
      deviceToken: token(),
      mode: game.mode,
      state: publicState(state),
      question: {
        id: selected.question.id,
        prompt: selected.question.prompt,
        answers: selected.answers.map((a) => ({ text: a.text, points: a.points })),
      },
    })
  } catch (error) {
    return res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "room_creation_failed" })
  }
})
app.get("/api/questions/random", async (req, res) => {
  try {
    const selected = await questionFor(
      Math.min(10, Math.max(4, Number(req.query.answerCount ?? 10)))
    )
    return res.json({
      id: selected.question.id,
      prompt: selected.question.prompt,
      answers: selected.answers.map((a) => ({ text: a.text, points: a.points })),
    })
  } catch {
    return res.status(404).json({ error: "question_not_found" })
  }
})
app.get("/api/categories", async (_req, res) => {
  const categories = await database.query('SELECT categories.id, categories.name, categories.description, COUNT(questions.id) AS "questionCount" FROM categories LEFT JOIN questions ON questions.category_id = categories.id GROUP BY categories.id, categories.name, categories.description ORDER BY categories.id', { type: QueryTypes.SELECT })
  return res.json(categories)
})
app.get("/api/rooms/:code", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  return res.json(snapshot(room, auth(req, room.game)))
})
app.patch("/api/rooms/:code", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  if (!auth(req, room.game)) return res.status(403).json({ error: "host_required" })
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : room.game.name
  const mode = req.body?.mode
  if (!name) return res.status(400).json({ error: "game_name_required" })
  if (mode !== undefined && !["classic", "auto"].includes(mode))
    return res.status(400).json({ error: "invalid_mode" })
  room.game.name = name
  if (mode !== undefined) room.game.mode = mode
  await room.game.save()
  return res.json(snapshot(room, true))
})
app.get("/api/rooms/:code/state", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  return res.json(snapshot(room, auth(req, room.game)))
})
app.post("/api/rooms/:code/join", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  if (room.devices.size >= 4) return res.status(409).json({ error: "room_full" })
  const role = req.body?.role as Role
  if (!["display", "blue_button", "red_button", "host"].includes(role))
    return res.status(400).json({ error: "invalid_role" })
  if (role === "host" && !auth(req, room.game))
    return res.status(403).json({ error: "host_required" })
  if (role !== "host" && ![...room.devices.values()].some((device) => device.controller))
    return res.status(409).json({ error: "controller_not_connected" })
  if ([...room.devices.values()].some((device) => device.role === role))
    return res.status(409).json({ error: "role_taken" })
  const deviceToken = token()
  room.devices.set(deviceToken, {
    id: deviceToken,
    role,
    name:
      typeof req.body?.name === "string" && req.body.name.trim()
        ? req.body.name.trim()
        : "Dispositivo",
    deviceType: req.body?.deviceType ?? "desktop",
    controller: role === "host" && auth(req, room.game),
    connectedAt: Date.now(),
  })
  return res.json({ deviceToken, ...snapshot(room, role === "host") })
})
app.patch("/api/rooms/:code/teams", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  if (!auth(req, room.game)) return res.status(403).json({ error: "host_required" })
  const incoming = req.body?.teams as Array<{ name?: string; players?: string[] }>
  if (!Array.isArray(incoming) || incoming.length !== 2 || incoming.some((t) => !t.players?.length))
    return res.status(400).json({ error: "two_teams_with_players_required" })
  const state = room.state as GameState
  state.teams = [
    { id: "blue", name: incoming[0].name ?? "Equipo Azul", players: incoming[0].players! },
    { id: "red", name: incoming[1].name ?? "Equipo Rojo", players: incoming[1].players! },
  ]
  await persist(room, state)
  return res.json(snapshot(room, true))
})
app.patch("/api/rooms/:code/rounds", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  if (!auth(req, room.game)) return res.status(403).json({ error: "host_required" })
  const rounds = req.body?.rounds as RoundConfig[]
  const errors = validateRoundConfigs(rounds ?? [])
  if (errors.length) return res.status(400).json({ error: errors.join(" ") })
  const state = room.state as GameState
  state.roundConfigs = rounds
  await persist(room, state)
  return res.json(snapshot(room, true))
})
app.post("/api/rooms/:code/actions", async (req, res) => {
  const room = await loadRoom(req.params.code)
  if (!room) return res.status(404).json({ error: "room_not_found" })
  if (!auth(req, room.game)) return res.status(403).json({ error: "host_required" })
  try {
    await applyAction(room, req.body?.action)
    return res.json(snapshot(room, true))
  } catch (error) {
    return res
      .status(409)
      .json({ error: error instanceof Error ? error.message : "invalid_action" })
  }
})

async function applyAction(
  room: Room,
  input: {
    type?: string
    team?: TeamId
    index?: number
    winner?: TeamId | "play" | "pass"
    answerIndex?: number
    answerText?: string
    source?: "manual" | "timer"
  }
) {
  const state = room.state as StoredState
  if (!state.teamIds) {
    const teamIds = {} as Record<TeamId, number>
    const playerIds = {} as Record<TeamId, number[]>
    for (const team of state.teams) {
      const row = await Team.create({ gameId: room.game.id, name: team.name, color: team.id })
      teamIds[team.id] = row.id
      const players = await Promise.all(
        team.players.map((name, sortOrder) => Player.create({ teamId: row.id, name, sortOrder }))
      )
      playerIds[team.id] = players.map((player) => player.id)
    }
    state.teamIds = teamIds
    state.playerIds = playerIds
    await persist(room, state)
  }
  if (input.type === "start") {
    if (state.phase !== "lobby") throw new Error("game_already_started")
    const roles = [...room.devices.values()].map((device) => device.role)
    const roleSet = new Set(roles)
    const validCombination =
      (roles.length === 1 && roleSet.has("host")) ||
      (roles.length === 2 && roleSet.size === 2 && roleSet.has("host") && roleSet.has("display")) ||
      (roles.length === 4 &&
        roleSet.size === 4 &&
        (["host", "display", "blue_button", "red_button"] as Role[]).every((role) =>
          roleSet.has(role)
        ))
    if (!validCombination) {
      throw new Error(
        roles.length === 3
          ? "Para iniciar necesitas 1, 2 o 4 dispositivos. Con 3 dispositivos no se puede comenzar."
          : "La sala debe tener Presentador; con 2 dispositivos agrega Pantalla pública, o completa los 4 roles."
      )
    }
    room.buzzerWinner = null
    state.revealed = []
    state.strikes = { blue: 0, red: 0 }
    state.pot = 0
    state.control = null
    state.faceoff = undefined
    state.stealTeam = null
    state.phase = "faceoff"
    prepareFaceoff(state)
    return persist(room, state)
  }
  if (input.type === "pause") {
    room.buzzerWinner = null
    state.phase = "lobby"
    state.revealed = []
    state.strikes = { blue: 0, red: 0 }
    state.pot = 0
    state.control = null
    state.faceoff = undefined
    state.stealTeam = null
    return persist(room, state)
  }
  if (input.type === "end") {
    if (room.autoTimer) clearTimeout(room.autoTimer)
    state.phase = "final"
    state.control = null
    return persist(room, state)
  }
  if (input.type === "cancel_faceoff") {
    if (!["faceoff", "tiebreaker", "decision"].includes(state.phase))
      throw new Error("faceoff_not_active")
    const { bluePlayer, redPlayer } = state.faceoff ?? {}
    room.buzzerWinner = null
    state.faceoff = { bluePlayer, redPlayer }
    state.control = null
    state.phase = "faceoff"
    return persist(room, state)
  }
  if (input.type === "faceoff_answer" && input.team && Number.isInteger(input.index)) {
    const index = input.index as number
    if (!["faceoff", "tiebreaker"].includes(state.phase)) throw new Error("faceoff_not_active")
    const attempt = state.faceoff
    if (!attempt || attempt.firstTeam === undefined) {
      state.faceoff = {
        ...attempt,
        firstTeam: input.team,
        activeTeam: input.team,
        firstIndex: index,
      }
      if (index === 0) {
        state.control = input.team
        state.phase = "decision"
      }
      return persist(room, state)
    }
    if (attempt.firstTeam === input.team) throw new Error("same_team_cannot_answer_twice")
    if (attempt.firstIndex === undefined) throw new Error("faceoff_not_active")
    state.faceoff = { ...attempt, secondTeam: input.team, secondIndex: index }
    const first = state.answers[attempt.firstIndex]
    const second = state.answers[index]
    state.control = first.position < second.position ? attempt.firstTeam! : input.team
    state.phase = "decision"
    return persist(room, state)
  }
  if (input.type === "decision" && input.team && ["play", "pass"].includes(String(input.winner))) {
    if (state.phase !== "decision" || state.control !== input.team)
      throw new Error("decision_not_active")
    if (input.winner === "pass") state.control = otherTeam(input.team)
    state.faceoffStrikes = { blue: 0, red: 0 }
    state.faceoffStrikeTeam = undefined
    state.phase = "turn"
    state.strikes = { blue: 0, red: 0 }
    return persist(room, state)
  }
  if (input.type === "reveal_answer" && Number.isInteger(input.index)) {
    const answer = state.answers[input.index!]
    if (!answer) throw new Error("answer_not_found")
    if (state.revealed.includes(input.index!)) throw new Error("answer_already_revealed")
    const faceoffMode = ["faceoff", "decision", "tiebreaker"].includes(state.phase)
    if ((!faceoffMode && state.phase !== "turn") || (!faceoffMode && !state.control))
      throw new Error("turn_not_active")
    const team = faceoffMode
      ? (state.faceoff?.activeTeam ?? state.faceoff?.firstTeam)
      : state.control
    if (!team) throw new Error("turn_not_active")
    const next = revealAnswer(state, answer, input.index!)
    await QuestionResponse.create({
      questionId: state.questionId,
      answerId: state.answerIds[input.index!],
      gameId: room.game.id,
      teamId: state.teamIds?.[team] ?? null,
      playerId: state.playerIds?.[team]?.[state.turnIndex[team]] ?? null,
      submittedText: answer.text,
      isValid: true,
      awardedPoints: answer.points,
    })
    if (faceoffMode) {
      const attempt = state.faceoff ?? {}
      const firstTeam = attempt.firstTeam ?? team
      const firstIndex = attempt.firstIndex

      if (state.faceoffStrikeTeam && team !== state.faceoffStrikeTeam) {
        next.control = team
        next.phase = "turn"
        next.turnIndex = advancePlayer(next, team).turnIndex
        next.faceoffStrikes = { blue: 0, red: 0 }
        next.faceoffStrikeTeam = undefined
        next.faceoff = undefined
        return persist(room, next)
      }

      if (firstIndex === undefined) {
        next.faceoff = {
          ...attempt,
          firstTeam: team,
          firstIndex: input.index!,
          activeTeam: otherTeam(team),
        }
        if (answer.position === 1) {
          next.control = team
          next.phase = "turn"
          next.turnIndex = advancePlayer(next, team).turnIndex
          next.faceoffStrikes = { blue: 0, red: 0 }
          next.faceoff = undefined
        }
        return persist(room, next)
      }

      const first = state.answers[firstIndex]
      const winner = answer.points > first.points ? team : firstTeam
      next.control = winner
      next.phase = "turn"
      next.turnIndex = advancePlayer(next, winner).turnIndex
      next.faceoffStrikes = { blue: 0, red: 0 }
      next.faceoffStrikeTeam = undefined
      next.faceoff = undefined
      return persist(room, next)
    }
    if (next.phase === "turn") next.turnIndex = advancePlayer(next, team).turnIndex
    return persist(room, next)
  }
  if (input.type === "strike" && input.team) {
    if (!["faceoff", "decision", "tiebreaker", "turn"].includes(state.phase))
      throw new Error("strike_not_active")
    await GameStrike.create({
      gameId: room.game.id,
      questionId: state.questionId,
      teamId: state.teamIds?.[input.team] ?? null,
      playerId: state.playerIds?.[input.team]?.[state.turnIndex[input.team]] ?? null,
      roundIndex: state.roundIndex,
      phase: state.phase === "turn" ? "turn" : "faceoff",
      source: input.source === "timer" ? "timer" : "manual",
    })
    if (state.phase !== "turn") {
      if (state.faceoffStrikeTeam && state.faceoffStrikeTeam !== input.team) {
        state.faceoffStrikeTeam = undefined
        state.faceoff = {
          ...(state.faceoff ?? {}),
          activeTeam: otherTeam(input.team),
          firstIndex: undefined,
        }
        return persist(room, state)
      }
      state.faceoffStrikes = {
        ...(state.faceoffStrikes ?? { blue: 0, red: 0 }),
        [input.team]: Math.min(5, (state.faceoffStrikes?.[input.team] ?? 0) + 1),
      }
      state.faceoffStrikeTeam = input.team
      state.faceoff = {
        ...(state.faceoff ?? {}),
        activeTeam: otherTeam(input.team),
      }
      return persist(room, state)
    }
    const next = registerStrike(state, input.team)
    if (next.phase !== "steal") next.turnIndex = advancePlayer(next, input.team).turnIndex
    return persist(room, next)
  }
  if (
    input.type === "steal_answer" &&
    (Number.isInteger(input.answerIndex) || typeof input.answerText === "string")
  ) {
    if (state.phase !== "steal" || !state.stealTeam || !state.control)
      throw new Error("steal_not_active")
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
    const submittedText = String(input.answerText ?? "").trim()
    const answerIndex = Number.isInteger(input.answerIndex)
      ? input.answerIndex!
      : state.answers.findIndex((answer) => normalize(answer.text) === normalize(submittedText))
    const answer = state.answers[answerIndex]
    if (!answer) throw new Error("answer_not_found")
    const valid =
      !state.revealed.includes(answerIndex) &&
      (!input.answerText || normalize(answer.text) === normalize(input.answerText))
    const winner = valid ? state.stealTeam : state.control
    await QuestionResponse.create({
      questionId: state.questionId,
      answerId: state.answerIds[answerIndex],
      gameId: room.game.id,
      teamId: state.teamIds?.[state.stealTeam] ?? null,
      playerId: state.playerIds?.[state.stealTeam]?.[state.turnIndex[state.stealTeam]] ?? null,
      submittedText: submittedText || answer.text,
      isValid: valid,
      awardedPoints: valid ? state.pot : 0,
    })
    return persist(room, finishRound(state, winner))
  }
  if (input.type === "finish_round" && (input.winner === "blue" || input.winner === "red")) {
    if (!["round_result", "steal"].includes(state.phase)) throw new Error("round_not_finished")
    return persist(room, finishRound(state, input.winner))
  }
  if (input.type === "next_round") {
    if (state.phase !== "round_result" && state.phase !== "tiebreaker")
      throw new Error("next_round_not_available")
    if (state.phase === "tiebreaker") {
      const tie = startTiebreaker(state)
      state.phase = tie.phase
      state.roundIndex = tie.roundIndex
      state.roundConfigs = tie.roundConfigs
    } else {
      state.roundIndex += 1
    }
    const config = state.roundConfigs[state.roundIndex]
    if (!config) {
      state.phase = "final"
      return persist(room, state)
    }
    const selected = await questionFor(config.answerCount, room.game.id)
    state.questionId = selected.question.id
    state.questionPrompt = selected.question.prompt
    state.answerIds = selected.answers.map((a) => a.id)
    state.answers = selected.answers.map((a) => ({
      text: a.text,
      points: a.points,
      position: a.position,
    }))
    state.revealed = []
    state.strikes = { blue: 0, red: 0 }
    state.pot = 0
    state.control = null
    state.faceoff = undefined
    state.stealTeam = null
    state.phase = "faceoff"
    prepareFaceoff(state)
    return persist(room, state)
  }
  throw new Error("unsupported_action")
}
function scheduleAuto(room: Room) {
  if (room.game.mode !== "auto") return
  if (room.autoTimer) clearTimeout(room.autoTimer)
  room.autoTimer = setTimeout(async () => {
    const state = room.state as StoredState
    try {
      if (state.phase === "faceoff") {
        await applyAction(room, { type: "faceoff_answer", team: "blue", index: 0 })
      } else if (state.phase === "decision") {
        await applyAction(room, { type: "decision", team: state.control ?? "blue", winner: "play" })
      } else if (state.phase === "turn") {
        const index = state.answers.findIndex((_, candidate) => !state.revealed.includes(candidate))
        if (index >= 0) await applyAction(room, { type: "reveal_answer", index })
      } else if (state.phase === "round_result") {
        await applyAction(room, { type: "finish_round", winner: state.control ?? "blue" })
        if (room.state.phase === "round_result")
          await applyAction(room, { type: "next_round" })
      }
      emitState(io, room)
      scheduleAuto(room)
    } catch (error) {
      console.error("auto_game_error", error)
    }
  }, 2000)
}

const server = createServer(app)
const io = new Server(server, { cors: { origin: allowedOrigins } })
io.on("connection", (socket) => {
  socket.on(
    "room:join",
    async (payload: {
      code: string
      role: Role
      name?: string
      deviceType?: string
      deviceToken?: string
      hostToken?: string
    }) => {
      const room = await loadRoom(payload.code)
      if (!room) return socket.emit("game:error", { error: "room_not_found" })
      const id = payload.deviceToken ?? socket.id
      const existing = room.devices.get(id)
      const name = payload.name?.trim() || "Dispositivo"
      const controller = existing?.controller || payload.hostToken === room.game.hostToken
      if (
        payload.role !== "host" &&
        !controller &&
        ![...room.devices.values()].some((device) => device.controller || device.role === "host")
      )
        return socket.emit("game:error", { error: "controller_not_connected" })
      const occupant =
        payload.role !== "pending"
          ? [...room.devices.values()].find(
              (device) => device.role === payload.role && device.id !== id
            )
          : undefined
      if (occupant && payload.hostToken !== room.game.hostToken)
        return socket.emit("game:error", { error: "role_taken" })
      if (occupant) {
        occupant.role = "pending"
        if (occupant.socketId) {
          io.sockets.sockets.get(occupant.socketId)?.emit("device:role-replaced", {
            message: "El dispositivo principal reasignó tu rol. Selecciona otro para continuar.",
          })
        }
      }
      if (!room.devices.has(id) && room.devices.size >= 4)
        return socket.emit("game:error", { error: "room_full" })
      room.devices.set(id, {
        id,
        role: payload.role,
        name,
        deviceType: payload.deviceType ?? "desktop",
        connectedAt: Date.now(),
        socketId: socket.id,
        controller,
      })
      socket.data.room = room.game.code
      socket.data.role = payload.role
      socket.data.deviceId = id
      socket.join(room.game.code)
      socket.emit("room:snapshot", snapshot(room, payload.role === "host"))
      io.to(room.game.code).emit("room:presence", { devices: [...room.devices.values()] })
    }
  )
  socket.on(
    "game:action",
    async (payload: {
      code: string
      hostToken?: string
      action: {
        type: string
        team?: TeamId
        index?: number
        winner?: TeamId | "play" | "pass"
        answerIndex?: number
        answerText?: string
      }
    }) => {
      const room = await loadRoom(payload.code)
      const socketRole = socket.data.role as Role | undefined
      if (!room || (payload.hostToken !== room.game.hostToken && socketRole !== "host"))
        return socket.emit("game:error", { error: "host_required" })
      try {
        const actionPhase = room.state.phase
        await applyAction(room, payload.action)
        if (payload.action.type === "strike" && payload.action.team) {
          const updatedState = room.state
          const count =
            actionPhase === "turn"
              ? updatedState.strikes[payload.action.team]
              : (updatedState.faceoffStrikes?.[payload.action.team] ?? 1)
          io.to(room.game.code).emit("game:strike", { count, team: payload.action.team })
        }
        if (payload.action.type === "reveal_answer")
          io.to(room.game.code).emit("game:answer-revealed", { index: payload.action.index })
        emitState(io, room)
        scheduleAuto(room)
      } catch (error) {
        socket.emit("game:error", {
          error: error instanceof Error ? error.message : "invalid_action",
        })
      }
    }
  )
  socket.on("buzzer:press", async (payload: { code: string; team: TeamId }) => {
    const room = await loadRoom(payload.code)
    if (!room || room.buzzerWinner)
      return room && socket.emit("buzzer:locked", { winner: room.buzzerWinner })
    room.buzzerWinner = payload.team
    const state = room.state as StoredState
    if (["faceoff", "tiebreaker"].includes(state.phase))
      state.faceoff = {
        ...(state.faceoff ?? {}),
        bluePlayer: state.faceoff?.bluePlayer ?? currentPlayer(state, "blue"),
        redPlayer: state.faceoff?.redPlayer ?? currentPlayer(state, "red"),
        firstTeam: payload.team,
        activeTeam: payload.team,
      }
    await persist(room, state)
    io.to(room.game.code).emit("buzzer:winner", { winner: payload.team })
    emitState(io, room)
  })
  socket.on("buzzer:reset", (payload: { code: string }) => {
    const room = rooms.get(payload.code.toUpperCase())
    if (room) {
      room.buzzerWinner = null
      io.to(room.game.code).emit("buzzer:reset")
    }
  })
  socket.on("disconnect", () => {
    const room = rooms.get(socket.data.room as string)
    const id = socket.data.deviceId as string | undefined
    if (!room || !id) return
    setTimeout(() => {
      if (room.devices.get(id)?.socketId !== socket.id) return
      room.devices.delete(id)
      io.to(room.game.code).emit("room:presence", { devices: [...room.devices.values()] })
    }, 350)
  })
})
database.authenticate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
if (!process.env.VERCEL)
  server.listen(Number(process.env.PORT ?? 3010), () =>
    console.log(`People Says API en http://localhost:${process.env.PORT ?? 3010}`)
  )
export { app, io, server }
export default app
