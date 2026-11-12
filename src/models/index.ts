import { Sequelize } from "sequelize"
import sequelize from "../config/db.js"
import { Game, initializeGame } from "./game/index.js"
import { Question, initializeQuestion } from "./question/index.js"
import { Answer, initializeAnswer } from "./answer/index.js"
import { Team, initializeTeam } from "./team/index.js"
import { Player, initializePlayer } from "./player/index.js"
import { QuestionResponse, initializeQuestionResponse } from "./questionResponse/index.js"
import { GameStrike, initializeGameStrike } from "./gameStrike/index.js"
import { Category, initializeCategory } from "./category/index.js"

export const database = sequelize
initializeGame(database)
initializeQuestion(database)
initializeAnswer(database)
initializeTeam(database)
initializePlayer(database)
initializeQuestionResponse(database)
initializeGameStrike(database)
initializeCategory(database)
Question.hasMany(Answer, { foreignKey: "questionId", as: "answers" })
Answer.belongsTo(Question, { foreignKey: "questionId", as: "question" })
Question.belongsTo(Category, { foreignKey: "categoryId", as: "category" })
Category.hasMany(Question, { foreignKey: "categoryId", as: "questions" })
Question.hasMany(QuestionResponse, { foreignKey: "questionId", as: "responses" })
QuestionResponse.belongsTo(Question, { foreignKey: "questionId", as: "question" })
Answer.hasMany(QuestionResponse, { foreignKey: "answerId", as: "responses" })
QuestionResponse.belongsTo(Answer, { foreignKey: "answerId", as: "answer" })
Team.hasMany(Player, { foreignKey: "teamId", as: "players" })
Player.belongsTo(Team, { foreignKey: "teamId", as: "team" })
export { Game, Question, Answer, Team, Player, QuestionResponse }
export { GameStrike }
export { Category }
