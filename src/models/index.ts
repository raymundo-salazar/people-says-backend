import { Sequelize } from 'sequelize';
import { Game, initializeGame } from './game/index.js';
import { Question, initializeQuestion } from './question/index.js';
import { Answer, initializeAnswer } from './answer/index.js';
import { Team, initializeTeam } from './team/index.js';
import { Player, initializePlayer } from './player/index.js';
import { QuestionResponse, initializeQuestionResponse } from './questionResponse/index.js';

export const database = (process.env.DATABASE_DIALECT ?? 'sqlite') === 'sqlite'
  ? new Sequelize({ dialect:'sqlite', storage:process.env.DATABASE_STORAGE ?? './data/people-says.sqlite', logging:false })
  : new Sequelize(process.env.DATABASE_URL ?? '', { dialect:'postgres', logging:false });
initializeGame(database); initializeQuestion(database); initializeAnswer(database); initializeTeam(database); initializePlayer(database); initializeQuestionResponse(database);
Question.hasMany(Answer, { foreignKey:'questionId', as:'answers' }); Answer.belongsTo(Question, { foreignKey:'questionId', as:'question' });
Question.hasMany(QuestionResponse, { foreignKey:'questionId', as:'responses' }); QuestionResponse.belongsTo(Question, { foreignKey:'questionId', as:'question' });
Answer.hasMany(QuestionResponse, { foreignKey:'answerId', as:'responses' }); QuestionResponse.belongsTo(Answer, { foreignKey:'answerId', as:'answer' });
Team.hasMany(Player, { foreignKey:'teamId', as:'players' }); Player.belongsTo(Team, { foreignKey:'teamId', as:'team' });
export { Game, Question, Answer, Team, Player, QuestionResponse };
