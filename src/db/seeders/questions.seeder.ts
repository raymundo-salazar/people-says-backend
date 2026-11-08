import { Question, database } from '../../models/index.js';

const subjects = ['salir de casa','una fiesta','la escuela','el trabajo','un viaje','la cocina','un domingo','una primera cita','una reunión familiar','un día de lluvia','la playa','un cumpleaños','un supermercado','una mudanza','un partido','una noche de películas','una mañana ocupada','una visita inesperada','una carretera','un restaurante','un concierto','un campamento','una oficina','un hotel','una celebración'];
const templates = ['Menciona algo que la gente suele olvidar en %s.','Menciona algo que siempre encuentras en %s.','Menciona algo que hace feliz a la mayoría en %s.','Menciona algo que puede arruinar %s.','Menciona algo que las personas llevan consigo en %s.','Menciona una razón común para llegar tarde a %s.','Menciona algo que la gente hace mientras espera en %s.','Menciona algo que nunca falta cuando llega %s.','Menciona algo que las personas compran para %s.','Menciona algo que todos quieren evitar durante %s.'];
const contexts = ['una encuesta entre amigos','una encuesta familiar','una encuesta escolar','una encuesta de oficina','una encuesta de vecinos','una encuesta latinoamericana','una encuesta de viajeros','una encuesta de jóvenes','una encuesta de adultos','una encuesta de aficionados','una encuesta de parejas','una encuesta de padres','una encuesta de estudiantes','una encuesta de compañeros','una encuesta de clientes','una encuesta de invitados','una encuesta de equipos','una encuesta de familias','una encuesta de lectores','una encuesta de espectadores'];

export async function seedQuestions() {
  const existing = await Question.count();
  if (existing >= 5000) return existing;
  const rows: Array<{prompt:string;region:string;answersCount:number}> = [];
  for (let i=existing; i<5000; i += 1) {
    const subject = subjects[Math.floor(i / 200) % subjects.length];
    const template = templates[Math.floor(i / 20) % templates.length];
    const context = contexts[i % contexts.length];
    rows.push({ prompt:`${template.replace('%s', subject)} (${context})`, region:'latam', answersCount:4 + (i % 7) });
  }
  for (let i=0; i<rows.length; i += 500) await Question.bulkCreate(rows.slice(i, i + 500));
  return await Question.count();
}

if (process.argv[1]?.endsWith('questions.seeder.ts')) { await database.authenticate(); console.log(`Preguntas cargadas: ${await seedQuestions()}`); await database.close(); }
