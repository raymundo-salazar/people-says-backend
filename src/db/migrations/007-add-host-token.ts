import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';
export async function up(query: QueryInterface) {
  await query.addColumn('games', 'host_token', { type: DataTypes.STRING(80), allowNull: true });
  await query.addIndex('games', ['host_token'], { unique: true, name: 'games_host_token_unique' });
}
export async function down(query: QueryInterface) { await query.removeIndex('games', 'games_host_token_unique'); await query.removeColumn('games', 'host_token'); }
