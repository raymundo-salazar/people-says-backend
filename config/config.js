require('dotenv').config()

const connection = {
  username: process.env.DB_USER || undefined,
  password: process.env.DB_PASSWORD || undefined,
  database: process.env.DB_NAME || 'people_says',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || (process.env.DATABASE_DIALECT === 'postgres' ? 5432 : 0)),
  dialect: process.env.DATABASE_DIALECT || 'sqlite',
  storage: process.env.DATABASE_STORAGE || './data/people-says.sqlite',
  logging: false,
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
}

if (connection.dialect === 'sqlite') delete connection.port
module.exports = { development: connection, test: connection, production: connection }
