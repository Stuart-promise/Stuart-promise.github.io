export const ARM = 8;
export const TRACK = 8*ARM + 4;
export const FINISH = TRACK + ARM - 1;

// Existing saved rooms on the legacy HTTP service still use the 52-cell course.
export function flightTrackIndex(seat, position, track = 52) {
  return ((seat === 0 ? track / 2 : 0) + position) % track;
}
export function newFlight(players, longCourse = false) {
  return {players, longCourse, lastRoll:null, turn: 0, planes: players.map(() => [-1,-1,-1,-1]), die: null, winner: null, log: "游戏开始，掷到 5 或 6 即可起飞。"};
}
export function choices(game) {
  if (game.die === null || game.winner !== null) return [];
  const finish = game.longCourse ? FINISH : 57;
  return game.planes[game.turn].flatMap((p,i) => p === -1 ? (game.die >= 5 ? [i] : []) : p < finish && p + game.die <= finish ? [i] : []);
}
function nextTurn(game) {
  game.turn = (game.turn + 1) % game.players.length;
  game.die = null;
}
export function rollFlight(game, die) {
  if (game.die !== null || game.winner !== null || !Number.isInteger(die) || die < 1 || die > 6) return false;
  game.die = die;
  game.lastRoll = {seat:game.players[game.turn], value:die};
  game.log = `掷出 ${die} 点，请选择飞机。`;
  if (!choices(game).length) {
    game.log = `掷出 ${die} 点，没有可移动的飞机，轮到下一位。`;
    nextTurn(game);
  }
  return true;
}
export function moveFlight(game, pawn) {
  if (!choices(game).includes(pawn)) return false;
  const track=game.longCourse ? TRACK : 52;
  const finish=game.longCourse ? FINISH : 57;
  const seat=game.turn, die=game.die;
  let pos=game.planes[seat][pawn];
  pos=pos === -1 ? 0 : pos+die;
  // The casual course uses a same-colour jump every four steps and a flight at step 16.
  if (pos === 16) pos=28;
  else if (pos > 0 && pos < track && pos % 4 === 0) pos=pos+4;
  const physical=flightTrackIndex(game.players[seat],pos,track);
  let captured=0;
  if(pos<track) game.planes.forEach((planes,other)=>{
    if(other===seat)return;
    planes.forEach((p,i)=>{
      if(p>=0 && p<track && flightTrackIndex(game.players[other],p,track)===physical){planes[i]=-1;captured++;}
    });
  });
  game.planes[seat][pawn]=pos;
  game.log=pos===finish ? `第 ${pawn+1} 架飞机已到终点！` : `第 ${pawn+1} 架飞机前进${captured ? "，撞回 "+captured+" 架对方飞机" : ""}。`;
  if(game.planes[seat].every(p=>p===finish)){game.winner=seat;game.die=null;game.log="四架飞机全部抵达，获得胜利！";}
  else if(die===6){game.die=null;game.log+=" 掷出 6，可再掷一次。";}
  else nextTurn(game);
  return true;
}
