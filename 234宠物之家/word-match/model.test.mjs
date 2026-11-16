import test from 'node:test';
import assert from 'node:assert/strict';
import {WordMatchSession, normalizeName, normalizeWord} from './model.mjs';

function pair({guestFirst = false} = {}) {
  const pending = [], sent = [], errors = [], changes = [];
  const players = [null, null];
  const make = seat => new WordMatchSession({
    role: seat === 0 ? 'host' : 'guest', name: seat === 0 ? '小林' : '小鹿',
    send(packet) {
      sent.push({seat, packet: structuredClone(packet), snapshot: players[seat].snapshot()});
      pending.push({seat: 1 - seat, packet: structuredClone(packet)});
    },
    onChange: snapshot => changes.push({seat, snapshot}),
    onError: error => errors.push({seat, error})
  });
  players[0] = make(0); players[1] = make(1);
  const [host, guest] = players;
  async function pump() {
    let count = 0;
    while (pending.length) {
      if (++count > 1000) throw Error('Protocol did not become idle');
      const item = pending.shift(); await players[item.seat].handle(item.packet);
    }
  }
  async function start() {
    if (guestFirst) { guest.start(); await pump(); host.start(); }
    else { host.start(); guest.start(); }
    await pump();
    assert.equal(host.snapshot().phase, 'writing'); assert.equal(guest.snapshot().phase, 'writing');
  }
  async function round(a, b) { await host.submit(a); await pump(); await guest.submit(b); await pump(); }
  return {host, guest, players, pending, sent, errors, changes, start, pump, round};
}

test('normalization ignores width, outside spaces and case but preserves distinct words', () => {
  assert.deepEqual(normalizeWord('　ＡpＰLe　'), {word: 'ApPLe', key: 'apple'});
  assert.equal(normalizeWord('冰　　淇淋').word, '冰 淇淋');
  assert.notEqual(normalizeWord('苹果汁').key, normalizeWord('苹果 汁').key);
  assert.equal(normalizeWord('🐾'.repeat(20)).word, '🐾'.repeat(20));
  for (const invalid of ['', '   ', '词'.repeat(21), 'a\u200bb', 'a\u202eb', 'a\nb', '\ud800', null, {}]) assert.throws(() => normalizeWord(invalid));
  assert.equal(normalizeName('　小鹿　'), '小鹿');
  assert.throws(() => normalizeName('名'.repeat(17)));
});

test('either opening order completes handshake once and snapshots cannot mutate state', async () => {
  for (const guestFirst of [false, true]) {
    const p = pair({guestFirst}); await p.start();
    const current = p.host.snapshot();
    assert.deepEqual(current.names, ['小林', '小鹿']);
    assert.equal(current.gameId, p.guest.snapshot().gameId);
    assert.throws(() => { current.names[0] = '改名'; });
    assert.throws(() => { current.round = 999; });
    p.host.start(); p.guest.start(); await p.pump();
    assert.equal(p.sent.filter(item => item.packet.event === 'begin').length, 1);
    assert.deepEqual(p.errors, []);
  }
});

test('first answer sends only salted hash; both words reveal only after both commitments', async () => {
  const p = pair(); await p.start();
  await p.host.submit('苹果'); await p.pump();
  assert.equal(p.host.snapshot().phase, 'waiting');
  assert.equal(p.guest.snapshot().theirSubmitted, true);
  assert.equal(p.guest.snapshot().myWord, '');
  assert.equal(p.guest.snapshot().words, null);
  assert.deepEqual(p.guest.snapshot().history, []);
  const committed = p.sent.filter(item => item.packet.event === 'commit');
  assert.equal(committed.length, 1);
  assert.match(committed[0].packet.hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(p.sent.map(item => item.packet)).includes('苹果'), false);
  await assert.rejects(p.host.submit('香蕉'));
  await p.guest.submit('橘子'); await p.pump();
  for (const item of p.sent.filter(item => item.packet.event === 'reveal')) {
    assert.equal(item.snapshot.mineSubmitted, true); assert.equal(item.snapshot.theirSubmitted, true);
    assert.match(item.packet.nonce, /^[a-f0-9]{64}$/);
  }
  for (const player of p.players) {
    const current = player.snapshot();
    assert.equal(current.phase, 'result'); assert.deepEqual(current.words, ['苹果', '橘子']);
    assert.equal(current.history.length, 1); assert.equal(current.history[0].matched, false);
  }
  assert.deepEqual(p.errors, []);
});

test('both next votes required; matching a later round finishes both clients', async () => {
  const p = pair(); await p.start(); await p.round('海洋', '天空');
  assert.equal(p.host.next(), true); await p.pump();
  assert.equal(p.host.snapshot().round, 1); assert.equal(p.guest.snapshot().theirReady, true);
  assert.equal(p.host.next(), false);
  assert.equal(p.guest.next(), true); await p.pump();
  for (const player of p.players) {
    assert.equal(player.snapshot().round, 2); assert.equal(player.snapshot().phase, 'writing');
    assert.equal(player.snapshot().words, null); assert.equal(player.snapshot().myWord, '');
  }
  await p.round('　Ｃloud　', 'cloud');
  for (const player of p.players) {
    assert.equal(player.snapshot().phase, 'won'); assert.equal(player.snapshot().round, 2);
    assert.equal(player.snapshot().history.at(-1).matched, true); assert.equal(player.next(), false);
    await assert.rejects(player.submit('新的词'));
  }
  assert.deepEqual(p.errors, []);
});

