// All positions use the mine's 800 × 520 drawing coordinates. Angles are
// measured from straight down, so positive angles point to the right.
const WIDTH = 800;
const HEIGHT = 520;
const REST = 20;
const SWING = 1.43;
const ROUND_SECONDS = 60;

// Four rows of eight potential pockets. Empty spaces create clear approach
// angles to the deeper seams. Later rounds revisit these mines with variations.
const MINES = [
  ['浅层金脉', ['.1...2..', '2..s..1.', '.3..2..3', '..4.b.r.']],
  ['碎石坡',   ['..s.1..2', '.2...3.s', '3..r..2.', '.4.b..4.']],
  ['水晶洞',   ['..2..s..', '.d.r..3.', '..3..d.s', '4.b.d..4']],
  ['废弃坑道', ['..s..2..', '2..x..d.', '.4..r..3', 'd..b..4.']],
  ['鼹鼠矿道', ['.2...s..', 'm..3..d.', '.4...M.s', 'd..b.4..']],
  ['深井石阵', ['..s..2..', 'r..d..r.', '3..R.d.3', '.4..b..4']],
  ['炸药库',   ['.3...s..', 'd..x..3.', '.x..d..x', '4.b.r.4.']],
  ['宝石暗河', ['.d...3..', 'm..r..M.', '3..d..3s', '.4..M..4']]
];

// type, size, radius, cash value, haul speed (pixels per second)
const ORE = {
  '1': ['gold','small',12,50,205], '2': ['gold','medium',17,100,148],
  '3': ['gold','large',23,250,100], '4': ['gold','large',30,500,72],
  s: ['rock','small',13,11,118], r: ['rock','medium',21,20,75],
  R: ['rock','large',31,35,47], d: ['diamond','small',12,600,218],
  b: ['bag','medium',17,0,144], x: ['tnt','medium',18,0,0],
  m: ['mole','small',13,2,178], M: ['mole','small',15,602,178]
};
const GOALS = [650,1195,2010,3095,4495,6055,7720,9510];
const SHOP = [
  ['bomb','炸药','炸掉正在回收的物品，立即轻装收钩。',70],
  ['strength','大力药水','下一关收钩更快，双人模式下两人都有效。',200],
  ['polish','钻石抛光剂','下一关钻石价值增加一半。',180],
  ['luck','幸运草','下一关的福袋必定装有一笔大钱。',100],
  ['book','石头收藏书','下一关石块以三倍价格出售。',50]
];

function targetFor(level, players) {
  const base = GOALS[level - 1] ?? GOALS.at(-1) + (level - GOALS.length) * 1800;
  return Math.round(base * (players === 2 ? 1.65 : 1));
}

function updateTip(hook) {
  hook.tipX = hook.x + hook.length * Math.sin(hook.angle);
  hook.tipY = hook.y + hook.length * Math.cos(hook.angle);
}

function makeHook(x, direction) {
  const hook = { x, y:90, angle:0, direction, length:REST, state:'aim', item:null };
  updateTip(hook);
  return hook;
}

function makeItem(index, key, x, y, rng) {
  const [type,size,r,value,speed] = ORE[key];
  return { id:index, type, size, x, y, r, value, speed, claimedBy:null, gems:key === 'M',
    face:rng() < 0.5 ? -1 : 1, homeX:x };
}

function valueOf(item, buffs) {
  if (item.type === 'rock' && buffs.book) return item.value * 3;
  if (item.type === 'diamond' && buffs.polish) return item.value * 1.5;
  if (item.gems && buffs.polish) return item.value + 300;
  return item.value;
}

