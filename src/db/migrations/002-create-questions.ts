import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
export async function up(query: QueryInterface) { await query.createTable('questions', { id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, prompt:{type:DataTypes.STRING(280),allowNull:false,unique:true}, region:{type:DataTypes.STRING(40),allowNull:false}, answers_count:{type:DataTypes.INTEGER,allowNull:false}, created_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW}, updated_at:{type:DataTypes.DATE,allowNull:false,defaultValue:DataTypes.NOW} }); }
export async function down(query: QueryInterface) { await query.dropTable('questions'); }