test('immediate match and mutual replay create a new session and discard old packets', async () => {
  const p = pair(); await p.start(); await p.round('月亮', '月亮');
  const oldId = p.host.snapshot().gameId;
  const oldCommit = p.sent.find(item => item.seat === 0 && item.packet.event === 'commit').packet;
  assert.equal(p.host.snapshot().phase, 'won');
  p.guest.again(); await p.pump(); assert.equal(p.host.snapshot().gameId, oldId);
  p.host.again(); await p.pump();
  assert.notEqual(p.host.snapshot().gameId, oldId);
  assert.equal(p.host.snapshot().gameId, p.guest.snapshot().gameId);
  assert.deepEqual(p.host.snapshot().history, []); assert.equal(p.host.snapshot().round, 1);
  await p.guest.handle(oldCommit);
  assert.equal(p.guest.snapshot().phase, 'writing');
  await p.round('太阳', '太阳'); assert.equal(p.guest.snapshot().phase, 'won');
  assert.deepEqual(p.errors, []);
});

test('duplicate commit/reveal/advance packets are harmless and old rounds never resubmit', async () => {
  const p = pair(); await p.start(); await p.round('树', '花');
  const guestPackets = p.sent.filter(item => item.seat === 1 && ['commit', 'reveal'].includes(item.packet.event));
  for (const item of guestPackets) await p.host.handle(item.packet);
  assert.equal(p.host.snapshot().history.length, 1);
  p.host.next(); p.guest.next(); await p.pump();
  const advance = p.sent.find(item => item.packet.event === 'advance').packet;
  await p.guest.handle(advance);
  for (const item of guestPackets) await p.host.handle(item.packet);
  assert.equal(p.host.snapshot().round, 2); assert.equal(p.host.snapshot().theirSubmitted, false);
  assert.deepEqual(p.errors, []);
});

test('early reveal, changed commitment, future round and unknown session are rejected', async () => {
  const variants = [
    gameId => ({event: 'reveal', gameId, round: 1, word: '提前看', nonce: 'a'.repeat(64)}),
    gameId => ({event: 'commit', gameId, round: 2, hash: 'a'.repeat(64)}),
    () => ({event: 'commit', gameId: crypto.randomUUID(), round: 1, hash: 'a'.repeat(64)}),
    gameId => ({event: 'advance', gameId, fromRound: 1, round: 2})
  ];
  for (const make of variants) {
    const p = pair(); await p.start();
    await p.host.handle({type: 'wordmatch', version: 1, ...make(p.host.snapshot().gameId)});
    assert.equal(p.host.snapshot().phase, 'closed'); assert.equal(p.errors.length, 1);
    assert.equal(p.host.snapshot().words, null); assert.equal(p.host.snapshot().history.length, 0);
  }
  const p = pair(); await p.start(); await p.guest.submit('花'); await p.pump();
  await p.host.handle({type: 'wordmatch', version: 1, event: 'commit', gameId: p.host.snapshot().gameId, round: 1, hash: '0'.repeat(64)});
  assert.equal(p.host.snapshot().phase, 'closed'); assert.equal(p.errors.length, 1);
});

test('a forged revealed word cannot change the committed answer or reveal results', async () => {
  const p = pair(); await p.start();
  await p.host.submit('苹果'); await p.pump(); await p.guest.submit('橘子');
  const reveal = p.pending.find(item => item.seat === 0 && item.packet.event === 'reveal');
  assert(reveal); reveal.packet.word = '苹果';
  await p.pump();
  assert.equal(p.host.snapshot().phase, 'closed');
  assert.equal(p.host.snapshot().words, null); assert.equal(p.host.snapshot().history.length, 0);
  assert.equal(p.errors.length, 1);
});

test('closing while a digest is pending never sends a late answer', async () => {
  const p = pair(); await p.start(); const before = p.sent.length;
  const submission = p.host.submit('苹果'); p.host.close(); await submission; await p.pump();
  assert.equal(p.sent.length, before); assert.equal(p.host.snapshot().phase, 'closed');
  assert.equal(p.host.snapshot().mineSubmitted, false); assert.deepEqual(p.errors, []);
});

test('disconnect retains revealed history and the transport failure closes safely', async () => {
  const p = pair(); await p.start(); await p.round('天空', '大海');
  p.host.close(); const current = p.host.snapshot();
  assert.equal(current.phase, 'closed'); assert.deepEqual(current.history[0].words, ['天空', '大海']);
  assert.equal(p.host.next(), false); await assert.rejects(p.host.submit('天海'));
  const errors = [];
  const broken = new WordMatchSession({role: 'host', name: '测试', send: () => false, onError: error => errors.push(error)});
  broken.start(); assert.equal(broken.snapshot().phase, 'closed'); assert.equal(errors.length, 1);
});

test('long play keeps a bounded history while preserving the real round count', async () => {
  const p = pair(); await p.start();
  for (let round = 1; round <= 205; round++) {
    await p.round('甲' + round, '乙' + round);
    p.host.next(); p.guest.next(); await p.pump();
  }
  await p.round('终点', '终点');
  for (const player of p.players) {
    const current = player.snapshot();
    assert.equal(current.phase, 'won'); assert.equal(current.round, 206);
    assert.equal(current.history.length, 200); assert.equal(current.history[0].round, 7);
    assert.equal(current.history.at(-1).round, 206);
    assert.throws(() => { current.history[0].words[0] = '改'; });
  }
  assert.deepEqual(p.errors, []);
});
