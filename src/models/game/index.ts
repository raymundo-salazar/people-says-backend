import { DataTypes, Model, type Sequelize } from "sequelize"
import type { GameAttributes, GameCreationAttributes } from "./types.js"
export class Game extends Model<GameAttributes, GameCreationAttributes> implements GameAttributes {
  declare id: number
  declare code: string
  declare name: string | null
  declare mode: GameAttributes["mode"]
  declare phase: string
  declare activeTeam: "blue" | "red" | null
  declare hostToken: string
  declare state: Record<string, unknown>
  declare createdAt: Date
  declare updatedAt: Date
  public static associate(): void {}
}
export function initializeGame(sequelize: Sequelize) {
  Game.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: DataTypes.STRING(8), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(120) },
      mode: { type: DataTypes.STRING(32), allowNull: false },
      phase: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "lobby" },
      activeTeam: { type: DataTypes.STRING(8), allowNull: true, field: "active_team" },
      hostToken: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
        field: "host_token",
      },
      state: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, field: "created_at" },
      updatedAt: { type: DataTypes.DATE, field: "updated_at" },
    },
    { sequelize, tableName: "games", underscored: true }
  )
}
