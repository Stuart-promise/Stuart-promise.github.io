import {newFlight, rollFlight, moveFlight} from "../234宠物之家/flight-engine.mjs";
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
    const match = url.pathname.match(/^\/v1\/rooms\/(gomoku|xiangqi|flight)\/([0-9]{6})$/);
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
      if (state.game === "flight") return this.flightRequest(state, token, message);
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


  async flightRequest(state, token, message) {
    const action=message?.action;
    if (state.flightVersion === 1) {
      if (!state.tokens.includes(token)) return fail("房间版本已更新，请创建双人房间", 410);
      state.closed = true;
      await this.ctx.storage.put("room", state);
      return this.flightSnapshot(state, state.tokens.indexOf(token));
    }
    if (!state.flightVersion) {
      state.tokens=[state.tokens[0],null];
      state.flightVersion=2;
      state.started=false;
      state.flight=null;
      state.recent=[];
    }
    let seat=state.tokens.indexOf(token);
    if (action==="join" && seat<0) {
      if(state.closed) return fail("房间已关闭",410);
      if(state.started) return fail("游戏已经开始，请等待下一局或另开房间",409);
      seat=state.tokens.indexOf(null);
      if(seat<0)return fail("房间已经坐满，最多两人",409);
      state.tokens[seat]=token;
      state.flight=newFlight([0,1]);
      state.started=true;
      state.version++;
    }
    if(seat<0)return fail("房间凭证无效",401);
    if (message && !["create","join"].includes(action)) {
      if(state.closed)return fail("房间已关闭",410);
      if(typeof message.id!=="string" || message.id.length>80)return fail("操作编号无效",400);
      if(state.recent.includes(message.id))return this.flightSnapshot(state,seat);
      if (message.version!==state.version) return fail("棋盘已更新，请重试",409);
      if(action==="start"){
        if(seat!==0)return fail("请等待房主开始",403);
        if(state.started && state.flight?.winner===null)return fail("游戏正在进行",409);
        const players=state.tokens.flatMap((t,i)=>t?[i]:[]);
        if(players.length<2)return fail("至少两人才能开始",409);
        state.flight=newFlight(players);state.started=true;
      } else if(action==="roll" || action==="plane"){
        if(!state.started || state.flight.winner!==null)return fail("游戏尚未开始或已经结束",409);
        if(state.flight.players[state.flight.turn]!==seat)return fail("请等待其他玩家操作",409);
        const valid=action==="roll" ? rollFlight(state.flight, randomDie()) : moveFlight(state.flight,message.pawn);
        if(!valid)return fail("当前不能进行此操作",409);
      } else if(action==="leave"){
        if(seat===0 || state.started)state.closed=true;
        else state.tokens[seat]=null;
      } else return fail("操作无效",400);
      state.recent.push(message.id);
      state.recent=state.recent.slice(-24);
      state.version++;
    }
    if(message) await this.ctx.storage.put("room",state);
    return this.flightSnapshot(state,seat);
  }

  flightSnapshot(state, seat) {
    return json({seat,version:state.version,phase:state.closed?"closed":state.started?"playing":"waiting",players:state.tokens.map(Boolean),flight:state.flight});
  }

  async alarm() { await this.ctx.storage.deleteAll(); }
}

function randomDie() {
  const n=new Uint32Array(1);
  do {crypto.getRandomValues(n);} while(n[0]>=4294967292);
  return n[0]%6+1;
}
