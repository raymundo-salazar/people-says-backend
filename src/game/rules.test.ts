import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialState, finishRound, validateAnswers, validateRoundConfigs } from './rules.js';

test('valida que las respuestas sumen 100 y no repitan puntos', () => {
  assert.deepEqual(validateAnswers([{text:'A',points:40,position:1},{text:'B',points:30,position:2},{text:'C',points:20,position:3},{text:'D',points:10,position:4}]), []);
  assert.ok(validateAnswers([{text:'A',points:40,position:1},{text:'B',points:30,position:2},{text:'C',points:20,position:3},{text:'D',points:10,position:4},{text:'E',points:10,position:5}]).length > 0);
});
test('valida la progresión descendente de rondas', () => {
  assert.deepEqual(validateRoundConfigs([{answerCount:10,multiplier:1},{answerCount:8,multiplier:2}]), []);
  assert.ok(validateRoundConfigs([{answerCount:8,multiplier:1},{answerCount:10,multiplier:2}]).length > 0);
});
test('un empate al final regresa a enfrentamiento extraordinario', () => {
  const state = createInitialState([{answerCount:10,multiplier:1}], [{id:'blue',name:'Azul',players:['Ana']},{id:'red',name:'Rojo',players:['Luis']}]);
  assert.equal(finishRound({ ...state, pot:10 }, 'blue').phase, 'final');
});
