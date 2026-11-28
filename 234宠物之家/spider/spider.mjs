import {newGame, canPick, canMove, canDeal, move, deal, findHint, isValidBoard, isWon} from './engine.mjs';
import {createStore} from './spider-store.mjs';

const byId = id => document.getElementById(id);
const tableau = byId('tableau');
const scrollArea = byId('board-scroll');
const suits = {
  spades: ['♠', '黑桃'], hearts: ['♥', '红心'],
  clubs: ['♣', '梅花'], diamonds: ['♦', '方块']
};
const suitNames = {1:'一色', 2:'双色', 4:'四色'};
const rankNames = ['', 'A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const pipPositions = [
  [], [[50,50]], [[50,12],[50,88]], [[50,12],[50,50],[50,88]],
  [[20,12],[80,12],[20,88],[80,88]],
  [[20,12],[80,12],[50,50],[20,88],[80,88]],
  [[20,12],[80,12],[20,50],[80,50],[20,88],[80,88]],
  [[20,12],[80,12],[50,31],[20,50],[80,50],[20,88],[80,88]],
  [[20,12],[80,12],[50,31],[20,50],[80,50],[50,69],[20,88],[80,88]],
  [[20,8],[80,8],[20,36],[80,36],[50,50],[20,64],[80,64],[20,92],[80,92]],
  [[20,8],[80,8],[50,21],[20,36],[80,36],[20,64],[80,64],[50,79],[20,92],[80,92]]
];
const spider = '<svg class="back-emblem" aria-hidden="true" focusable="false"><use href="#spider-mark"/></svg>';
const columns = Array.from({length:10}, (_,col) => {
  const button = document.createElement('button');
  button.className = 'pile';
  button.type = 'button';
  button.dataset.col = col;
  button.disabled = true;
  tableau.append(button);
  return button;
});
let board = null;
let undo = [];
let selection = null;
let hint = null;
let keyCursor = null;
let press = null;
let ghost = null;
let blockMouseClickUntil = 0;
let lastTouchAt = -Infinity;
const store = createStore({
  onRestore: payload => { restore(payload); announce('已载入当前牌局。'); },
  onStatus: message => { byId('save-status').textContent = message || ''; }
});