function fillMine(g) {
  const [name, rows] = MINES[(g.level - 1) % MINES.length];
  const mirror = g.random() < 0.5;
  const empty = [];
  g.levelName = name;
  g.items = [];
  function add(key,x,y) {
    g.items.push(makeItem(g.items.length,key,x,y,g.random));
  }
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const key = rows[row][col];
      const x = (mirror ? 7-col : col) * 98 + 57 + (g.random() - .5) * 21;
      const y = 178 + row * 93 + (g.random() - .5) * 22;
      if (key === '.') empty.push({ x, y });
      else add(key,x,y);
    }
  }
  // Include extra high-value ore in co-op, after purchases, and late in the
  // run. Use free pockets, so the extra nuggets never overlap existing ore.
  const reserve = Math.max(targetFor(g.level,g.players) - g.money,
    g.target - targetFor(Math.max(1,g.level-1),g.players), 500) * 1.6;
  let available = g.items.reduce((sum,item) => sum + valueOf(item,g.buffs),0);
  while (available < reserve && empty.length) {
    const [pocket] = empty.splice(Math.floor(g.random() * empty.length),1);
    const key = g.level >= 3 && g.random() < .55 ? 'd' : '4';
    add(key,pocket.x,pocket.y);
    available += ORE[key][3];
  }
}

function beginRound(g) {
  g.phase = 'playing';
  g.target = targetFor(g.level,g.players);
  g.timeLeft = ROUND_SECONDS;
  g.elapsed = 0;
  g.earned = 0;
  g.effects = [];
  g.stock = [];
  g.hooks = g.players === 2 ? [makeHook(250,1),makeHook(550,-1)] : [makeHook(400,1)];
  fillMine(g);
}

export function createGame(players = 1, rng = Math.random) {
  const g = { players:players === 2 ? 2 : 1, random:rng, level:1, money:0, bombs:0,
    buffs:{}, purchases:{} };
  beginRound(g);
  return g;
}

export function fire(g, index = 0) {
  const hook = g.hooks[index];
  if (g.phase !== 'playing' || hook?.state !== 'aim') return false;
  hook.state = 'extend';
  return true;
}

function effect(g,type,x,y,text = '') {
  const life = type === 'cash' ? .95 : .44;
  g.effects.push({ type, x, y, text, life, maxLife:life });
}

function removeItem(g,item) {
  const index = g.items.indexOf(item);
  if (index >= 0) g.items.splice(index,1);
  if (item.claimedBy !== null) {
    g.hooks[item.claimedBy].item = null;
    item.claimedBy = null;
  }
}

function explode(g, barrel) {
  const pending = [barrel];
  removeItem(g,barrel);
  while (pending.length) {
    const center = pending.pop();
    effect(g,'blast',center.x,center.y);
    for (const item of [...g.items]) {
      if (Math.hypot(item.x-center.x,item.y-center.y) > 83 + item.r) continue;
      if (item.type === 'tnt') pending.push(item);
      removeItem(g,item);
    }
  }
}

export function dynamite(g, index = 0) {
  const h = g.hooks[index];
  if (g.phase !== 'playing' || !g.bombs || h?.state !== 'retract' || !h.item) return false;
  g.bombs--;
  effect(g,'blast',h.item.x,h.item.y);
  removeItem(g,h.item);
  return true;
}

function deliver(g,h) {
  const item = h.item;
  let reward = valueOf(item,g.buffs);
  let bonus = '';
  if (item.type === 'bag') {
    const roll = g.random();
    if (g.buffs.luck || roll < .68) reward = g.buffs.luck ? 400 + Math.floor(roll * 401) : 50 + Math.floor(g.random()*401);
    else if (roll < .86) { g.bombs++; bonus = '炸药 +1'; }
    else { g.buffs.strength = true; bonus = '力量提升'; }
  }
  g.money += reward;
  g.earned += reward;
  effect(g,'cash',h.x,h.y + 24,bonus || ('+$' + reward));
  removeItem(g,item);
}

