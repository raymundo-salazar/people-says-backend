# People Says Backend

- Node.js 24+, pnpm, TypeScript, Express, Sequelize y Socket.IO.
- SQLite es desarrollo; PostgreSQL es producción.
- Cada modelo vive en una carpeta singular con `index.ts` y `types.d.ts`.
- Cada migración y seeder debe tener una responsabilidad única.
- Cada migración debe crear o modificar una sola tabla. Si un cambio requiere varias tablas, debe dividirse en migraciones independientes y ordenadas.
- Los archivos y carpetas cuyo nombre comience con `_` son archivos auxiliares/locales y deben ignorarse; no deben incorporarse al código ni a los commits.
- Los nombres programáticos usan `people-says`; la marca visible puede seguir siendo `La gente dice`.
