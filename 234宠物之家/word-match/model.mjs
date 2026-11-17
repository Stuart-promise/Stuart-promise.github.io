// Two-player word matching. Salted commitments keep either answer private until
// both players have locked a word; the relay only transports these packets.
const VERSION = 1;
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Cs}]/u;
const HISTORY_LIMIT = 200;
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
function randomId(){
  const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const value=hex(bytes);return [value.slice(0,8),value.slice(8,12),value.slice(12,16),value.slice(16,20),value.slice(20)].join('-');
}

function cleanText(raw, maximum, label) {
  if (typeof raw !== 'string' || INVISIBLE.test(raw)) throw Error(label + '不能包含不可见字符或换行。');
  const value = raw.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(value).length;
  if (!length || length > maximum) throw Error(label + '请输入 1–' + maximum + ' 个字。');
  return value;
}

export function normalizeWord(raw) {
  const word = cleanText(raw, 20, '词语');
  return {word, key: word.toLowerCase()};
}

export function normalizeName(raw) {
  return cleanText(raw, 16, '昵称');
}

async function commitment(gameId, round, key, nonce) {
  const encoded = new TextEncoder().encode(JSON.stringify([gameId, round, key, nonce]));
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', encoded)));
}

function frozenSnapshot(value) {
  Object.freeze(value.names);
  if (value.words) Object.freeze(value.words);
  for (const row of value.history) { Object.freeze(row.words); Object.freeze(row); }
  Object.freeze(value.history);
  return Object.freeze(value);
}

export class WordMatchSession {
  constructor({role, name, send, onChange = () => {}, onError = () => {}}) {
    if (!['host', 'guest'].includes(role) || typeof send !== 'function') throw Error('房间设置不正确。');
    if (!globalThis.crypto?.subtle || typeof globalThis.crypto?.getRandomValues !== 'function') throw Error('当前浏览器不能安全开启游戏，请使用 HTTPS 网页或更新浏览器。');
    this.seat = role === 'host' ? 0 : 1;
    this._sendPacket = send;
    this._onChange = onChange;
    this._onError = onError;
    this._names = ['', ''];
    this._names[this.seat] = normalizeName(name || (this.seat === 0 ? '玩家一' : '玩家二'));
    this._peerKnown = false;
    this._started = false;
    this._gameId = null;
    this._round = 1;
    this._phase = 'connecting';
    this._closed = false;
    this._working = false;
    this._epoch = 0;
    this._history = [];
    this._retired = new Set();
    this._queue = Promise.resolve();
    this._queued = 0;
    this._resetRoundData();
  }

  _resetRoundData() {
    this._commits = [null, null];
    this._reveals = [null, null];
    this._ready = [false, false];
    this._localSecret = null;
    this._myWord = '';
    this._words = null;
    this._revealSent = false;
    this._working = false;
  }

  snapshot() {
    let phase = this._phase;
    if (phase === 'writing') {
      if (this._commits.every(Boolean)) phase = 'revealing';
      else if (this._commits[this.seat]) phase = 'waiting';
    }
    return frozenSnapshot({
      phase, round: this._round, gameId: this._gameId, seat: this.seat,
      names: this._names.map(name => name || '好友'),
      mineSubmitted: !!this._commits[this.seat], theirSubmitted: !!this._commits[1 - this.seat],
      myWord: this._myWord, words: this._words?.slice() || null,
      history: this._history.map(row => ({round: row.round, words: row.words.slice(), matched: row.matched})),
      mineReady: this._ready[this.seat], theirReady: this._ready[1 - this.seat],
      canSubmit: !this._closed && this._phase === 'writing' && !this._working && !this._commits[this.seat],
      busy: this._working
    });
  }

  _notify() { this._onChange(this.snapshot()); }

  _send(event, data = {}) {
    if (this._closed) return false;
    try {
      const result = this._sendPacket({type: 'wordmatch', version: VERSION, event, ...data});
      if (result === false) throw Error('连接已断开，请重新邀请好友。');
      if (result?.catch) result.catch(error => this._fail(error));
      return true;
    } catch (error) { this._fail(error); return false; }
  }

  _fail(error) {
    if (this._closed) return;
    this.close();
    this._onError(error instanceof Error ? error : Error('连接发生异常，请重新邀请好友。'));
  }

  start() {
    if (this._started || this._closed) return;
    this._started = true;
    if (this.seat === 0) {
      this._gameId = randomId();
      this._send('welcome', {gameId: this._gameId, name: this._names[0]});
      this._beginIfReady();
    } else this._send('hello', {name: this._names[1]});
    this._notify();
  }

