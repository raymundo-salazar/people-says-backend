export interface GameAttributes {
  id: number
  code: string
  name: string | null
  mode: "classic" | "stage" | "buttons" | "auto"
  phase: string
  activeTeam: "blue" | "red" | null
  activePlayerId: number | null
  hostToken: string
  createdAt: Date
  updatedAt: Date
}
export interface GameCreationAttributes {
  code: string
  name?: string | null
  mode: "classic" | "stage" | "buttons" | "auto"
  phase?: string
  activeTeam?: "blue" | "red" | null
  activePlayerId?: number | null
  hostToken: string
}
