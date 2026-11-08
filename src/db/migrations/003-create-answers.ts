import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
export async function up(query: QueryInterface) { await query.createTable('answers', { id:{type:DataTypes.INTEGER,autoIncrement:true,primaryKey:true}, question_id:{type:DataTypes.INTEGER,allowNull:false,references:{model:'questions',key:'id'},onDelete:'CASCADE'}, text:{type:DataTypes.STRING(160),allowNull:false}, points:{type:DataTypes.INTEGER,allowNull:false}, position:{type:DataTypes.INTEGER,allowNull:false} }); }
export async function down(query: QueryInterface) { await query.dropTable('answers'); }
