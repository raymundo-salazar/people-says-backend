# People Says — Backend

Backend independiente de People Says. La interfaz del juego conserva la marca visible `La gente dice` por ahora.

## Stack

Node.js, TypeScript, Express, Sequelize, Socket.IO, SQLite y PostgreSQL.

## Comandos

```bash
pnpm install
pnpm db:status
pnpm db:migrate
pnpm db:seed:all
pnpm dev
```

Las migraciones y seeders son administrados por `sequelize-cli`. Sus archivos viven en `migrations/` y `seeders/`, configurados mediante `.sequelizerc`. Los seeders se registran en la tabla `SequelizeData` mediante `seederStorage: "sequelize"`, por lo que `pnpm db:seed:all` sólo ejecuta los seeders que todavía no estén registrados. Para inicializar una base nueva se puede ejecutar `pnpm db:init`; para revertirla, `pnpm db:revert`.

Los seeders generan 5,000 preguntas y sus respuestas relacionadas. Cada pregunta tiene entre 4 y 10 respuestas. Las respuestas de jugadores se registran en `question_responses`, relacionadas con pregunta, respuesta, partida, equipo y jugador.
