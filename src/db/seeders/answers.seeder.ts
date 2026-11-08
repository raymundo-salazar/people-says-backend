import { Answer, Question, database } from '../../models/index.js';

const answerBank = ['Llaves','Celular','Cartera','Agua','Comida','Música','Dinero','Ropa cómoda','Una sonrisa','Una foto'];
const scoreSets: Record<number,number[]> = { 4:[40,30,20,10], 5:[38,27,18,10,7], 6:[32,24,17,12,8,7], 7:[28,21,16,12,9,8,6], 8:[25,20,15,12,10,7,6,5], 9:[22,18,14,12,10,8,7,5,4], 10:[20,17,14,12,10,8,7,5,4,3] };

export async function seedAnswers() {
  if (await Answer.count() > 0) return await Answer.count();
  const questions = await Question.findAll({ order:[['id','ASC']], limit:5000 });
  const rows: Array<{questionId:number;text:string;points:number;position:number}> = [];
  for (const question of questions) {
    const scores = scoreSets[question.answersCount] ?? scoreSets[10];
    for (let position=0; position<question.answersCount; position += 1) rows.push({ questionId:question.id, text:answerBank[(position + question.id) % answerBank.length], points:scores[position], position:position + 1 });
  }
  for (let i=0; i<rows.length; i += 1000) await Answer.bulkCreate(rows.slice(i, i + 1000));
  return rows.length;
}

if (process.argv[1]?.endsWith('answers.seeder.ts')) { await database.authenticate(); console.log(`Respuestas cargadas: ${await seedAnswers()}`); await database.close(); }
