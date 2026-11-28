import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileFunction} from 'node:vm';
import test from 'node:test';

// The same classic script runs on the game page and in its generation worker.
const source=readFileSync(new URL('./mines-engine.js',import.meta.url),'utf8');
const testMath=Object.create(Math);
let seed=8631;
testMath.random=()=>{
  seed=(Math.imul(seed,1103515245)+12345)>>>0;
  return seed/4294967296;
};
const {Minesweeper,canDeduceBoard}=compileFunction(
  source+'\nreturn {Minesweeper,canDeduceBoard};',['Math']
)(testMath);

// Independent player: only inspect numbers already revealed by the normal game.
function playToWin(game,first) {
  game.reveal(first);
  while (game.status==='playing') {
    const hidden=[], clues=[];
    for (const [i,cell] of game.cells.entries()) {
      if (!cell.open) {
        if (!cell.flag) hidden.push(i);
        continue;
      }
      const neighbors=game.neighbors(i);
      const cells=neighbors.filter(n=>!game.cells[n].open && !game.cells[n].flag);
      if (cells.length) clues.push({cells,mines:cell.count-neighbors.filter(n=>game.cells[n].flag).length});
    }
    const moves=new Map();
    function forced(cells,mines) {
      if (mines!==0 && mines!==cells.length) return;
      for (const i of cells) moves.set(i,mines>0);
    }
    forced(hidden,game.mines-game.flags);
    for (const clue of clues) forced(clue.cells,clue.mines);
    if (!moves.size) {
      for (const a of clues) for (const b of clues) {
        if (a.cells.length<=b.cells.length || !b.cells.every(i=>a.cells.includes(i))) continue;
        forced(a.cells.filter(i=>!b.cells.includes(i)),a.mines-b.mines);
      }
    }
    assert(moves.size,`No logical move for ${game.level}, first ${first}`);
    for (const [i,mine] of moves) {
      if (mine) game.flag(i);
      else game.reveal(i);
    }
  }
  assert.equal(game.status,'won');
}

function checkLayout(game,first) {
  assert.equal(game.cells.filter(cell=>cell.mine).length,game.mines);
  assert([first,...game.neighbors(first)].every(i=>!game.cells[i].mine));
  playToWin(game,first);
}

test('reject either arrangement of a final 50/50 pair',()=>{
  // 2 x 3: first click at 0 opens the four cells on the left. Both remaining
  // cells border exactly the same visible ones, and exactly one is a mine.
  const adjacent=[[1,3,4],[0,2,3,4,5],[1,4,5],[0,1,4],[0,1,2,3,5],[1,2,4]];
  for (const mine of [2,5]) {
    const clues=adjacent.map(neighbors=>Number(neighbors.includes(mine)));
    assert.equal(canDeduceBoard(0,clues,adjacent,1),false);
  }
});

for (const level of ['easy','medium','hard']) {
  test(level+' reserve covers every first click',()=>{
    const size=new Minesweeper(level).cells.length;
    for (let first=0;first<size;first++) {
      const game=new Minesweeper(level);
      game.installMines(game.reserveLayout(first));
      checkLayout(game,first);
    }
  });
  test(level+' randomized games replay from visible clues',()=>{
    for (let sample=0;sample<24;sample++) {
      const game=new Minesweeper(level);
      const first=Math.floor(testMath.random()*game.cells.length);
      game.seed(first);
      checkLayout(game,first);
    }
  });
}

test('flags placed before the first reveal survive generation',()=>{
  const game=new Minesweeper('hard');
  game.flag(0);
  game.reveal(0);
  assert.equal(game.started,false);
  game.reveal(1);
  assert(game.started && game.cells[0].flag && !game.cells[0].open);
});
