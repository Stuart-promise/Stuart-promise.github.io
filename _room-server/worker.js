import { DurableObject } from "cloudflare:workers";

const json = (body, status = 200) => Response.json(body, {status, headers: {"Cache-Control": "no-store"}});
const fail = (message, status) => json({error: message}, status);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = origin === "https://stuart-promise.github.io" ||
      env.DEVELOPMENT === "true" && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin || "");
    if (origin && !allowed) return fail("此来源未获授权", 403);
    const cors = {
      "Access-Control-Allow-Origin": origin || "https://stuart-promise.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, {status: 204, headers: cors});
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/v1\/rooms\/(gomoku|xiangqi)\/([0-9]{6})$/);
    let response;
    if (url.pathname === "/health") response = json({ok: true, version: 1});
    else if (!match || !["GET", "POST"].includes(request.method)) response = fail("接口不存在", 404);
    else {
      const id = env.ROOMS.idFromName(match[1] + "-" + match[2]);
      response = await env.ROOMS.get(id).fetch(request);
    }
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(cors)) result.headers.set(key, value);
    return result;
  }
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
  }

  async fetch(request) {
    const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
    if (!/^[a-f0-9]{64}$/.test(token || "")) return fail("房间凭证无效", 401);
    let message = null;
    if (request.method === "POST") {
      const text = await request.text();
      if (text.length > 2048) return fail("请求过大", 413);
      try { message = JSON.parse(text); } catch { return fail("请求格式无效", 400); }
      if (!message || typeof message !== "object") return fail("请求格式无效", 400);
    }
    // Serialize both the read and write, so simultaneous joins cannot take the same seat.
    return this.ctx.blockConcurrencyWhile(async () => {
      let state = await this.ctx.storage.get("room");
      const action = message?.action;
      if (action === "create") {
        if (state && state.expires > Date.now()) {
          if (state.tokens[0] !== token) return fail("房间码已占用，请重新创建", 409);
        } else {
          state = {
            game: new URL(request.url).pathname.split("/")[3],
            tokens: [token, null], closed: false, round: 1, moves: [], votes: [false, false],
            version: 0, expires: Date.now() + 12 * 60 * 60 * 1000
          };
          await this.ctx.storage.setAlarm(state.expires);
        }
      }
      if (!state || state.expires <= Date.now()) return fail("找不到房间，或房间已过期", 404);
      let seat = state.tokens.indexOf(token);
      if (action === "join" && seat < 0) {
        if (state.closed) return fail("房间已关闭，请重新开房", 410);
        if (state.tokens[1]) return fail("房间已经坐满，请换一个房间", 409);
        state.tokens[1] = token;
        state.version++;
        seat = 1;
      }
      if (seat < 0) return fail("房间凭证无效", 401);
      if (action === "move" || action === "again") {
        if (state.closed || !state.tokens[1]) return fail("对局尚未开始或已结束", 409);
        if (!Number.isInteger(message.round)) return fail("回合编号无效", 400);
        if (message.round !== state.round) {
          // Returning the current snapshot makes retries after a completed rematch harmless.
          return this.snapshot(state, seat);
        }
        if (action === "move") {
          const move = message.i;
          const valid = state.game === "gomoku"
            ? Number.isInteger(move) && move >= 0 && move < 225
            : move && Number.isInteger(move.from) && Number.isInteger(move.to) &&
              move.from >= 0 && move.from < 90 && move.to >= 0 && move.to < 90 && move.from !== move.to;
          if (!valid || !Number.isInteger(message.ply) || message.ply < 0) return fail("棋步无效", 400);
          if (message.ply < state.moves.length) {
            if (message.ply % 2 === seat && JSON.stringify(state.moves[message.ply]) === JSON.stringify(move)) return this.snapshot(state, seat);
            return fail("棋盘已更新，请重试", 409);
          }
          if (message.ply !== state.moves.length || state.moves.length % 2 !== seat) return fail("请等待对方走棋", 409);
          if (state.game === "gomoku" && state.moves.includes(move)) return fail("此处已有棋子", 409);
          state.moves.push(move);
          state.version++;
        } else {
          if (!state.moves.length) return fail("新一局已开始", 409);
          state.votes[seat] = true;
          state.version++;
          if (state.votes.every(Boolean)) {
            state.round++;
            state.moves = [];
            state.votes = [false, false];
          }
        }
      } else if (action === "leave") {
        state.closed = true;
        state.version++;
      } else if (action && !["create", "join"].includes(action)) return fail("操作无效", 400);
      if (message) await this.ctx.storage.put("room", state);
      return this.snapshot(state, seat);
    });
  }

  snapshot(state, seat) {
    return json({
      seat, phase: state.closed ? "closed" : state.tokens[1] ? "playing" : "waiting",
      round: state.round, moves: state.moves, votes: state.votes, version: state.version
    });
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}
