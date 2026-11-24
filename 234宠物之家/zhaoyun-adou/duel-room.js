(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const frame = $('play-frame');
  const dialog = $('duel-dialog');
  const channel = 'pet234-zhao-duel-v1';
  const rules = '234-zhaoyun-adou-v1-';
  const historyKey = 'zyad.friend.history.v1';
  const messages = {
    'room-full': '房间已满，请核对房间码。',
    'peer-unavailable': '找不到房间，请确认房主在线并核对房间码。',
    'unavailable-id': '房间码被占用，请重新创建。',
    'rules-version': '双方游戏版本不同，请刷新后重新开房。',
    'room-expired': '等待好友超时，请重新开房。',
    'rate-limited': '连接过于频繁，请稍后再试。',
    'server-busy': '房间服务器繁忙，请稍后再试。'
  };
  let room = null;
  let available = false;
  let notice = '';
  let ending = false;

  function game(type, fields = {}) {
    frame.contentWindow?.postMessage({ ...fields, channel, type }, location.origin);
  }
  function show() {
    if (!dialog.open) dialog.showModal();
    render();
  }
  function render() {
    $('room-entry').hidden = !!room;
    $('room-details').hidden = !room;
    $('room-number').textContent = room?.code || '';
    $('open-duel').textContent = room?.matchId ? '对战房间' : '好友对战';
    const waiting = !!room && !room.matchId;
    $('dismiss-duel').hidden = waiting;
    $('copy-invite').hidden = room?.phase !== 'waiting';
    $('leave-room').textContent = room?.matchId ? '退出对战' : '退出房间';
    $('create-room').disabled = $('join-room').disabled = !available;
    $('duel-note').textContent = notice || (available ? '和好友各自布阵，在同一场守关战里比拼。' : '请等游戏载入并回到游戏主界面后开房。');
  }
  function records() {
    const raw = window.PetZhaoSave?.storage?.getItem(historyKey);
    const value = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) throw Error('战绩格式异常');
    return value;
  }
  function history() {
    const list = $('duel-records');
    list.replaceChildren();
    function add(text) {
      const li = document.createElement('li');
      li.textContent = text;
      list.append(li);
    }
    try {
      const all = records();
      if (!all.length) add('还没有已完成的好友对战。');
      for (const item of all) {
        const time = new Date(item.time).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const score = item.hearts && item.kills ? ' · 生命 ' + item.hearts.join('∶') + ' · 击退 ' + item.kills.join('∶') : '';
        add(time + ' · ' + item.outcome + ' · 第 ' + item.wave + ' 波' + score);
      }
    } catch { add('暂时无法读取好友战绩。'); }
  }
  function end(message, completed = false) {
    const active = room;
    room = null;
    if (active) {
      clearTimeout(active.timer);
      if (active.matchId) {
        available = false;
        game('end', { matchId: active.matchId, message });
      }
      if (completed) setTimeout(() => active.peer?.destroy(), 2000);
      else active.peer?.destroy();
    }
    notice = message;
    $('share-url').hidden = true;
    history();
    if (completed) $('duel-history').open = true;
    show();
  }
  function finish(active, packet) {
    const outcome = packet.winner === 'draw' ? '平局' : packet.winner === active.seat ? '胜利' : '落败';
    const me = active.seat === 'host' ? 0 : 1;
    const hearts = [packet.hearts[me], packet.hearts[1 - me]];
    const kills = [packet.kills[me], packet.kills[1 - me]];
    let message = '好友对战' + outcome + ' · 第 ' + packet.wave + ' 波。剩余生命 ' + packet.hearts[me] + ' 比 ' + packet.hearts[1 - me] + '。';
    try {
      const storage = window.PetZhaoSave.storage;
      const all = records();
      if (!all.some(item => item.id === active.matchId)) {
        all.unshift({ id: active.matchId, outcome, wave: packet.wave, hearts, kills, time: Date.now() });
        storage.setItem(historyKey, JSON.stringify(all.slice(0, 100)));
      }
    } catch { message += ' 本次战绩未能写入存档。'; }
    end(message, true);
  }
  function receive(active, p) {
    if (room !== active || !p || typeof p !== 'object') return;
    if (p.type === 'duel-start' && !active.matchId) {
      active.matchId = p.matchId;
      active.phase = 'playing';
      notice = '双方已入座，正在进入布阵。';
      game('start', { matchId: p.matchId, seed: p.seed, seat: active.seat });
      render();
    } else if (p.type === 'locked') {
      notice = '第 ' + p.round + ' 波 · ' + (p.seat === active.seat ? '你已锁定阵容，等待好友。' : '好友已锁定阵容。');
      render();
    } else if (p.type === 'battle' && active.matchId) {
      notice = '第 ' + p.round + ' 波 · 双方阵容已揭晓。';
      game('battle', { matchId: active.matchId, round: p.round, host: p.host, guest: p.guest });
      render();
    } else if (p.type === 'result' && active.matchId) {
      finish(active, p);
    } else if (p.type === 'duel-error') {
      end('双方对局数据未能同步，请重新开房。');
    }
  }
  function connect(host, code, attempt = 0) {
    if (room || !available || !code) return;
    const active = { code, seat: host ? 'host' : 'guest', phase: 'connecting', matchId: '', peer: null, link: null, timer: 0 };
    room = active;
    notice = host ? '正在创建房间…' : '正在加入好友的房间…';
    $('duel-history').open = false;
    render();
    try { active.peer = createGamePeer('zhaoyun-adou', rules, code, host); }
    catch { end('无法连接房间服务器，请检查网络后再试。'); return; }
    function attach(link) {
      if (room !== active) return;
      active.link = link;
      link.on('data', data => receive(active, data));
      link.on('close', () => {
        if (room === active) end('好友已离开或连接中断，本局已结束。');
      });
    }
    active.peer.on('connection', attach);
    active.peer.on('open', () => {
      if (room !== active) return;
      clearTimeout(active.timer);
      if (host) {
        active.phase = 'waiting';
        notice = '等待好友加入。把房间码或邀请链接发给对方。';
        render();
      } else {
        attach(active.peer.connect());
        active.timer = setTimeout(() => { if (room === active && !active.matchId) end('加入房间超时，请重新加入。'); }, 20000);
      }
    });
    active.peer.on('error', error => {
      if (room !== active) return;
      if (host && error.type === 'unavailable-id' && attempt < 2) {
        clearTimeout(active.timer); active.peer.destroy(); room = null;
        connect(true, createRoomCode(), attempt + 1);
      } else end(messages[error.type] || '房间连接已中断，请检查网络后重新开房。');
    });
    active.timer = setTimeout(() => { if (room === active) end('连接房间超时，请检查网络后重试。'); }, 20000);
  }

  window.addEventListener('message', event => {
    const p = event.data;
    if (event.origin !== location.origin || event.source !== frame.contentWindow || p?.channel !== channel) return;
    if (p.type === 'availability') {
      available = p.available === true;
      render();
      return;
    }
    const active = room;
    if (!active?.matchId || p.matchId !== active.matchId) return;
    if (p.type === 'entered') {
      if (dialog.open) dialog.close();
    } else if (p.type === 'error') {
      end(p.message || '游戏未能进入好友对战，请重试。');
    } else if (p.type === 'submit' || p.type === 'result') {
      try {
        const value = p.type === 'submit' ? { type: 'submit', round: p.round, actions: p.actions } :
          { type: 'result', round: p.round, winner: p.winner, wave: p.wave, hearts: p.hearts, kills: p.kills };
        active.link.send(value);
      } catch { end('对局数据未能送达，请重新开房。'); }
    }
  });
  frame.addEventListener('load', () => game('probe'));
  $('open-duel').onclick = () => { game('probe'); history(); show(); };
  $('dismiss-duel').onclick = () => dialog.close();
  dialog.addEventListener('cancel', event => { if (room && !room.matchId) event.preventDefault(); });
  $('duel-history').addEventListener('toggle', () => { if ($('duel-history').open) history(); });
  $('create-room').onclick = () => connect(true, createRoomCode());
  $('join-form').onsubmit = event => {
    event.preventDefault();
    const code = normalizeRoomCode($('room-input').value);
    if (!code) { notice = '请输入好友分享的 6 位数字房间码。'; render(); $('room-input').focus(); return; }
    connect(false, code);
  };
  $('leave-room').onclick = () => {
    if (room?.matchId && !confirm('退出后双方的本局对战都会结束，确定退出？')) return;
    end('已退出房间。');
  };
  $('copy-invite').onclick = async () => {
    if (!room) return;
    const active = room;
    const invite = new URL('./', location.href);
    invite.searchParams.set('room', active.code);
    try {
      await navigator.clipboard.writeText(invite.href);
      if (active === room) { notice = '邀请链接已复制。'; render(); }
    } catch {
      if (active !== room) return;
      $('share-url').value = invite.href; $('share-url').hidden = false;
      $('share-url').focus(); $('share-url').select();
    }
  };
  window.addEventListener('pagehide', () => { ending = !!room; room?.peer?.destroy(); room = null; });
  window.addEventListener('pageshow', e => { if (e.persisted && ending) location.reload(); });
  const invitation = normalizeRoomCode(new URL(location.href).searchParams.get('room'));
  if (invitation) {
    $('room-input').value = invitation.slice(1);
    show();
  }
  render();
})();
