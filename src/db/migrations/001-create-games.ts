import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
export async function up(query: QueryInterface) { await query.createTable('games', { id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, code:{type:DataTypes.STRING(8),allowNull:false,unique:true}, name:{type:DataTypes.STRING(120)}, mode:{type:DataTypes.STRING(32),allowNull:false}, state:{type:DataTypes.JSON,allowNull:false}, created_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW} }); }
export async function down(query: QueryInterface) { await query.dropTable('games'); }
