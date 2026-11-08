# People Says — Backend

Backend independiente de People Says. La interfaz del juego conserva la marca visible `La gente dice` por ahora.

## Stack

Node.js, TypeScript, Express, Sequelize, Socket.IO, SQLite y PostgreSQL.

## Comandos

```bash
pnpm install
pnpm db:migrate
pnpm db:seed:questions
pnpm db:seed:answers
pnpm dev
```

Los seeders generan 5,000 preguntas y sus respuestas relacionadas. Cada pregunta tiene entre 4 y 10 respuestas. Las respuestas de jugadores se registran en `question_responses`, relacionadas con pregunta, respuesta, partida, equipo y jugador.
