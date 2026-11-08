import { DataTypes, Model, type Sequelize } from 'sequelize';
import type { PlayerAttributes, PlayerCreationAttributes } from './types.js';
export class Player extends Model<PlayerAttributes, PlayerCreationAttributes> implements PlayerAttributes { declare id:number; declare teamId:number; declare name:string; declare sortOrder:number; declare createdAt:Date; declare updatedAt:Date; public static associate():void {} }
export function initializePlayer(sequelize:Sequelize) { Player.init({ id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, teamId:{type:DataTypes.INTEGER,allowNull:false}, name:{type:DataTypes.STRING(120),allowNull:false}, sortOrder:{type:DataTypes.INTEGER,allowNull:false} }, {sequelize,tableName:'players',underscored:true}); }
