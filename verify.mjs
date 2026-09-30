import assert from 'node:assert/strict';
import { AMOUNTS, ROUNDS, SCALES, createGame, selectCard, noDeal, deal } from './site/game.mjs';
const sorted = a => [...a].sort((x,y)=>x-y);
assert.equal(AMOUNTS.length,18); assert.equal(ROUNDS.reduce((a,b)=>a+b),17);
for(let run=0;run<50;run++) {
  const scale = SCALES[run % SCALES.length];
  const g = createGame(Math.random,scale);
  assert.deepEqual(sorted(g.cards.map(c=>c.amount)),sorted(AMOUNTS.map(amount=>Math.round(amount*scale))));
  assert.deepEqual(g.amounts,AMOUNTS.map(amount=>Math.round(amount*scale)));
  assert.equal(new Set(g.cards.map(c=>c.prize)).size,18);
  assert.equal(selectCard(g,0),true); assert.equal(selectCard(g,0),false);
  let card=1;
  for(let round=0;round<7;round++) {
    for(let k=0;k<ROUNDS[round];k++) { assert.equal(selectCard(g,card),true); assert.equal(selectCard(g,card++),false); }
    assert.equal(g.opened.length,ROUNDS.slice(0,round+1).reduce((a,b)=>a+b));
    if(round<6) { assert.equal(g.phase,'offer'); assert.equal(selectCard(g,card),false); assert.equal(noDeal(g),true); }
  }
  assert.equal(g.phase,'finished'); assert.equal(g.result.amount,g.cards[0].amount); assert.equal(g.opened.length,17);
}
const g = createGame(); selectCard(g,17); for(let i=0;i<5;i++)selectCard(g,i);
assert.equal(deal(g,NaN),false); assert.equal(deal(g,-1),false); assert.equal(deal(g,1.5),false);
assert.equal(deal(g,4200),true); assert.equal(g.result.amount,4200); assert.equal(noDeal(g),false);
const settled = { ...g.result }, settledRound = g.round, settledCount = g.inRound;
for (let i=5;i<17;i++) {
  assert.equal(selectCard(g,i),true); assert.equal(selectCard(g,i),false);
  assert.equal(g.phase,'finished'); assert.deepEqual(g.result,settled);
  assert.equal(g.round,settledRound); assert.equal(g.inRound,settledCount);
}
assert.equal(g.opened.length,17); assert.equal(selectCard(g,17),false); assert.equal(selectCard(g,-1),false);
const duplicate = createGame(()=>.999); selectCard(duplicate,17); selectCard(duplicate,0);
assert.equal(duplicate.opened.map(i=>duplicate.cards[i].prize).length,1);
assert.equal(duplicate.cards[0].amount,1000); assert.equal(duplicate.cards[1].amount,1000);
for (const scale of SCALES) {
  const scaled = createGame(()=>.999,scale);
  assert.equal(Math.min(...scaled.amounts),1000*scale);
  assert.equal(Math.max(...scaled.amounts),10000*scale);
  assert.equal(scaled.amounts.filter(amount=>amount===1000*scale).length,6);
  selectCard(scaled,17); for(let i=0;i<5;i++)selectCard(scaled,i);
  deal(scaled,777); assert.equal(scaled.result.amount,777);
  selectCard(scaled,5); assert.equal(scaled.cards[5].amount,1000*scale);
}
assert.equal(createGame().scale,1);
assert.throws(()=>createGame(Math.random,0.3),RangeError);
assert.deepEqual(createGame(()=>.999,1).amounts,AMOUNTS);
console.log('Passed: 50 complete games across all four scales, amount distribution, duplicate prizes, Deal settlement, unchanged manual offers, and post-Deal reveals.');

