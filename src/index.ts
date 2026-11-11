import "dotenv/config"
import express, { type Request } from "express"
import cors from "cors"
import helmet from "helmet"
import { handle as i18nHandle } from "i18next-http-middleware"
import morgan from "morgan"
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"
import { Server } from "socket.io"
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
  state.faceoff = {
    bluePlayer: currentPlayer(state, "blue"),
    redPlayer: currentPlayer(state, "red"),
  }
}
const auth = (req: Request, game: Game) =>
  req.header("x-host-token") === game.hostToken ||
  req.body?.hostToken === game.hostToken ||
  req.query.hostToken === game.hostToken
const snapshot = (room: Room, privateView = false) => ({
  code: room.game.code,
  name: room.game.name,
  mode: room.game.mode,
  state: privateView ? room.game.state : publicState(room.game.state),
  devices: [...room.devices.values()],
})
async function loadRoom(code: string) {
  const normalized = code.toUpperCase()
  const cached = rooms.get(normalized)
  if (cached) return cached
  const game = await Game.findOne({ where: { code: normalized } })
  if (!game) return null
  const room = { game, devices: new Map<string, Device>(), buzzerWinner: null }
  rooms.set(normalized, room)
  return room
}
async function questionFor(count: number) {
  const question = await Question.findOne({
    where: { answersCount: count },
    order: [["id", "ASC"]],
  })
  if (!question) throw new Error("question_not_found")
  const answers = await Answer.findAll({
    where: { questionId: question.id },
    order: [["position", "ASC"]],
  })
  return { question, answers }
}
async function persist(room: Room, state: Record<string, unknown>) {
  room.game.state = state
  room.game.phase = typeof state.phase === "string" ? state.phase : "lobby"
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
    const selected = await questionFor(configs[0].answerCount)
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
      mode: ["classic", "stage", "buttons", "auto"].includes(req.body?.mode)
        ? req.body.mode
        : "classic",
      phase: state.phase,
      hostToken,
      state,
    })
    const room = { game, devices: new Map<string, Device>(), buzzerWinner: null }
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
  if (mode !== undefined && !["classic", "stage", "buttons", "auto"].includes(mode))
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
  const state = room.game.state as GameState
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
  const state = room.game.state as GameState
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
  const state = room.game.state as StoredState
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
      state.faceoff = { ...attempt, firstTeam: input.team, firstIndex: index }
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
    state.phase = "turn"
    state.strikes = { blue: 0, red: 0 }
    return persist(room, state)
  }
  if (input.type === "reveal_answer" && Number.isInteger(input.index)) {
    const answer = state.answers[input.index!]
    if (!answer) throw new Error("answer_not_found")
    if (state.phase !== "turn" || !state.control) throw new Error("turn_not_active")
    const team = state.control
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
    return persist(room, next)
  }
  if (input.type === "strike" && input.team) {
    await GameStrike.create({
      gameId: room.game.id,
      questionId: state.questionId,
      teamId: state.teamIds?.[input.team] ?? null,
      playerId: state.playerIds?.[input.team]?.[state.turnIndex[input.team]] ?? null,
      roundIndex: state.roundIndex,
      source: input.source === "timer" ? "timer" : "manual",
    })
    const next = registerStrike(state, input.team)
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
    const selected = await questionFor(config.answerCount)
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
    const state = room.game.state as StoredState
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
        if ((room.game.state as StoredState).phase === "round_result")
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
        await applyAction(room, payload.action)
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
    const state = room.game.state as StoredState
    if (["faceoff", "tiebreaker"].includes(state.phase)) state.faceoff = { firstTeam: payload.team }
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
