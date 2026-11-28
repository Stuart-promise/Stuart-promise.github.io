import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, isValidBoard, isWon, canPick, canMove, canDeal, move, deal, findHint } from './engine.mjs';

const suits = ['spades', 'hearts', 'clubs', 'diamonds'];
function card(id, count = 1, up = true) {
  return { id, rank: id % 13 + 1, suit: suits[Math.floor(id / 13) % count], up };
}
function position(count, piles, stock = [], completed = []) {
  const columns = Array.from({ length: 10 }, (_, i) => piles[i] ?? []);
  return { version: 1, suits: count, columns, stock, completed, moves: 0 };
}
function range(start, stop) {
  return Array.from({ length: stop - start }, (_, i) => start + i);
}
function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('all three difficulties deal 104 unique cards with standard column sizes', () => {
  for (const count of [1, 2, 4]) {
    const b = newGame(count, seeded(17));
    assert(isValidBoard(b));
    assert.deepEqual(b.columns.map(c => c.length), [6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    assert.equal(b.stock.length, 50);
    const cards = b.stock.concat(...b.columns);
    assert.equal(new Set(cards.map(c => c.id)).size, 104);
    assert.equal(new Set(cards.map(c => c.suit)).size, count);
    assert.equal(cards.filter(c => c.up).length, 10);
    for (const suit of suits.slice(0, count)) for (const rank of range(1, 14)) {
      assert.equal(cards.filter(c => c.suit === suit && c.rank === rank).length, 8 / count);
    }
    assert.deepEqual(b, newGame(count, seeded(17)));
    assert.notDeepEqual(b.columns, newGame(count, seeded(18)).columns);
  }
});

test('mixed suits may stack, but only an exposed descending same-suit tail may travel together', () => {
  // Hearts 9, spades 8, spades 7; hearts 9 destination.
  const b = position(2, [[card(21, 2), card(7, 2), card(6, 2)], [card(47, 2)]]);
  assert(!canPick(b, 0, 0));
  assert(canPick(b, 0, 1));
  assert(canMove(b, 0, 1, 1));
  const next = move(b, 0, 1, 1);
  assert.deepEqual(next.columns[1].map(c => c.rank), [9, 8, 7]);
  assert.equal(next.moves, 1);
  assert(!canPick(next, 1, 0));
  assert(canMove(next, 1, 1, 3));
  assert.equal(move(next, 1, 2, 0), null);
  assert.equal(move(next, 1, 1, 1), null);
  assert.equal(move(next, 1, -1, 0), null);
  assert.equal(move(next, 1, 2, 22), null);
  assert.equal(deal(next), null);
});

test('taking the exposed card flips its predecessor, undo restores it face down', () => {
  const b = newGame(4, seeded(2));
  // Preserve the whole deck, leaving the last column empty to receive any card.
  b.columns[7] = [...b.columns[7], ...b.columns[9].map(c => ({ ...c, up: true }))];
  b.columns[9] = [];
  assert(isValidBoard(b));
  const before = JSON.stringify(b);
  const row = b.columns[0].length - 1;
  const next = move(b, 0, row, 9);
  assert(next.columns[0][row - 1].up);
  assert.equal(b.columns[0][row - 1].up, false);
  assert.equal(JSON.stringify(b), before);
  assert(isValidBoard(next));
});

test('five stock rows are dealt from left to right, with a restorable snapshot of each', () => {
  let b = newGame(4, seeded(123));
  const snapshots = [];
  for (let round = 0; round < 5; round++) {
    snapshots.push(JSON.stringify(b));
    assert(canDeal(b));
    const next = deal(b);
    for (const [i, column] of next.columns.entries()) {
      assert.deepEqual(column.at(-1), { ...b.stock.at(-1 - i), up: true });
    }
    assert.equal(next.moves, round + 1);
    assert.equal(next.stock.length, 40 - 10 * round);
    assert.equal(JSON.stringify(b), snapshots[round]);
    assert(isValidBoard(next));
    b = next;
  }
  assert.equal(deal(b), null);
  assert.equal(JSON.parse(snapshots.pop()).stock.length, 10);
});

test('collecting two consecutive runs wins; undo restores both complete decks by identity', () => {
  const b = position(1, [
    [...range(0, 13).reverse(), ...range(14, 26).reverse()].map(i => card(i)),
    [card(13)]
  ], [], Array(6).fill('spades'));
  assert(isValidBoard(b));
  const before = JSON.stringify(b);
  const hint = findHint(b);
  assert.deepEqual(hint, { type: 'move', from: 1, row: 0, to: 0 });
  const won = move(b, hint.from, hint.row, hint.to);
  assert(isWon(won));
  assert.equal(won.moves, 1);
  assert(isValidBoard(JSON.parse(JSON.stringify(won))));
  assert(won.columns.every(c => !c.length));
  assert.equal(findHint(won), null);
  assert.equal(JSON.stringify(b), before);
});

test('a stock row can collect a run and uncover a face-down card without changing the undo state', () => {
  const b = newGame(1, seeded(8));
  const first = [26, ...range(1, 13).reverse()].map(i => card(i, 1, i !== 26));
  b.columns = [first, ...range(13, 22).map(i => [card(i)])];
  b.stock = [...range(22, 26), ...range(27, 32), 0].map(i => card(i, 1, false));
  // Fill the second column with the remaining cards beneath its visible top.
  b.columns[1].unshift(...range(32, 104).map(i => card(i, 1, false)));
  assert(isValidBoard(b));
  const before = JSON.stringify(b);
  const next = deal(b);
  assert.deepEqual(next.completed, ['spades']);
  assert.deepEqual(next.columns[0], [card(26)]);
  assert(isValidBoard(next));
  assert.equal(JSON.stringify(b), before);
});

test('resume rejects duplicate ids, wrong card faces, broken counts and face-down tops', () => {
  const b = newGame(4, seeded(50));
  for (const mutate of [
    bad => { bad.stock[0] = bad.stock[1]; },
    bad => { bad.stock[0].rank = 18; },
    bad => { bad.stock[0].up = true; },
    bad => { bad.columns[0][0].up = true; },
    bad => { bad.columns[3].at(-1).up = false; },
    bad => { bad.columns.pop(); },
    bad => { bad.stock.pop(); },
    bad => { bad.completed.push('clubs'); },
    bad => { bad.moves = 1.5; }
  ]) {
    const bad = structuredClone(b);
    mutate(bad);
    assert.equal(isValidBoard(bad), false);
  }
  assert.equal(isValidBoard(null), false);
  assert.equal(isValidBoard({}), false);
  assert(isValidBoard(JSON.parse(JSON.stringify(b))));
});

test('suggested plays and resulting saved games stay legal across difficulties', () => {
  for (const count of [1, 2, 4]) {
    for (let seed = 0; seed < 8; seed++) {
      let b = newGame(count, seeded(seed));
      for (let step = 0; step < 60; step++) {
        const hint = findHint(b);
        if (!hint) break;
        const next = hint.type === 'deal' ? deal(b) : move(b, hint.from, hint.row, hint.to);
        assert(next);
        assert(isValidBoard(next));
        assert.equal(next.moves, b.moves + 1);
        b = next;
      }
    }
  }
});
