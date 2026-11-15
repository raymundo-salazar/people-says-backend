require('dotenv').config()

const configuredDialect = process.env.DATABASE_DIALECT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite')
const dialect = configuredDialect === 'postgresql' ? 'postgres' : configuredDialect
const connection = dialect === 'sqlite'
  ? {
      dialect,
      storage: process.env.DATABASE_STORAGE || './data/people-says.sqlite',
      logging: false,
      seederStorage: 'sequelize',
      seederStorageTableName: 'SequelizeData',
    }
  : {
      use_env_variable: 'DATABASE_URL',
      dialect,
      dialectOptions: {
        ssl: { require: true },
      },
      logging: false,
      seederStorage: 'sequelize',
      seederStorageTableName: 'SequelizeData',
    }

module.exports = { development: connection, test: connection, production: connection }
