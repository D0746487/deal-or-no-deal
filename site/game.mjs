export const AMOUNTS = [1000,1000,1000,1000,1000,1000,1500,2000,2500,3000,4000,5000,6000,7000,8000,10000,10000,10000];
export const ROUNDS = [5,4,3,2,1,1,1];
export const SCALES = [0.1,0.2,0.5,1];
export function remainingExpectedValue(game) {
  const remaining = game.cards.filter((card, index) => !game.opened.includes(index) && !(game.phase === 'finished' && index === game.selected));
  return remaining.length ? remaining.reduce((sum, card) => sum + card.amount, 0) / remaining.length : null;
}
export function createGame(random = Math.random, scale = 1) {
  if (!SCALES.includes(scale)) throw new RangeError('Unsupported amount scale');
  const amounts = AMOUNTS.map(amount => Math.round(amount * scale));
  const cards = amounts.map((amount, prize) => ({ amount, prize }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return { cards, amounts, scale, selected: null, opened: [], round: 0, inRound: 0, phase: 'choose', offer: null, result: null };
}
export function selectCard(game, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 18) return false;
  if (game.phase === 'choose') {
    game.selected = index; game.phase = 'open'; return true;
  }
  if (game.phase === 'finished' && game.result?.kind === 'deal') {
    if (index === game.selected || game.opened.includes(index)) return false;
    game.opened.push(index); return true;
  }
  if (game.phase !== 'open' || index === game.selected || game.opened.includes(index)) return false;
  game.opened.push(index); game.inRound++;
  if (game.inRound === ROUNDS[game.round]) {
    game.phase = game.round === 6 ? 'finished' : 'offer';
    if (game.phase === 'finished') game.result = { kind: 'card', amount: game.cards[game.selected].amount };
  }
  return true;
}
export function noDeal(game) {
  if (game.phase !== 'offer') return false;
  game.round++; game.inRound = 0; game.phase = 'open'; game.offer = null; return true;
}
export function deal(game) {
  if (game.phase !== 'offer') return false;
  game.result = { kind: 'deal' }; game.phase = 'finished'; return true;
}
