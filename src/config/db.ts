import 'dotenv/config'
import { Sequelize } from 'sequelize'

const dialect = (process.env.DATABASE_DIALECT || 'sqlite') as 'sqlite' | 'postgres'
const sequelize = dialect === 'sqlite'
  ? new Sequelize({ dialect, storage: process.env.DATABASE_STORAGE || './data/people-says.sqlite', logging: false })
  : new Sequelize(process.env.DATABASE_URL || '', { dialect, logging: false })

export default sequelize
