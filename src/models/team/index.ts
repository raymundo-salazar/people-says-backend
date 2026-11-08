import { DataTypes, Model, type Sequelize } from 'sequelize';
import type { TeamAttributes, TeamCreationAttributes } from './types.js';
export class Team extends Model<TeamAttributes, TeamCreationAttributes> implements TeamAttributes { declare id:number; declare gameId:number|null; declare name:string; declare color:TeamAttributes['color']; declare createdAt:Date; declare updatedAt:Date; public static associate():void {} }
export function initializeTeam(sequelize:Sequelize) { Team.init({ id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, gameId:{type:DataTypes.INTEGER,allowNull:true}, name:{type:DataTypes.STRING(100),allowNull:false}, color:{type:DataTypes.STRING(12),allowNull:false} }, {sequelize,tableName:'teams',underscored:true}); }
