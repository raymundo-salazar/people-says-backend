import { DataTypes, Model, type Sequelize } from "sequelize"
import type { CategoryAttributes, CategoryCreationAttributes } from "./types.js"
export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  declare id: number
  declare name: string
  declare description: string
  declare createdAt: Date
  declare updatedAt: Date
}
export function initializeCategory(sequelize: Sequelize) { Category.init({ id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, name: { type: DataTypes.STRING(100), allowNull: false, unique: true }, description: { type: DataTypes.STRING(280), allowNull: false }, createdAt: { type: DataTypes.DATE, field: "created_at" }, updatedAt: { type: DataTypes.DATE, field: "updated_at" } }, { sequelize, tableName: "categories", underscored: true }) }
