import 'dotenv/config';
import { database } from '../models/index.js';
import { seedQuestions } from './seeders/questions.seeder.js';
import { seedAnswers } from './seeders/answers.seeder.js';

await database.authenticate();
console.log(`Preguntas: ${await seedQuestions()}`);
console.log(`Respuestas: ${await seedAnswers()}`);
await database.close();
