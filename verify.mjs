import assert from 'node:assert/strict';
import { peelGeometry, polygonCSS } from './site/peel.mjs';
import { AMOUNTS, ROUNDS, SCALES, createGame, selectCard, noDeal, deal, remainingExpectedValue } from './site/game.mjs';
const sorted = a => [...a].sort((x,y)=>x-y);
assert.equal(AMOUNTS.length,14);
assert.equal(AMOUNTS.filter(x=>x===500).length,1);
assert.equal(AMOUNTS.filter(x=>x===1000).length,4);
assert.equal(AMOUNTS.filter(x=>x===10000).length,2);
assert.equal(AMOUNTS.reduce((a,b)=>a+b,0),48500);
assert.deepEqual(ROUNDS,[4,3,2,1,1,1,1]);
assert.equal(ROUNDS.reduce((a,b)=>a+b),AMOUNTS.length-1);
for(let run=0;run<56;run++) {
  const scale=SCALES[run%SCALES.length];
  const g=createGame(Math.random,scale), kept=run%AMOUNTS.length;
  assert.deepEqual(sorted(g.cards.map(c=>c.amount)),sorted(AMOUNTS.map(a=>Math.round(a*scale))));
  assert.deepEqual(g.amounts,AMOUNTS.map(a=>Math.round(a*scale)));
  assert.equal(new Set(g.cards.map(c=>c.prize)).size,14);
  assert.equal(selectCard(g,-1),false); assert.equal(selectCard(g,14),false);
  assert.equal(selectCard(g,kept),true); assert.equal(selectCard(g,kept),false);
  const others=g.cards.map((_,i)=>i).filter(i=>i!==kept);
  let opened=0;
  for(let round=0;round<ROUNDS.length;round++) {
    for(let i=0;i<ROUNDS[round];i++) {
      const index=others[opened++];
      assert.equal(selectCard(g,index),true); assert.equal(selectCard(g,index),false);
    }
    assert.equal(g.opened.length,opened);
    if(round<ROUNDS.length-1) {
      assert.equal(g.phase,'offer'); assert.equal(selectCard(g,others[opened]),false);
      assert.equal(noDeal(g),true);
    }
  }
  assert.equal(g.phase,'finished'); assert.equal(g.result.amount,g.cards[kept].amount);
  assert.equal(g.opened.length,13); assert.equal(remainingExpectedValue(g),null);
  assert.equal(noDeal(g),false); assert.equal(deal(g),false);
}
assert.equal(deal(createGame()),false);
for (const scale of SCALES) {
  const g=createGame(()=>.999,scale);
  assert.equal(Math.min(...g.amounts),500*scale);
  assert.equal(Math.max(...g.amounts),10000*scale);
  assert.equal(g.amounts.filter(a=>a===1000*scale).length,4);
  assert.equal(remainingExpectedValue(g),48500*scale/14);
  selectCard(g,13);
  assert.equal(remainingExpectedValue(g),48500*scale/14);
  selectCard(g,0);
  assert.equal(remainingExpectedValue(g),48000*scale/13);
  selectCard(g,12);
  assert.equal(remainingExpectedValue(g),38000*scale/12);
  selectCard(g,1); selectCard(g,2);
  assert.equal(g.phase,'offer'); assert.equal(remainingExpectedValue(g),36000*scale/10);
  assert.equal(g.cards[1].amount,g.cards[2].amount);
  assert.equal(new Set(g.opened.map(i=>g.cards[i].prize)).size,4);
  assert.equal(deal(g),true); assert.deepEqual(g.result,{kind:'deal'});
  assert.equal(remainingExpectedValue(g),26000*scale/9);
  const result={...g.result}, round=g.round, count=g.inRound;
  for(let i=3;i<12;i++) {
    assert.equal(selectCard(g,i),true); assert.equal(selectCard(g,i),false);
    assert.equal(g.phase,'finished'); assert.deepEqual(g.result,result);
    assert.equal(g.round,round); assert.equal(g.inRound,count);
  }
  assert.equal(g.opened.length,13); assert.equal(remainingExpectedValue(g),null);
  assert.equal(selectCard(g,13),false); assert.equal(noDeal(g),false);
}
assert.equal(createGame().scale,1);
assert.throws(()=>createGame(Math.random,0.3),RangeError);
assert.deepEqual(createGame(()=>.999,1).amounts,AMOUNTS);
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

