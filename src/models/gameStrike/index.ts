import { DataTypes, Model, type Sequelize } from "sequelize"
import type { GameStrikeAttributes, GameStrikeCreationAttributes } from "./types.js"

export class GameStrike
  extends Model<GameStrikeAttributes, GameStrikeCreationAttributes>
  implements GameStrikeAttributes
{
  declare id: number
  declare gameId: number
  declare questionId: number
  declare teamId: number | null
  declare playerId: number | null
  declare roundIndex: number
  declare phase: "faceoff" | "turn"
  declare source: "manual" | "timer"
  declare createdAt: Date
  declare updatedAt: Date
}

export function initializeGameStrike(sequelize: Sequelize) {
  GameStrike.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      gameId: { type: DataTypes.INTEGER, allowNull: false, field: "game_id" },
      questionId: { type: DataTypes.INTEGER, allowNull: false, field: "question_id" },
      teamId: { type: DataTypes.INTEGER, allowNull: true, field: "team_id" },
      playerId: { type: DataTypes.INTEGER, allowNull: true, field: "player_id" },
      roundIndex: { type: DataTypes.INTEGER, allowNull: false, field: "round_index" },
      phase: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "turn" },
      source: { type: DataTypes.STRING(16), allowNull: false, defaultValue: "manual" },
      createdAt: { type: DataTypes.DATE, field: "created_at" },
      updatedAt: { type: DataTypes.DATE, field: "updated_at" },
    },
    { sequelize, tableName: "game_strikes", underscored: true }
  )
}