function extend(g,h,index,dt) {
  const dx = Math.sin(h.angle), dy = Math.cos(h.angle);
  const side = Math.abs(dx) < 1e-8 ? Infinity : (dx > 0 ? WIDTH-h.x : -h.x) / dx;
  const limit = Math.min(side,(HEIGHT-h.y)/dy);
  let next = Math.min(limit,h.length + 418 * dt);
  let catchItem = null;
  // Intersect the swept tip segment with each free item's circle, taking the
  // first hit in rope order instead of the order of items in the level.
  for (const item of g.items) {
    if (item.claimedBy !== null) continue;
    const ox = item.x - h.x, oy = item.y - h.y;
    const along = ox * dx + oy * dy;
    const cross = ox * dy - oy * dx;
    const reach = (item.r + 3) ** 2 - cross ** 2;
    if (reach < 0) continue;
    const offset = Math.sqrt(reach);
    const hit = Math.max(h.length,along-offset);
    if (along + offset < h.length || hit > next) continue;
    next = hit;
    catchItem = item;
  }
  h.length = next;
  updateTip(h);
  if (catchItem) {
    h.state = 'retract';
    if (catchItem.type === 'tnt') explode(g,catchItem);
    else {
      catchItem.claimedBy = index;
      h.item = catchItem;
      effect(g,'spark',h.tipX,h.tipY);
    }
  } else if (next >= limit) h.state = 'retract';
}

function moveHook(g,h,i,dt) {
  if (h.state === 'extend') { extend(g,h,i,dt); return; }
  if (h.state === 'aim') {
    h.angle += h.direction * dt * 1.15;
    if (Math.abs(h.angle) >= SWING) {
      h.angle = Math.sign(h.angle) * SWING;
      h.direction = -Math.sign(h.angle);
    }
  } else {
    const speed = h.item ? h.item.speed * (g.buffs.strength ? 1.75 : 1) : 498;
    h.length = Math.max(REST,h.length - speed * dt);
    if (h.length <= REST) {
      if (h.item) deliver(g,h);
      h.state = 'aim';
    }
  }
  updateTip(h);
  if (h.item) {
    h.item.x = h.tipX;
    h.item.y = h.tipY + h.item.r * .45;
  }
}

function tick(g,dt) {
  for (const fx of g.effects) fx.life -= dt;
  g.effects = g.effects.filter(fx => fx.life > 0);
  for (const item of g.items) {
    if (item.type !== 'mole' || item.claimedBy !== null) continue;
    const left = Math.max(item.r,item.homeX-38);
    const right = Math.min(WIDTH-item.r,item.homeX+38);
    item.x += dt * 34 * item.face;
    if (item.x <= left || item.x >= right) {
      item.x = Math.max(left,Math.min(right,item.x));
      item.face *= -1;
    }
  }
  g.hooks.forEach((h,i) => moveHook(g,h,i,dt));
  g.elapsed += dt;
  g.timeLeft = Math.max(0,g.timeLeft-dt);
  if (g.timeLeft < 1e-8 || !g.items.length) {
    if (g.timeLeft < 1e-8) g.timeLeft = 0;
    g.phase = g.money >= g.target ? 'cleared' : 'lost';
  }
}

export function step(g,seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  let remaining = Math.min(seconds,g.timeLeft);
  while (g.phase === 'playing' && remaining > 1e-10) {
    const dt = Math.min(remaining,1/60);
    tick(g,dt);
    remaining -= dt;
  }
}

export function enterShop(g) {
  if (g.phase !== 'cleared') return false;
  g.phase = 'shop';
  g.stock = SHOP.map(([id,name,description,base]) => ({
    id,name,description,
    price:5 * Math.round(base * (.80 + g.random() * .55) / 5), sold:false
  }));
  return true;
}

export function buy(g,id) {
  if (g.phase !== 'shop') return false;
  const item = g.stock.find(product => product.id === id);
  if (!item || item.sold || g.money < item.price) return false;
  g.money -= item.price;
  item.sold = true;
  if (id === 'bomb') g.bombs++;
  else g.purchases[id] = true;
  return true;
}

export function nextLevel(g) {
  if (g.phase !== 'shop') return false;
  g.level++;
  g.buffs = g.purchases;
  g.purchases = {};
  beginRound(g);
  return true;
}
