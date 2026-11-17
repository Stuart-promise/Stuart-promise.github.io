"use strict";
// All room codes use the same HTTPS/WebSocket service on every supported device.
function normalizeRoomCode(value) {
  const digits=String(value||'').normalize('NFKC').trim().toUpperCase().replace(/^R/,'');
  return /^[0-9]{6}$/.test(digits)?'R'+digits:'';
}
function createGamePeer(game, prefix, code, host) {
  const normalized=normalizeRoomCode(code);
  if(!normalized)throw Error('请输入六位数字房间码。');
  const url = new URL('/v1/relay/' + game + '/' + normalized.slice(1), window.ROOM_SERVER);
  if(!['https:','http:'].includes(url.protocol))throw Error('房间服务地址无效。');
  if(location.protocol==='https:'&&url.protocol!=='https:')throw Error('房间服务需要安全连接。');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('seat', host ? 'host' : 'guest');
  url.searchParams.set('rules', prefix);
  const socket = new WebSocket(url);
  function events() {
    const target = new EventTarget();
    return {
      on(name, handler) { target.addEventListener(name, event => handler(event.detail)); },
      emit(name, detail) { target.dispatchEvent(new CustomEvent(name, {detail})); }
    };
  }
  let handshakeTimer,heartbeat,ended=false,destroyed=false,paired=false,lastMessage=Date.now();
  function cleanup(){
    clearTimeout(handshakeTimer);clearInterval(heartbeat);
    window.removeEventListener('offline',offline);window.removeEventListener('pagehide',pagehide);
    document.removeEventListener('visibilitychange',visible);
  }
  function close(reason){if(ended)return;try{socket.close(4000,reason);}catch{};}
  function heartbeatCheck(){
    if(ended)return;
    if(Date.now()-lastMessage>65000){close('connection-timeout');return;}
    if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({_relay:'ping'}));
  }
  function offline(){close('offline');}
  function pagehide(){close('page-left');}
  function visible(){if(!document.hidden)heartbeatCheck();}
  window.addEventListener('offline',offline);window.addEventListener('pagehide',pagehide);
  document.addEventListener('visibilitychange',visible);
  const link = {
    ...events(), open: false,
    send(message) {
      if(ended||socket.readyState!==WebSocket.OPEN||Date.now()-lastMessage>65000){close('connection-timeout');throw Error('房间连接已中断，请重新开房。');}
      socket.send(JSON.stringify(message));
    },
    close() { close('page-left'); }
  };
  const peer = {...events(), connect: () => link, destroy: () => {destroyed=true;cleanup();close('page-left');}};
  socket.onopen=()=>{lastMessage=Date.now();heartbeat=setInterval(heartbeatCheck,20000);};
  function openLink() {
    if (host) peer.emit('connection', link);
    link.open = true;
    link.emit('open');
  }
  socket.onmessage = event => {
    if(ended||destroyed)return;
    lastMessage=Date.now();
    let packet;
    try { packet=JSON.parse(event.data); } catch { close('invalid-message');return; }
    if (packet.event === 'ready') peer.emit('open');
    if (packet.event === 'paired'&&!paired) {
      paired=true;link.send({rules: prefix});
      handshakeTimer = setTimeout(() => close('rules-version'), 6000);
    }
    if (packet.event === 'data' && !link.open) {
      clearTimeout(handshakeTimer);
      if (packet.value?.rules === prefix) return openLink();
      return close('rules-version');
    }
    if (packet.event === 'data' && link.open) link.emit('data', packet.value);
  };
  socket.onclose = event => {
    if(ended)return;ended=true;cleanup();
    const wasOpen=link.open;link.open=false;
    if(destroyed)return;
    if(wasOpen)link.emit('close');
    else peer.emit('error', {type: event.reason || 'relay-unreachable'});
  };
  return peer;
}
function createRoomCode() {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return 'R' + String(number).padStart(6, '0');
}
