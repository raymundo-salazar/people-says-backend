import 'dotenv/config'
import * as pg from 'pg'
import { Sequelize } from 'sequelize'

const configuredDialect = process.env.DATABASE_DIALECT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite')
const dialect = (configuredDialect === 'postgresql' ? 'postgres' : configuredDialect) as 'sqlite' | 'postgres'
const sequelize = dialect === 'sqlite'
  ? new Sequelize({ dialect, storage: process.env.DATABASE_STORAGE || './data/people-says.sqlite', logging: false })
  : new Sequelize(process.env.DATABASE_URL || '', {
      dialect,
      dialectModule: pg,
      dialectOptions: {
        ssl: { require: true },
      },
      logging: false,
    })

export default sequelize
