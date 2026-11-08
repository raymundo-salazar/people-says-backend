import type { QueryInterface } from 'sequelize'; import { DataTypes } from 'sequelize';
export async function up(query:QueryInterface){await query.createTable('players',{id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},team_id:{type:DataTypes.INTEGER,allowNull:false,references:{model:'teams',key:'id'},onDelete:'CASCADE'},name:{type:DataTypes.STRING(120),allowNull:false},sort_order:{type:DataTypes.INTEGER,allowNull:false}})}
export async function down(query:QueryInterface){await query.dropTable('players')}