function announce(message) { byId('notice').textContent = message; }
function cardName(card) { return suits[card.suit][1] + rankNames[card.rank]; }
function red(suit) { return suit === 'hearts' || suit === 'diamonds'; }
function cardFace(card) {
  const rank = rankNames[card.rank], symbol = suits[card.suit][0];
  const corner = '<i class="rank" data-value="'+rank+'"></i><i class="suit" data-symbol="'+symbol+'"></i>';
  let center;
  if (card.rank <= 10) {
    center = '<i class="pips">'+pipPositions[card.rank].map(([x,y]) =>
      '<i class="pip'+(card.rank===1?' ace':'')+(y>50?' inverse':'')+'" data-symbol="'+symbol+'" style="left:'+x+'%;top:'+y+'%"></i>'
    ).join('')+'</i>';
  } else {
    center = '<i class="court"><i class="court-rank" data-value="'+rank+'"></i><i class="court-suit" data-symbol="'+symbol+'"></i></i>';
  }
  return '<i class="corner">'+corner+'</i>'+center+'<i class="compact-suit" data-symbol="'+symbol+'"></i><i class="corner reverse">'+corner+'</i>';
}
function cardSlot(card,row) {
  const face = card.up ? 'front'+(red(card.suit)?' red':'') : 'back';
  return '<span class="card-slot'+(card.up?'':' down')+'" aria-hidden="true"><span class="playing-card '+face+'" data-row="'+row+'" data-up="'+card.up+'" data-id="'+card.id+'">'+(card.up ? cardFace(card) : spider)+'</span></span>';
}
function paintChoices() {
  columns.forEach((pile,col) => {
    const stack = board.columns[col];
    pile.classList.toggle('drop-ready', !!selection && canMove(board,selection.col,selection.row,col));
    pile.classList.toggle('hint-to', hint?.type==='move' && col===hint.to);
    pile.setAttribute('aria-pressed',String(selection?.col===col));
    const row = keyCursor?.col===col ? keyCursor.row : stack.length-1;
    const card = stack[row];
    const name = card ? (card.up ? cardName(card) : '背面牌') : '空列';
    pile.setAttribute('aria-label','第 '+(col+1)+' 列，'+name+(card ? '，共 '+stack.length+' 张' : ''));
    Array.from(pile.children).forEach((slot,i) => {
      const face = slot.firstElementChild;
      if (!face) return;
      face.classList.toggle('selected', selection?.col===col && i>=selection.row);
      face.classList.toggle('hinted', hint?.type==='move' && hint.from===col && i>=hint.row);
      face.classList.toggle('key-row', keyCursor?.col===col && keyCursor.row===i);
    });
  });
  byId('deal').classList.toggle('deal-hint',hint?.type==='deal');
}
function paint() {
  for (const [col,pile] of columns.entries()) {
    const stack = board.columns[col];
    pile.disabled = isWon(board);
    pile.innerHTML = stack.length ? stack.map(cardSlot).join('') : '<span class="empty-well" aria-hidden="true"></span>';
  }
  const won = isWon(board);
  byId('difficulty-label').textContent = suitNames[board.suits];
  byId('moves').textContent = board.moves+' 步';
  byId('completed-count').textContent = board.completed.length+' / 8';
  byId('foundation-slots').innerHTML = Array.from({length:8},(_,i) => {
    const suit = board.completed[i];
    return suit ? '<span class="foundation-slot filled'+(red(suit)?' red':'')+'">'+suits[suit][0]+'</span>' : '<span class="foundation-slot"></span>';
  }).join('');
  const rows = board.stock.length/10;
  const mayDeal = canDeal(board);
  const dealButton = byId('deal');
  dealButton.disabled = !mayDeal;
  dealButton.classList.toggle('empty',!rows);
  dealButton.classList.toggle('waiting',!!rows && !mayDeal);
  const caption = !rows ? '牌已发完' : !mayDeal ? '先填满空列' : '剩余 '+rows+' 行';
  byId('stock-left').textContent = caption;
  dealButton.setAttribute('aria-label','发一行牌，'+caption);
  dealButton.title = !mayDeal && rows ? '十列都有牌时才能发一行。剩余 '+rows+' 行。' : caption;
  byId('undo').disabled = !undo.length;
  byId('hint').disabled = won;
  byId('new-game').disabled = false;
  paintChoices();
}
function clearChoices() { selection = null; hint = null; keyCursor = null; }
function persist() { store.save({version:1,board,undo}); }
function restore(payload) {
  cancelPress();
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  clearChoices();
  const valid = payload?.version===1 && isValidBoard(payload.board);
  board = valid ? payload.board : newGame();
  undo = valid && Array.isArray(payload.undo) ? payload.undo.slice(-50).filter(b => isValidBoard(b) && b.suits===board.suits) : [];
  paint();
  return valid;
}
function commit(next,message) {
  if (!next) return false;
  const finished = next.completed.length - board.completed.length;
  if (undo.length===50) undo.shift();
  undo.push(board);
  board = next;
  clearChoices();
  paint();
  persist();
  announce(finished ? '自动收齐 '+finished+' 组，已完成 '+board.completed.length+' / 8。' : message);
  if (isWon(board)) {
    byId('win-detail').textContent = '你用 '+board.moves+' 步完成了这局'+suitNames[board.suits]+'蜘蛛纸牌。';
    byId('win-dialog').showModal();
  }
  return true;
}
function undoMove() {
  if (!undo.length) return;
  cancelPress(); clearChoices();
  board = undo.pop();
  paint(); persist(); announce('已撤销上一步。');
}
function put(from,row,to) {
  const card = board.columns[from][row];
  return commit(move(board,from,row,to),'已将'+cardName(card)+'移到第 '+(to+1)+' 列。');
}
function choose(col,row) {
  if (!board || isWon(board)) return;
  keyCursor = null; hint = null;
  if (selection?.col===col && selection.row===row) {
    selection = null; announce('已取消选择。');
  } else if (selection && canMove(board,selection.col,selection.row,col)) {
    put(selection.col,selection.row,col);return;
  } else if (canPick(board,col,row)) {
    selection = {col,row};
    const size = board.columns[col].length-row;
    announce('已选'+cardName(board.columns[col][row])+(size>1?' 等 '+size+' 张':'')+'，请点目标列。');
  } else {
    announce(selection ? '这里接不了选中的牌。请选点数恰好大一的明牌或空列。' : '先选择一张明牌，或一段同花色的降序牌。');
  }
  paintChoices();
}
function locationOf(target) {
  const pile = target?.closest?.('.pile');
  if (!board || !pile || !tableau.contains(pile)) return null;
  const col = Number(pile.dataset.col);
  const face = target.closest('.playing-card');
  return {col,row:face ? Number(face.dataset.row) : board.columns[col].length-1};
}
tableau.addEventListener('click',event => {
  if (event.detail && (performance.now()<blockMouseClickUntil || event.pointerType==='touch' || event.sourceCapabilities?.firesTouchEvents || performance.now()-lastTouchAt<380)) return;
  const spot = locationOf(event.target);
  if (spot) choose(spot.col,spot.row);
});
for (const event of ['contextmenu','selectstart','dragstart','copy']) {
  scrollArea.addEventListener(event,e=>e.preventDefault());
}

