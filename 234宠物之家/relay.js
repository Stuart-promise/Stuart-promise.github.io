"use strict";
// Expose the same link events the four games already use for direct play.
function createGamePeer(game, prefix, code, host) {
  if (!code.startsWith("R")) return host ? new Peer(prefix + code) : new Peer();

  const url = new URL("/v1/relay/" + game + "/" + code.slice(1), window.ROOM_SERVER);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("seat", host ? "host" : "guest");
  url.searchParams.set("rules", prefix);
  const socket = new WebSocket(url);
  function events() {
    const target = new EventTarget();
    return {
      on(name, handler) { target.addEventListener(name, event => handler(event.detail)); },
      emit(name, detail) { target.dispatchEvent(new CustomEvent(name, {detail})); }
    };
  }
  const link = {
    ...events(), open: false,
    send(message) { socket.send(JSON.stringify(message)); },
    close() { socket.close(); }
  };
  const peer = {...events(), connect: () => link, destroy: () => socket.close()};
  const verifyRules = true;
  let handshakeTimer,heartbeat;
  let lastMessage=Date.now();
  socket.onopen=()=>{
    lastMessage=Date.now();
    heartbeat=setInterval(()=>{
      if(Date.now()-lastMessage>65000){socket.close(4000,'connection-timeout');return;}
      if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({_relay:'ping'}));
    },20000);
  };
  function openLink() {
    if (host) peer.emit("connection", link);
    link.open = true;
    link.emit("open");
  }
  socket.onmessage = event => {
    lastMessage=Date.now();
    let packet;
    try { packet=JSON.parse(event.data); } catch { socket.close(4000,'invalid-message');return; }
    if (packet.event === "ready") peer.emit("open");
    if (packet.event === "paired") {
      if (!verifyRules) return openLink();
      link.send({rules: prefix});
      handshakeTimer = setTimeout(() => socket.close(4002, "rules-version"), 6000);
    }
    if (packet.event === "data" && verifyRules && !link.open) {
      clearTimeout(handshakeTimer);
      if (packet.value?.rules === prefix) return openLink();
      return socket.close(4002, "rules-version");
    }
    if (packet.event === "data" && link.open) link.emit("data", packet.value);
  };
  socket.onclose = event => {
    clearTimeout(handshakeTimer);
    clearInterval(heartbeat);
    if (link.open) {
      link.open = false;
      link.emit("close");
    } else {
      peer.emit("error", {type: event.reason || "relay-unreachable"});
    }
  };
  return peer;
}

function createRoomCode(relay) {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return (relay ? "R" : "") + String(number).padStart(6, "0");
}
