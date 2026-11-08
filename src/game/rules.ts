export type TeamId = 'blue' | 'red';
export type GameMode = 'classic' | 'stage' | 'buttons' | 'auto';
export type RoundConfig = { answerCount: number; multiplier: 1|2|3 };
export type TeamConfig = { id: TeamId; name: string; players: string[] };
export type SurveyAnswer = { text: string; points: number; position: number };

export type GameState = {
  phase: 'lobby'|'faceoff'|'decision'|'turn'|'steal'|'round_result'|'final';
  roundIndex: number;
  roundConfigs: RoundConfig[];
  teams: [TeamConfig, TeamConfig];
  scores: Record<TeamId, number>;
  turnIndex: Record<TeamId, number>;
  control: TeamId|null;
  revealed: number[];
  strikes: Record<TeamId, number>;
  pot: number;
};

export function validateAnswers(answers: SurveyAnswer[], expectedCount?: number): string[] {
  const errors: string[] = [];
  if (expectedCount !== undefined && answers.length !== expectedCount) errors.push(`Se esperaban ${expectedCount} respuestas.`);
  if (!answers.length) errors.push('La pregunta debe tener respuestas.');
  if (answers.some(answer => !Number.isInteger(answer.points) || answer.points <= 0)) errors.push('Todos los puntos deben ser enteros positivos.');
  if (new Set(answers.map(answer => answer.points)).size !== answers.length) errors.push('Las puntuaciones no pueden repetirse.');
  if (answers.reduce((sum, answer) => sum + answer.points, 0) !== 100) errors.push('La suma de las respuestas debe ser exactamente 100.');
  return errors;
}

export function validateRoundConfigs(configs: RoundConfig[]): string[] {
  const errors: string[] = [];
  if (!configs.length) errors.push('Debe existir al menos una ronda.');
  configs.forEach((config, index) => {
    if (!Number.isInteger(config.answerCount) || config.answerCount < 1) errors.push(`La ronda ${index + 1} debe tener respuestas válidas.`);
    if (![1, 2, 3].includes(config.multiplier)) errors.push(`La ronda ${index + 1} tiene un multiplicador inválido.`);
    if (index > 0 && config.answerCount >= configs[index - 1].answerCount) errors.push('Cada ronda debe tener menos respuestas que la anterior.');
  });
  return errors;
}

export function createInitialState(roundConfigs: RoundConfig[], teams: [TeamConfig, TeamConfig]): GameState {
  const errors = validateRoundConfigs(roundConfigs);
  if (errors.length) throw new Error(errors.join(' '));
  if (teams.some(team => !team.players.length)) throw new Error('Cada equipo necesita al menos un participante.');
  return { phase:'lobby', roundIndex:0, roundConfigs, teams, scores:{blue:0,red:0}, turnIndex:{blue:0,red:0}, control:null, revealed:[], strikes:{blue:0,red:0}, pot:0 };
}

export function currentPlayer(state: GameState, team: TeamId): string { const config = state.teams.find(item => item.id === team)!; return config.players[state.turnIndex[team] % config.players.length]; }
export function advancePlayer(state: GameState, team: TeamId): GameState { const config = state.teams.find(item => item.id === team)!; return { ...state, turnIndex:{ ...state.turnIndex, [team]:(state.turnIndex[team] + 1) % config.players.length } }; }
export function revealAnswer(state: GameState, answer: SurveyAnswer, index: number): GameState { if (state.revealed.includes(index)) return state; return { ...state, revealed:[...state.revealed,index], pot:state.pot + answer.points * state.roundConfigs[state.roundIndex].multiplier }; }
export function registerStrike(state: GameState, team: TeamId): GameState { const strikes = Math.min(3, state.strikes[team] + 1); return { ...state, strikes:{ ...state.strikes, [team]:strikes }, phase:strikes >= 3 ? 'steal' : state.phase }; }
export function finishRound(state: GameState, winner: TeamId): GameState { const scores = { ...state.scores, [winner]:state.scores[winner] + state.pot }; const finalRound = state.roundIndex >= state.roundConfigs.length - 1; return { ...state, scores, phase:finalRound ? (scores.blue === scores.red ? 'faceoff' : 'final') : 'round_result' }; }
export function startTiebreaker(state: GameState, answerCount = 5): GameState { if (state.scores.blue !== state.scores.red) return state; const roundConfigs = [...state.roundConfigs, { answerCount, multiplier:1 as const }]; return { ...state, roundConfigs, roundIndex:roundConfigs.length - 1, phase:'faceoff', control:null, revealed:[], strikes:{blue:0,red:0}, pot:0 }; }
