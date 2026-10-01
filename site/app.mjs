import { ROUNDS, createGame, selectCard, noDeal, deal, remainingExpectedValue } from './game.mjs';
const $ = id => document.getElementById(id);
const money = n => n.toLocaleString('zh-TW');
let game = createGame();
let pendingCard = null;
let modalMode = null;
let pendingScale = game.scale;
let gameStarted = false;
let animationEnabled = true;
let awaitingReveal = false;
let drag = null;
function announce(text) { $('announcement').textContent = text; }
function render() {
  const choosing = game.phase === 'choose', finished = game.phase === 'finished';
  const afterDeal = finished && game.result.kind === 'deal';
  $('phase-label').textContent = choosing ? '先選一張' : finished ? '本局結束' : game.phase === 'offer' ? '報價時間' : `第 ${game.round + 1} 回合`;
  $('instruction').textContent = choosing ? '哪一張，是你的幸運牌？' : finished ? (game.result.kind === 'deal' ? '成交！把好運帶回家。' : '你的幸運牌，終於揭曉。') : game.phase === 'offer' ? '停在這裡，還是繼續？' : `這回合，還要開 ${ROUNDS[game.round] - game.inRound} 張牌。`;
  $('detail').textContent = choosing ? '選一張留到最後，其餘的牌將逐一揭曉。' : afterDeal ? '剩下的牌仍可點開，看看錯過了哪些金額。' : finished ? '想再挑戰一次？新的一局會重新洗牌。' : game.phase === 'offer' ? '請主持人報價，再決定 Deal 或 No Deal。' : `本回合已開 ${game.inRound} / ${ROUNDS[game.round]} 張，點選現實抽到的號碼。`;
  $('selected-number').textContent = game.selected === null ? '?' : String(game.selected + 1).padStart(2,'0');
  $('selected-caption').textContent = choosing ? '等待選擇' : finished ? `NT$ ${money(game.cards[game.selected].amount)}` : '留到最後';
  $('rounds').replaceChildren(...ROUNDS.map((count, i) => {
    const step = document.createElement('div'); step.className = `round-step ${!choosing && i < game.round ? 'done' : ''} ${!choosing && i === game.round ? 'active' : ''}`;
    step.innerHTML = `<span>第 ${i+1} 回</span><b>${count} 張</b>`; return step;
  }));
  $('cards').replaceChildren(...game.cards.map((card, i) => {
    const opened = game.opened.includes(i), kept = game.selected === i;
    const button = document.createElement('button'); button.className = `playing-card ${opened ? 'opened' : ''} ${kept ? 'kept' : ''}`;
    button.disabled = !gameStarted || (!['choose','open'].includes(game.phase) && !afterDeal) || kept || opened;
    button.setAttribute('aria-label', `${i+1} 號牌${opened ? `，已開出 ${money(card.amount)} 元` : kept ? '，你的底牌' : ''}`);
    button.innerHTML = `<span class="corner" aria-hidden="true">${kept ? '♥' : '♠'}</span><span class="card-number">${String(i+1).padStart(2,'0')}</span>${opened ? `<span class="opened-value">${money(card.amount)}</span>` : `<span class="suit">${kept ? '你的牌' : '♠'}</span>`}`;
    button.onclick = () => choose(i); return button;
  }));
  const outPrizes = new Set(game.opened.map(i => game.cards[i].prize));
  if (finished) outPrizes.add(game.cards[game.selected].prize);
  const sortedPrizes = game.amounts.map((amount, prize) => ({ amount, prize })).sort((a,b) => a.amount-b.amount);
  $('prize-list').replaceChildren(...[sortedPrizes.slice(0,9), sortedPrizes.slice(9)].map((prizes, columnIndex) => {
    const column = document.createElement('section');
    column.className = `prize-column ${columnIndex === 0 ? 'low' : 'high'}`;
    column.setAttribute('aria-label', columnIndex === 0 ? '左欄金額' : '右欄金額');
    column.append(...prizes.map(({ amount, prize }) => {
      const item = document.createElement('div'); item.className = `prize ${outPrizes.has(prize) ? 'out' : ''}`;
      item.setAttribute('aria-label', `${money(amount)} 元${outPrizes.has(prize) ? '，已開出' : '，未開出'}`);
      item.innerHTML = `<span class="prize-dot" aria-hidden="true">◆</span><span class="value">${money(amount)}</span>`;
      return item;
    }));
    return column;
  }));
  $('board-count').textContent = choosing ? '18 張待選' : `已開 ${game.opened.length} / 17 張`;
  $('prize-count').textContent = `${18 - outPrizes.size} 筆剩餘`;
  const expectation = remainingExpectedValue(game);
  $('expected-value').textContent = expectation === null ? '—' : `NT$ ${expectation.toLocaleString('zh-TW',{maximumFractionDigits:0})}`;
  $('expected-note').textContent = expectation === null ? '所有金額已揭曉' : finished ? '未揭曉金額的平均' : '未揭曉金額的平均，含底牌';
  $('table-note').textContent = afterDeal ? '已成交，仍可點開剩餘的牌查看金額。' : finished ? '你的底牌金額已顯示在上方。' : '跟著現實抽到的號碼，點選對應的牌。';
  $('offer-panel').hidden = game.phase !== 'offer'; $('result-panel').hidden = !finished;
  if (finished) {
    $('result-label').textContent = game.result.kind === 'deal' ? 'DEAL · 成交' : 'NO DEAL · 最後揭曉';
    $('result-title').textContent = game.result.kind === 'deal' ? '你接受了主持人的報價' : `${game.selected + 1} 號牌，是你的幸運牌`;
    $('result-amount').textContent = afterDeal ? 'DEAL!' : `NT$ ${money(game.result.amount)}`;
    $('result-note').textContent = game.result.kind === 'deal' ? `你的 ${game.selected + 1} 號底牌原本是 NT$ ${money(game.cards[game.selected].amount)}。` : '一路堅持到最後，這就是屬於你的金額。';
  }
}
function choose(i) {
  if (!gameStarted) return;
  const afterDeal = game.phase === 'finished' && game.result.kind === 'deal';
  if (!['choose','open'].includes(game.phase) && !afterDeal) return;
  pendingCard = i;
  const picking = game.phase === 'choose'; modalMode = picking ? 'pick' : afterDeal ? 'inspect' : 'reveal';
  $('dialog-label').textContent = picking ? '你的第一個決定' : afterDeal ? '成交後 · 看看剩下的牌' : `第 ${game.round + 1} 回合 · 開牌`;
  $('dialog-number').textContent = String(i+1).padStart(2,'0');
  $('dialog-title').textContent = picking ? '把這張留到最後？' : `${i+1} 號牌的金額是`;
  $('dialog-amount').textContent = '';
  $('dialog-note').textContent = picking ? '確認後，這張牌的金額會保持秘密。' : '';
  $('dialog-confirm').textContent = picking ? '就是這張！' : '繼續';
  awaitingReveal = !picking && animationEnabled;
  drag = null;
  $('reveal-stage').hidden = picking;
  $('paper-cover').hidden = !awaitingReveal;
  $('paper-edge').disabled = false;
  $('paper-cover').classList.remove('peeled','dragging');
  $('paper-cover').style.transform = '';
  $('dialog-confirm').hidden = awaitingReveal;
  if (awaitingReveal) $('dialog-note').textContent = '按住紙張右側邊緣，往左拖開。';
  else if (!picking && !revealPendingCard()) return;
  $('card-dialog').showModal();
  if (awaitingReveal) $('paper-edge').focus({preventScroll:true});
}
function revealPendingCard() {
  if (!selectCard(game,pendingCard)) return false;
  awaitingReveal = false;
  $('dialog-amount').textContent = `NT$ ${money(game.cards[pendingCard].amount)}`;
  $('dialog-note').textContent = modalMode === 'inspect' ? '已成交，繼續揭曉剩下的牌。' : game.phase === 'offer' ? '本回合開牌完成，接著聽聽主持人的報價。' : game.phase === 'finished' ? '最後一張已開出，接著揭曉你的底牌！' : `這回合還要開 ${ROUNDS[game.round]-game.inRound} 張。`;
  $('dialog-confirm').hidden = false;
  render(); announce(`${pendingCard+1} 號牌開出 ${money(game.cards[pendingCard].amount)} 元`);
  return true;
}
function finishPeel() {
  if (!awaitingReveal || !revealPendingCard()) return;
  drag = null;
  $('paper-cover').classList.remove('dragging');
  $('paper-cover').classList.add('peeled');
  $('paper-cover').style.transform = '';
  $('paper-edge').disabled = true;
  $('dialog-confirm').focus({preventScroll:true});
}
$('paper-edge').addEventListener('pointerdown',event => {
  if (!awaitingReveal || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault();
  drag = { id: event.pointerId, x: event.clientX, width: $('reveal-stage').getBoundingClientRect().width };
  $('paper-edge').setPointerCapture(event.pointerId);
  $('paper-cover').classList.add('dragging');
});
$('paper-edge').addEventListener('pointermove',event => {
  if (!drag || drag.id !== event.pointerId) return;
  const progress = Math.max(0,Math.min(1,(drag.x-event.clientX)/drag.width));
  $('paper-cover').style.transform = `translateX(${-progress*100}%) rotate(${-progress*4}deg)`;
  if (progress >= .7) finishPeel();
});
function cancelPeel() {
  drag = null;
  $('paper-cover').classList.remove('dragging');
  if (awaitingReveal) $('paper-cover').style.transform = '';
}
$('paper-edge').addEventListener('pointerup',cancelPeel);
$('paper-edge').addEventListener('pointercancel',cancelPeel);
$('paper-edge').addEventListener('lostpointercapture',cancelPeel);
$('paper-edge').addEventListener('keydown',event => {
  if (['Enter',' ','ArrowLeft'].includes(event.key)) { event.preventDefault(); finishPeel(); }
});
$('animation-toggle').onclick = () => {
  animationEnabled = !animationEnabled;
  $('animation-toggle').setAttribute('aria-checked',String(animationEnabled));
  $('animation-toggle').textContent = `開牌動畫：${animationEnabled ? '開' : '關'}`;
};
function scrollToCurrent() {
  if (game.phase === 'offer' || game.phase === 'finished') $(game.phase === 'offer' ? 'offer-panel' : 'result-panel').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'center'});
}
$('dialog-confirm').onclick = () => {
  if (modalMode === 'pick') { selectCard(game,pendingCard); render(); announce(`已保留 ${pendingCard+1} 號牌。第一回合開五張。`); }
  $('card-dialog').close();
};
$('card-dialog').addEventListener('close',() => {
  awaitingReveal = false; cancelPeel();
  if (modalMode !== 'inspect') scrollToCurrent();
});
$('no-deal').onclick = () => { if(noDeal(game)) { render(); $('board-title').scrollIntoView({block:'start',behavior:'smooth'}); announce(`No Deal！第 ${game.round+1} 回合，開 ${ROUNDS[game.round]} 張。`); } };
$('deal').onclick = () => {
  if (!deal(game)) return;
  render(); scrollToCurrent(); announce('成交！你接受了主持人的報價。');
};
function renderScaleOptions() {
  document.querySelectorAll('[data-scale]').forEach(button => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.scale) === pendingScale));
  });
  $('scale-preview').textContent = `金額範圍：NT$ ${money(Math.round(1000 * pendingScale))} ～ ${money(Math.round(10000 * pendingScale))}`;
}
function openReset() {
  pendingScale = game.scale;
  $('reset-title').textContent = gameStarted ? '重新洗牌？' : '選擇這局的金額';
  $('reset-description').textContent = gameStarted ? '這局的進度會清除，18 筆金額重新隨機分配。' : '選好金額比例，就能開始挑選你的幸運牌。';
  $('cancel-reset').hidden = !gameStarted;
  $('confirm-reset').textContent = gameStarted ? '重新開始' : '開始遊戲';
  renderScaleOptions();
  $('reset-title').tabIndex = -1;
  $('reset-dialog').showModal();
  $('reset-title').focus({ preventScroll: true });
}
document.querySelectorAll('[data-scale]').forEach(button => {
  button.onclick = () => { pendingScale = Number(button.dataset.scale); renderScaleOptions(); };
});
$('restart').onclick = openReset;
$('cancel-reset').onclick = () => { if (gameStarted) $('reset-dialog').close(); };
$('reset-dialog').addEventListener('cancel', event => { if (!gameStarted) event.preventDefault(); });
function reset(scale) { game = createGame(Math.random,scale); pendingCard = null; modalMode = null; render(); window.scrollTo({top:0,behavior:'smooth'}); announce(`新的一局已洗牌，金額為 ${scale} 倍，請選你的底牌。`); }
$('confirm-reset').onclick = () => { gameStarted = true; $('reset-dialog').close(); reset(pendingScale); };
$('play-again').onclick = openReset;
render();
openReset();