function newPress(point,x,y) {
  const face = point?.row>=0 && columns[point.col].children[point.row]?.firstElementChild;
  const rect = face?.getBoundingClientRect?.();
  return {point,x,y,dx:rect ? x-rect.left : 0,dy:rect ? y-rect.top : 0,width:rect?.width||0,
    scroll:scrollArea.scrollLeft,scrollY:window.scrollY,ready:false,dragged:false,panned:false};
}
function startGhost(active) {
  const {col,row} = active.point;
  const pile = columns[col];
  ghost = document.createElement('div');
  ghost.className = 'ghost-stack';
  ghost.setAttribute('aria-hidden','true');
  ghost.style.width = active.width+'px';
  ghost.style.setProperty('--up-step',getComputedStyle(pile).getPropertyValue('--up-step'));
  for (const slot of Array.from(pile.children).slice(row)) {
    ghost.append(slot.cloneNode(true));
    slot.classList.add('in-drag');
  }
  document.body.append(ghost);
  active.dragged = true;
  selection = {col,row};hint = null;keyCursor = null;
  paintChoices();
}
function destination(x,y) {
  const rect = tableau.getBoundingClientRect();
  if (y<rect.top || y>Math.max(rect.bottom,scrollArea.getBoundingClientRect().bottom) || x<scrollArea.getBoundingClientRect().left || x>scrollArea.getBoundingClientRect().right) return -1;
  const dx = columns[1].getBoundingClientRect().left - columns[0].getBoundingClientRect().left;
  const first = columns[0].getBoundingClientRect();
  return Math.max(0,Math.min(9,Math.round((x-first.left-first.width/2)/dx)));
}
function dragAt(active,x,y) {
  if (!active.dragged) startGhost(active);
  ghost.style.left = (x-active.dx)+'px';ghost.style.top = (y-active.dy)+'px';
  const viewport = scrollArea.getBoundingClientRect();
  if (scrollArea.scrollWidth>scrollArea.clientWidth) {
    if (x<viewport.left+24) scrollArea.scrollLeft-=14;
    else if (x>viewport.right-24) scrollArea.scrollLeft+=14;
  }
  const to = destination(x,y);
  columns.forEach((pile,col) => pile.classList.toggle('over-drop',col===to && canMove(board,active.point.col,active.point.row,col)));
}
function cancelPress() {
  if (!press) return;
  clearTimeout(press.timer);
  press = null;
  ghost?.remove(); ghost = null;
  for (const pile of columns) {
    pile.classList.remove('over-drop');
    for (const slot of pile.querySelectorAll('.in-drag')) slot.classList.remove('in-drag');
  }
}
function finishDrag(active,x,y) {
  const to = destination(x,y);
  const {col,row} = active.point;
  cancelPress();
  if (to>=0 && canMove(board,col,row,to)) { put(col,row,to);return; }
  announce('牌已放回原列，可以重新选牌。');
}
tableau.addEventListener('pointerdown',event => {
  if (!board || isWon(board) || event.pointerType==='touch' || event.button!==0) return;
  const point = locationOf(event.target);
  if (!point || !canPick(board,point.col,point.row)) return;
  cancelPress();
  press = newPress(point,event.clientX,event.clientY);
  press.pointer = event.pointerId;
});
window.addEventListener('pointermove',event => {
  if (!press || press.pointer!==event.pointerId) return;
  if (Math.hypot(event.clientX-press.x,event.clientY-press.y)>5 || press.dragged) {
    event.preventDefault(); dragAt(press,event.clientX,event.clientY);
  }
});
window.addEventListener('pointerup',event => {
  if (!press || press.pointer!==event.pointerId) return;
  if (press.dragged) { blockMouseClickUntil=performance.now()+300;finishDrag(press,event.clientX,event.clientY); }
  else cancelPress();
});
window.addEventListener('pointercancel',event => { if (press?.pointer===event.pointerId) cancelPress(); });