  _beginIfReady() {
    if (this.seat !== 0 || !this._started || !this._peerKnown || this._phase !== 'connecting' || this._closed) return;
    this._phase = 'writing';
    this._send('begin', {gameId: this._gameId, round: 1, names: this._names.slice()});
    this._notify();
  }

  handle(packet) {
    if (this._closed) return Promise.resolve(false);
    if (++this._queued > 64) { this._queued--; this._fail(Error('收到的消息过于频繁，请重新创建房间。')); return Promise.resolve(false); }
    this._queue = this._queue.then(() => this._closed ? false : this._receive(packet))
      .catch(error => { this._fail(error); return false; })
      .finally(() => { this._queued--; });
    return this._queue;
  }

  async _receive(packet) {
    if (!packet || typeof packet !== 'object' || Array.isArray(packet) || packet.type !== 'wordmatch' || packet.version !== VERSION) throw Error('双方游戏版本不同，请刷新后重新创建房间。');
    if (packet.event === 'hello') {
      if (this.seat !== 0) throw Error('房间身份不一致，请重新创建房间。');
      const name = normalizeName(packet.name);
      if (name !== packet.name || (this._peerKnown && name !== this._names[1])) throw Error('好友昵称在游戏中发生变化，请重新加入。');
      this._names[1] = name; this._peerKnown = true;
      this._beginIfReady(); this._notify(); return true;
    }
    if (packet.event === 'welcome') {
      if (this.seat !== 1 || typeof packet.gameId !== 'string' || !UUID.test(packet.gameId)) throw Error('房间信息不正确，请重新加入。');
      if (this._retired.has(packet.gameId)) return false;
      const name = normalizeName(packet.name);
      if (name !== packet.name || (this._gameId && (this._gameId !== packet.gameId || this._names[0] !== name))) throw Error('房间信息已变化，请重新加入。');
      this._gameId = packet.gameId; this._names[0] = name; this._peerKnown = true; this._notify(); return true;
    }
    if (typeof packet.gameId !== 'string' || !UUID.test(packet.gameId) || !positiveInteger(packet.round)) throw Error('收到的回合信息不正确。');
    if (this._retired.has(packet.gameId)) return false;
    if (packet.gameId !== this._gameId) throw Error('收到其他对局的消息，请重新创建房间。');
    if (packet.event === 'begin') {
      if (this.seat !== 1 || packet.round !== 1 || !this._started || !this._peerKnown || !Array.isArray(packet.names) || packet.names.length !== 2 || packet.names.some((name, seat) => name !== this._names[seat])) throw Error('双方尚未正确加入，请重新邀请好友。');
      if (this._phase !== 'connecting') return false;
      this._phase = 'writing'; this._notify(); return true;
    }
    if (packet.event === 'advance') return this._advance(packet);
    if (packet.event === 'restart') return this._restart(packet);
    if (!['commit', 'reveal', 'ready'].includes(packet.event)) throw Error('收到无法识别的游戏消息。');
    if (packet.round < this._round) return false;
    if (packet.round !== this._round || this._phase === 'connecting') throw Error('双方回合不同步，请重新创建房间。');
    const other = 1 - this.seat;
    if (packet.event === 'commit') {
      if (typeof packet.hash !== 'string' || !HASH.test(packet.hash)) throw Error('好友提交的答案信息不完整。');
      if (this._commits[other]) {
        if (this._commits[other] !== packet.hash) throw Error('已锁定的答案发生变化，本局已暂停。');
        return false;
      }
      if (this._phase !== 'writing') throw Error('本轮已经结束，无法重新提交。');
      this._commits[other] = packet.hash; this._notify(); this._maybeReveal(); return true;
    }
    if (packet.event === 'reveal') {
      if (!this._commits.every(Boolean)) throw Error('答案在双方提交前提前揭晓，本局已暂停。');
      const normalized = normalizeWord(packet.word);
      if (normalized.word !== packet.word || typeof packet.nonce !== 'string' || !HASH.test(packet.nonce)) throw Error('好友答案格式不正确。');
      const prior = this._reveals[other];
      if (prior) {
        if (prior.word !== packet.word || prior.nonce !== packet.nonce) throw Error('已揭晓的答案发生变化，本局已暂停。');
        return false;
      }
      const epoch = this._epoch;
      const hash = await commitment(this._gameId, this._round, normalized.key, packet.nonce);
      if (this._closed || epoch !== this._epoch) return false;
      if (hash !== this._commits[other]) throw Error('答案与提交时不一致，本局已暂停，请重新邀请好友。');
      this._reveals[other] = {...normalized, nonce: packet.nonce}; this._finishRound(); return true;
    }
    const expected = this._phase === 'result' ? 'next' : this._phase === 'won' ? 'again' : null;
    if (!expected || packet.kind !== expected) throw Error('好友的下一轮请求与当前对局不同步。');
    this._ready[other] = true; this._notify(); this._maybeAdvance(); return true;
  }

