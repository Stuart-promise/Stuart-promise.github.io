// Each game and room code maps to a separate Durable Object.
export function acceptRelay(ctx, request) {
  const host = new URL(request.url).searchParams.get("seat") === "host";
  const players = ctx.getWebSockets();
  const owner = ctx.getWebSockets("host").find(ws => ws.readyState === 1);
  const pair = new WebSocketPair();
  const socket = pair[1];
  const rejected = host && players.length ? "unavailable-id"
    : !host && !owner ? "peer-unavailable"
    : !host && players.length > 1 ? "room-full" : null;
  if (rejected) {
    socket.accept();
    socket.close(4001, rejected);
  } else {
    ctx.acceptWebSocket(socket, [host ? "host" : "guest"]);
    socket.send(JSON.stringify({event: "ready"}));
    if (!host) {
      const paired = JSON.stringify({event: "paired"});
      socket.send(paired);
      owner.send(paired);
    }
  }
  return new Response(null, {status: 101, webSocket: pair[0]});
}