// Cancel on contact so mobile browsers never start selecting the cards' contents.
// Single-finger swipes still pan the table/page; holding a movable stack enables dragging it.
const touchOptions = {capture:true,passive:false};
scrollArea.addEventListener('touchstart',event => {
  cancelPress();
  if (!board || isWon(board) || event.touches.length!==1) return;
  if (event.cancelable) event.preventDefault();
  const touch=event.touches[0], point=locationOf(event.target);
  press = newPress(point,touch.clientX,touch.clientY);
  press.touch = touch.identifier;
  lastTouchAt = performance.now();
  if (point && canPick(board,point.col,point.row)) {
    const active=press;
    active.timer=setTimeout(()=>{active.ready=true;},220);
  }
},touchOptions);
document.addEventListener('touchstart',event=>{if (event.touches.length>1) cancelPress();},{capture:true,passive:true});
scrollArea.addEventListener('touchmove',event => {
  const active=press,touch=event.touches[0];
  if (!active || event.touches.length!==1 || active.touch!==touch.identifier) return;
  if (event.cancelable) event.preventDefault();
  const x=touch.clientX,y=touch.clientY;
  if (!active.panned && !active.dragged && Math.hypot(x-active.x,y-active.y)<7) return;
  clearTimeout(active.timer);
  if (active.ready && !active.panned) { dragAt(active,x,y);return; }
  active.panned=true;
  scrollArea.scrollLeft=active.scroll+active.x-x;
  window.scrollTo(window.scrollX,active.scrollY+active.y-y);
},touchOptions);
scrollArea.addEventListener('touchend',event => {
  if (event.cancelable) event.preventDefault();
  lastTouchAt=performance.now();
  const active=press,touch=event.changedTouches[0];
  if (!active || event.touches.length || touch.identifier!==active.touch) {cancelPress();return;}
  if (active.dragged) {finishDrag(active,touch.clientX,touch.clientY);return;}
  cancelPress();
  if (active.point && !active.panned && Math.hypot(touch.clientX-active.x,touch.clientY-active.y)<10) choose(active.point.col,active.point.row);
},touchOptions);
scrollArea.addEventListener('touchcancel',cancelPress);
window.addEventListener('blur',cancelPress);
window.addEventListener('pagehide',cancelPress);

tableau.addEventListener('keydown',event => {
  const pile=event.target.closest('.pile');
  if (!pile || !board || isWon(board)) return;
  const col=Number(pile.dataset.col),stack=board.columns[col];
  if (event.key==='ArrowLeft' || event.key==='ArrowRight') {
    event.preventDefault();
    const next=Math.max(0,Math.min(9,col+(event.key==='ArrowLeft'?-1:1)));
    keyCursor={col:next,row:board.columns[next].length-1};
    columns[next].focus();paintChoices();
  } else if (event.key==='ArrowUp' || event.key==='ArrowDown') {
    event.preventDefault();
    if (!stack.length) return;
    const current=keyCursor?.col===col?keyCursor.row:stack.length-1;
    const first=stack.findIndex(card=>card.up);
    keyCursor={col,row:Math.max(first,Math.min(stack.length-1,current+(event.key==='ArrowUp'?-1:1)))};
    announce('第 '+(col+1)+' 列，'+cardName(stack[keyCursor.row])+'。');paintChoices();
  } else if (event.key==='Enter' || event.key===' ') {
    event.preventDefault();if (!event.repeat) choose(col,keyCursor?.col===col?keyCursor.row:stack.length-1);
  }
});
window.addEventListener('keydown',event => {
  if (!board || document.querySelector('dialog[open]')) return;
  if (event.key==='Escape') {cancelPress();clearChoices();paintChoices();announce('已取消选择。');}
  if ((event.ctrlKey||event.metaKey) && !event.shiftKey && event.key.toLowerCase()==='z') {
    event.preventDefault();undoMove();
  }
});
byId('deal').addEventListener('click',()=>{if (board && canDeal(board)) commit(deal(board),'已向十列各发一张牌。');});
byId('undo').addEventListener('click',undoMove);
byId('hint').addEventListener('click',()=>{
  clearChoices();hint=findHint(board);paintChoices();
  if (hint?.type==='move') announce('可将第 '+(hint.from+1)+' 列的'+cardName(board.columns[hint.from][hint.row])+'移到第 '+(hint.to+1)+' 列。');
  else if (hint?.type==='deal') announce('可以发一行新牌。');
  else announce('当前没有可提示的走法，可以撤销或开始新局。');
});
function showNewGame() {
  byId('suits').value=board.suits;
  byId('new-dialog').showModal();
}
byId('new-game').addEventListener('click',showNewGame);
byId('play-again').addEventListener('click',()=>{byId('win-dialog').close();showNewGame();});
byId('new-form').addEventListener('submit',event=>{
  event.preventDefault();cancelPress();clearChoices();
  undo=[];board=newGame(Number(byId('suits').value));
  byId('new-dialog').close();paint();persist();announce('已开始'+suitNames[board.suits]+'新局。');
});
byId('rules').addEventListener('click',()=>byId('rules-dialog').showModal());
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click',()=>button.closest('dialog').close());
byId('scale').addEventListener('click',()=>{
  const large=scrollArea.classList.toggle('enlarged');
  byId('scale').setAttribute('aria-pressed',String(large));
  announce(large ? '已放大纸牌，左右滑动查看各列。' : '已恢复十列全览。');
});
let initial=null;
try { initial=await store.load(); } catch { byId('save-status').textContent='暂时无法读取存档'; }
const resumed=restore(initial);
if (!resumed) persist();
announce(isWon(board) ? '已收齐八组，可以再开一局。' : '点选要移动的牌，再点目标列。');
