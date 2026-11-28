const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
const DECK_SIZE = 104;
const COLUMN_COUNT = 10;

function suitOf(id, suits) {
  return SUITS[Math.floor(id / 13) % suits];
}

export function cardFromId(id, suits, up = false) {
  return { id, rank: id % 13 + 1, suit: suitOf(id, suits), up };
}

export function newGame(suits = 1, random = Math.random) {
  if (![1, 2, 4].includes(suits)) throw new RangeError('Expected one, two, or four suits');
  const stock = Array.from({ length: DECK_SIZE }, (_, id) => cardFromId(id, suits));
  for (let i = stock.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [stock[i], stock[j]] = [stock[j], stock[i]];
  }
  const columns = Array.from({ length: COLUMN_COUNT }, () => []);
  for (let i = 0; i < 54; i++) columns[i % COLUMN_COUNT].push(stock.pop());
  for (const cards of columns) cards[cards.length - 1].up = true;
  return { version: 1, suits, columns, stock, completed: [], moves: 0 };
}

// A saved board contains every physical card exactly once, except cards belonging
// to collected runs. At each rank the missing count per suit must match those runs.
export function isValidBoard(board) {
  if (!board || board.version !== 1 || ![1, 2, 4].includes(board.suits)
      || !Number.isSafeInteger(board.moves) || board.moves < 0
      || !Array.isArray(board.columns) || board.columns.length !== COLUMN_COUNT
      || !Array.isArray(board.stock) || board.stock.length > 50 || board.stock.length % 10 !== 0
      || !Array.isArray(board.completed) || board.completed.length > 8) return false;
  const remaining = SUITS.slice(0, board.suits).map(() => Array(13).fill(8 / board.suits));
  for (const suit of board.completed) {
    const counts = remaining[SUITS.indexOf(suit)];
    if (!counts || counts[0] === 0) return false;
    for (let rank = 0; rank < 13; rank++) counts[rank]--;
  }
  const seen = new Set();
  function record(card) {
    if (!card || !Number.isInteger(card.id) || card.id < 0 || card.id >= DECK_SIZE
        || seen.has(card.id) || card.rank !== card.id % 13 + 1
        || card.suit !== suitOf(card.id, board.suits) || typeof card.up !== 'boolean') return false;
    seen.add(card.id);
    return --remaining[SUITS.indexOf(card.suit)][card.rank - 1] >= 0;
  }
  for (const card of board.stock) if (!record(card) || card.up) return false;
  for (const column of board.columns) {
    if (!Array.isArray(column) || column.length > DECK_SIZE) return false;
    let visible = false;
    for (const card of column) {
      if (!record(card) || (visible && !card.up)) return false;
      visible = card.up;
    }
    if (column.length && !visible) return false;
  }
  return seen.size + 13 * board.completed.length === DECK_SIZE;
}

export function isWon(board) { return board.completed.length === 8; }

function orderedPair(lower, upper) {
  return lower.up && upper.up && lower.suit === upper.suit && lower.rank === upper.rank + 1;
}

export function canPick(board, col, row) {
  if (!Number.isInteger(col) || !Number.isInteger(row) || isWon(board)) return false;
  const cards = board.columns[col];
  if (!cards || !cards[row]?.up) return false;
  for (let i = row + 1; i < cards.length; i++) {
    if (!orderedPair(cards[i - 1], cards[i])) return false;
  }
  return true;
}

export function canMove(board, from, row, to) {
  if (from === to || !Number.isInteger(to) || !canPick(board, from, row)) return false;
  const dest = board.columns[to];
  return !!dest && (!dest.length || dest[dest.length - 1].rank === board.columns[from][row].rank + 1);
}

export function canDeal(board) {
  return board.stock.length >= COLUMN_COUNT && board.columns.every(column => column.length > 0);
}

function orderedTail(cards) {
  let i = cards.length - 1;
  while (i > 0 && orderedPair(cards[i - 1], cards[i])) i--;
  return cards.length ? cards.length - i : 0;
}

// Only called with newly created column and completed arrays. Existing snapshots
// can therefore be restored directly for undo, including formerly face-down cards.
function settle(cards, completed) {
  while (cards.length) {
    const last = cards.length - 1;
    if (!cards[last].up) cards[last] = { ...cards[last], up: true };
    if (cards[last].rank !== 1 || orderedTail(cards) !== 13) return;
    completed.push(cards[last].suit);
    cards.length -= 13;
  }
}

export function move(board, from, row, to) {
  if (!canMove(board, from, row, to)) return null;
  const columns = board.columns.slice();
  const source = board.columns[from];
  columns[from] = source.slice(0, row);
  columns[to] = board.columns[to].concat(source.slice(row));
  const completed = board.completed.slice();
  settle(columns[from], completed);
  settle(columns[to], completed);
  return { ...board, columns, completed, moves: board.moves + 1 };
}

export function deal(board) {
  if (!canDeal(board)) return null;
  const stock = board.stock.slice();
  const completed = board.completed.slice();
  const columns = board.columns.map(column => {
    const next = column.concat({ ...stock.pop(), up: true });
    settle(next, completed);
    return next;
  });
  return { ...board, columns, stock, completed, moves: board.moves + 1 };
}

// Rank legal choices using only revealed cards. Do not suggest exchanging a
// whole column with an empty one: it produces exactly the same position.
export function findHint(board) {
  if (isWon(board)) return null;
  let best = null, bestScore = -Infinity;
  for (const [from, source] of board.columns.entries()) {
    for (let row = source.length - 1; row >= 0 && canPick(board, from, row); row--) {
      const first = source[row], below = source[row - 1];
      for (const [to, dest] of board.columns.entries()) {
        if (!canMove(board, from, row, to) || (!row && !dest.length)) continue;
        const top = dest[dest.length - 1];
        let score = 0;
        if (below && !below.up) score += 30;
        if (!below) score += 12;
        if (below && orderedPair(below, first)) score -= 18;
        if (top && top.suit === first.suit) {
          score += 18;
          if (orderedTail(dest) + source.length - row === 13) score += 100;
        }
        if (score > bestScore) {
          bestScore = score;
          best = { type: 'move', from, row, to };
        }
      }
    }
  }
  if (bestScore <= 0 && canDeal(board)) return { type: 'deal' };
  return best;
}
