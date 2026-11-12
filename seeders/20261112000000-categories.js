"use strict"
const categories = [
  ["Cultura mexicana", "Tradiciones, gastronomía, costumbres y celebraciones de México."],
  ["Cultura latinoamericana", "Tradiciones, comidas y experiencias compartidas en Latinoamérica."],
  ["Cultura general", "Historia, geografía, ciencia y conocimientos cotidianos."],
  ["Disney y Pixar", "Películas animadas, personajes e historias."],
  ["Películas y series", "Cine, televisión, personajes y producciones populares."],
  ["Animales y naturaleza", "Animales, hábitats y curiosidades naturales."],
  ["Vida cotidiana", "Familia, hogar, escuela, trabajo y situaciones comunes."],
  ["Deportes", "Disciplinas, equipos, atletas y competencias."],
]
module.exports = { async up(q) { await q.bulkInsert("categories", categories.map(([name, description]) => ({ name, description, created_at: new Date(), updated_at: new Date() }))) }, async down(q) { await q.bulkDelete("categories", { name: categories.map(([name]) => name) }) } }
