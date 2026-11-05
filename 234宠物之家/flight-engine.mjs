export function newFlight(players) {
  return {players, turn: 0, planes: players.map(() => [-1,-1,-1,-1]), die: null, winner: null, log: "游戏开始，掷到 6 即可起飞。"};
}
export function choices(game) {
  if (game.die === null || game.winner !== null) return [];
  return game.planes[game.turn].flatMap((p,i) => p === -1 ? (game.die === 6 ? [i] : []) : p < 57 && p + game.die <= 57 ? [i] : []);
}
function nextTurn(game) {
  game.turn = (game.turn + 1) % game.players.length;
  game.die = null;
}
export function rollFlight(game, die) {
  if (game.die !== null || game.winner !== null || !Number.isInteger(die) || die < 1 || die > 6) return false;
  game.die = die;
  game.log = `掷出 ${die} 点，请选择飞机。`;
  if (!choices(game).length) {
    game.log = `掷出 ${die} 点，没有可移动的飞机，轮到下一位。`;
    nextTurn(game);
  }
  return true;
}
export function moveFlight(game, pawn) {
  if (!choices(game).includes(pawn)) return false;
  const seat=game.turn, die=game.die;
  let pos=game.planes[seat][pawn];
  pos=pos === -1 ? 0 : pos+die;
  // The casual course uses a same-colour jump every four steps and a flight at step 16.
  if (pos === 16) pos=28;
  else if (pos > 0 && pos < 52 && pos % 4 === 0) pos=pos+4;
  const physical=(game.players[seat]*13+pos)%52;
  let captured=0;
  if(pos<52) game.planes.forEach((planes,other)=>{
    if(other===seat)return;
    planes.forEach((p,i)=>{
      if(p>=0 && p<52 && (game.players[other]*13+p)%52===physical){planes[i]=-1;captured++;}
    });
  });
  game.planes[seat][pawn]=pos;
  game.log=pos===57 ? `第 ${pawn+1} 架飞机已到终点！` : `第 ${pawn+1} 架飞机前进${captured ? "，撞回 "+captured+" 架对方飞机" : ""}。`;
  if(game.planes[seat].every(p=>p===57)){game.winner=seat;game.die=null;game.log="四架飞机全部抵达，获得胜利！";}
  else if(die===6){game.die=null;game.log+=" 掷出 6，可再掷一次。";}
  else nextTurn(game);
  return true;
}
