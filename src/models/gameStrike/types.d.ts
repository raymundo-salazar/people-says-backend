export interface GameStrikeAttributes {
  id: number
  gameId: number
  questionId: number
  teamId: number | null
  playerId: number | null
  roundIndex: number
  phase: "faceoff" | "turn" | "steal"
  source: "manual" | "timer"
  createdAt: Date
  updatedAt: Date
}
export type GameStrikeCreationAttributes = Omit<
  GameStrikeAttributes,
  "id" | "createdAt" | "updatedAt"
>
