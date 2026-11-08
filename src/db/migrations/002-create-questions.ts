import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
export async function up(query: QueryInterface) { await query.createTable('questions', { id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, prompt:{type:DataTypes.STRING(280),allowNull:false}, region:{type:DataTypes.STRING(40),allowNull:false}, answers_count:{type:DataTypes.INTEGER,allowNull:false} }); }
export async function down(query: QueryInterface) { await query.dropTable('questions'); }
