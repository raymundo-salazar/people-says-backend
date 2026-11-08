import 'dotenv/config';
import { database } from '../models/index.js';
import { up as createGames } from './migrations/001-create-games.js';
import { up as createQuestions } from './migrations/002-create-questions.js';
import { up as createAnswers } from './migrations/003-create-answers.js';
import { up as createTeams } from './migrations/004-create-teams.js';
import { up as createPlayers } from './migrations/005-create-players.js';
import { up as createQuestionResponses } from './migrations/006-create-question-responses.js';
const query = database.getQueryInterface();
for (const migration of [createGames, createQuestions, createAnswers, createTeams, createPlayers, createQuestionResponses]) { try { await migration(query); } catch (error) { if (!String(error).includes('already exists')) throw error; } }
await database.close(); console.log('Migraciones aplicadas');
