"use strict";
// Expose the same link events the four games already use for direct play.
function createGamePeer(game, prefix, code, host) {
  if (!code.startsWith("R")) return host ? new Peer(prefix + code) : new Peer();

  const url = new URL("/v1/relay/" + game + "/" + code.slice(1), window.ROOM_SERVER);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("seat", host ? "host" : "guest");
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
  const verifyRules = ["234-pet-checkers-v3-", "234-pet-flight-winding-v4-"].includes(prefix);
  let handshakeTimer;
  function openLink() {
    if (host) peer.emit("connection", link);
    link.open = true;
    link.emit("open");
  }
  socket.onmessage = event => {
    const packet = JSON.parse(event.data);
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
