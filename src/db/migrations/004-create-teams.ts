import type { QueryInterface } from 'sequelize'; import { DataTypes } from 'sequelize';
export async function up(query:QueryInterface){await query.createTable('teams',{id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true},game_id:{type:DataTypes.INTEGER,allowNull:true,references:{model:'games',key:'id'},onDelete:'CASCADE'},name:{type:DataTypes.STRING(100),allowNull:false},color:{type:DataTypes.STRING(12),allowNull:false}})}
export async function down(query:QueryInterface){await query.dropTable('teams')}