  async submit(raw) {
    if (!this.snapshot().canSubmit) throw Error('本轮已经提交，或好友尚未就位。');
    const normalized = normalizeWord(raw);
    const nonce = hex(crypto.getRandomValues(new Uint8Array(32)));
    const epoch = this._epoch;
    this._working = true; this._notify();
    try {
      const hash = await commitment(this._gameId, this._round, normalized.key, nonce);
      if (this._closed || epoch !== this._epoch) return false;
      this._localSecret = {...normalized, nonce}; this._myWord = normalized.word;
      this._commits[this.seat] = hash; this._working = false;
      this._send('commit', {gameId: this._gameId, round: this._round, hash});
      this._notify(); this._maybeReveal(); return !this._closed;
    } catch (error) { this._working = false; this._fail(error); return false; }
  }

  _maybeReveal() {
    if (this._closed || !this._commits.every(Boolean) || !this._localSecret || this._revealSent) return;
    this._revealSent = true;
    this._reveals[this.seat] = {...this._localSecret};
    this._send('reveal', {gameId: this._gameId, round: this._round, word: this._localSecret.word, nonce: this._localSecret.nonce});
    this._finishRound();
  }

  _finishRound() {
    if (this._closed || this._phase !== 'writing' || !this._reveals.every(Boolean)) return;
    const matched = this._reveals[0].key === this._reveals[1].key;
    this._words = this._reveals.map(value => value.word);
    this._history.push({round: this._round, words: this._words.slice(), matched});
    if (this._history.length > HISTORY_LIMIT) this._history.shift();
    this._localSecret = null;
    this._phase = matched ? 'won' : 'result';
    this._notify();
  }

  next() { return this._vote('result', 'next'); }
  again() { return this._vote('won', 'again'); }

  _vote(phase, kind) {
    if (this._closed || this._phase !== phase || this._ready[this.seat]) return false;
    this._ready[this.seat] = true;
    this._send('ready', {gameId: this._gameId, round: this._round, kind});
    this._notify(); this._maybeAdvance(); return !this._closed;
  }

  _newRound(round) {
    this._epoch++; this._round = round; this._resetRoundData(); this._phase = 'writing';
  }

  _retireCurrent() {
    this._retired.add(this._gameId);
    if (this._retired.size > 16) this._retired.delete(this._retired.values().next().value);
  }

  _maybeAdvance() {
    if (this._closed || this.seat !== 0 || !this._ready.every(Boolean)) return;
    if (this._phase === 'result') {
      const fromRound = this._round;
      if (!positiveInteger(fromRound + 1)) { this._fail(Error('回合数量已达到浏览器上限，请重新开局。')); return; }
      this._newRound(fromRound + 1);
      this._send('advance', {gameId: this._gameId, fromRound, round: this._round});
      this._notify();
    } else if (this._phase === 'won') {
      const gameId = this._gameId, round = this._round, newGameId = randomId();
      this._retireCurrent(); this._gameId = newGameId; this._history = []; this._newRound(1);
      this._send('restart', {gameId, round, newGameId});
      this._notify();
    }
  }

  _advance(packet) {
    if (this.seat !== 1 || !positiveInteger(packet.fromRound) || packet.round !== packet.fromRound + 1) throw Error('下一轮信息不正确。');
    if (packet.round <= this._round) return false;
    if (packet.fromRound !== this._round || this._phase !== 'result' || !this._ready.every(Boolean)) throw Error('双方尚未准备好进入下一轮。');
    this._newRound(packet.round); this._notify(); return true;
  }

  _restart(packet) {
    if (this.seat !== 1 || packet.round !== this._round || this._phase !== 'won' || !this._ready.every(Boolean) || typeof packet.newGameId !== 'string' || !UUID.test(packet.newGameId) || packet.newGameId === this._gameId || this._retired.has(packet.newGameId)) throw Error('双方尚未同意重新开局。');
    this._retireCurrent(); this._gameId = packet.newGameId; this._history = []; this._newRound(1); this._notify(); return true;
  }

  close() {
    if (this._closed) return;
    this._closed = true; this._epoch++; this._working = false; this._phase = 'closed';
    this._localSecret = null; this._notify();
  }
}
