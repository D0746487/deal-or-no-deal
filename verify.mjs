import assert from 'node:assert/strict';
import { peelGeometry, polygonCSS } from './site/peel.mjs';
import { AMOUNTS, ROUNDS, SCALES, createGame, selectCard, noDeal, deal, remainingExpectedValue } from './site/game.mjs';
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
  assert.equal(remainingExpectedValue(g),null);
}
const g = createGame(); selectCard(g,17); for(let i=0;i<5;i++)selectCard(g,i);
assert.equal(deal(createGame()),false);
assert.equal(deal(g),true); assert.deepEqual(g.result,{kind:'deal'}); assert.equal(noDeal(g),false); assert.equal(deal(g),false);
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
  assert.equal(deal(scaled),true); assert.deepEqual(scaled.result,{kind:'deal'});
  selectCard(scaled,5); assert.equal(scaled.cards[5].amount,1000*scale);
}
assert.equal(createGame().scale,1);
assert.throws(()=>createGame(Math.random,0.3),RangeError);
assert.deepEqual(createGame(()=>.999,1).amounts,AMOUNTS);
for (const scale of SCALES) {
  const expected = createGame(()=>.999,scale);
  assert.equal(remainingExpectedValue(expected),75000*scale/18);
  selectCard(expected,17);
  assert.equal(remainingExpectedValue(expected),75000*scale/18);
  selectCard(expected,0);
  assert.equal(remainingExpectedValue(expected),74000*scale/17);
  selectCard(expected,16);
  assert.equal(remainingExpectedValue(expected),64000*scale/16);
  for (const i of [1,2,3]) selectCard(expected,i);
  deal(expected);
  assert.equal(remainingExpectedValue(expected),51000*scale/12);
  for(let i=4;i<16;i++)selectCard(expected,i);
  assert.equal(remainingExpectedValue(expected),null);
}
const area = points => Math.abs(points.reduce((sum,p,i)=>{ const q=points[(i+1)%points.length]; return sum+p[0]*q[1]-p[1]*q[0]; },0)/2);
for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
  let previous=320*160;
  for(const distance of [0,20,60,120,200,400,600]) {
    const peel=peelGeometry(320,160,dx*distance,dy*distance);
    assert.ok(peel.progress>=0 && peel.progress<=1);
    assert.ok(area(peel.cover)<=previous+.001);
    previous=area(peel.cover);
    assert.ok([...peel.cover,...peel.fold].every(p=>p.every(Number.isFinite)));
    assert.ok(polygonCSS(peel.cover,320,160).startsWith('polygon('));
  }
  assert.ok(previous<.001);
}
assert.equal(area(peelGeometry(320,160,80,0).cover),320*160*.75);
assert.equal(area(peelGeometry(320,160,0,-40).cover),320*160*.75);
console.log('Passed: game rounds and scales, remaining expected values, and progressively revealed paper geometry in all eight directions.');

