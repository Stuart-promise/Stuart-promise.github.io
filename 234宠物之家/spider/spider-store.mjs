import { cardFromId, isValidBoard } from './engine.mjs';

const moduleName = 'spider';
const saveKey = 'pet234-spider-v1';
const historyLimit = 50;
const labels = {
  guest: '游客 · 本机存档', checking: '正在读取云存档', synced: '云端已同步',
  pending: '已存本机 · 等待同步', offline: '离线 · 本机存档',
  conflict: '存档有冲突，请到账号中心选择版本', expired: '请刷新并重新登录',
  'storage-error': '设备存储空间不足'
};

// Card identity determines rank and suit. Signed IDs keep fifty undo positions
// small enough for the account service's upload when the page is closed.
function packBoard(board) {
  const packPile = pile => pile.map(card => (card.up ? 1 : -1) * (card.id + 1));
  return { ...board, columns: board.columns.map(packPile), stock: packPile(board.stock) };
}

function unpackBoard(board) {
  if (isValidBoard(board)) return board;
  if (!board || !Array.isArray(board.columns) || !Array.isArray(board.stock)) return null;
  const unpackPile = pile => pile.map(code => Number.isInteger(code)
    ? cardFromId(Math.abs(code) - 1, board.suits, code > 0) : null);
  try {
    const restored = { ...board, columns: board.columns.map(unpackPile), stock: unpackPile(board.stock) };
    return isValidBoard(restored) ? restored : null;
  } catch {
    return null;
  }
}

function parse(raw) {
  if (!raw) return null;
  const payload = JSON.parse(raw);
  if (payload?.version !== 1 || !isValidBoard(payload.board)) throw Error('牌局存档无法读取');
  const history = Array.isArray(payload.undo) ? payload.undo.slice(-historyLimit) : [];
  const undo = [];
  for (const entry of history) {
    const board = unpackBoard(entry);
    if (board && board.suits === payload.board.suits) undo.push(board);
    else undo.length = 0;
  }
  return { version: 1, board: payload.board, undo };
}

export function createStore({ onRestore, onStatus }) {
  const account = window.PetAccount;
  let storage, observed, issue = '';
  const paint = () => onStatus(issue || labels[account?.syncState(moduleName)] || '本局暂存在此页面');
  function refresh() {
    if (!storage) return;
    try {
      const raw = storage.getItem(saveKey);
      if (raw !== observed) {
        const next = parse(raw);
        observed = raw;
        issue = '';
        onRestore(next);
      }
    } catch {
      issue = '无法读取其他页面的存档';
    }
    paint();
  }
  window.addEventListener('pet-account-data', event => {
    if (event.detail === 'pet234:account:v1:' + account?.owner + ':' + moduleName) refresh();
  });
  window.addEventListener('storage', event => {
    if (account?.owner === 'guest' && (event.key === saveKey || event.key === null)) refresh();
  });
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  window.addEventListener('pet-account-session', () => location.reload());
  window.addEventListener('pet-account-status', paint);
  window.addEventListener('pagehide', () => account?.flushBeforeExit(moduleName));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) account?.flushBeforeExit(moduleName);
  });
  return {
    async load() {
      try {
        storage = await account.open(moduleName);
        observed = storage.getItem(saveKey);
        const initial = parse(observed);
        paint();
        return initial;
      } catch {
        storage = null;
        issue = '存档不可用 · 本局仅在此页面保留';
        paint();
        return null;
      }
    },
    save(payload) {
      if (!storage) return false;
      try {
        if (storage.getItem(saveKey) !== observed) { refresh(); return false; }
        const undo = payload.undo.slice(-historyLimit).map(packBoard);
        const raw = JSON.stringify({ version: 1, board: payload.board, undo });
        storage.setItem(saveKey, raw);
        observed = raw;
        issue = '';
        paint();
        return true;
      } catch {
        issue = '保存失败，请检查设备空间或账号状态';
        paint();
        return false;
      }
    }
  };
}
