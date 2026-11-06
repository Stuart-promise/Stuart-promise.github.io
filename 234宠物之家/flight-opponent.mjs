import {choices,moveFlight,rollFlight,TRACK,FINISH} from "./flight-engine.mjs?v=duo3";
function score(game){
  if(game.winner!==null)return game.winner===1?10000:-10000;
  const progress=planes=>planes.reduce((sum,p)=>sum+(p<0?0:10+p+(p>=TRACK?12:0)+(p===FINISH?25:0)),0);
  return progress(game.planes[1])-progress(game.planes[0]);
}
export function choosePlane(game,level){
  const legal=choices(game);
  if(level==="easy" || legal.length<2)return legal[Math.floor(Math.random()*legal.length)];
  let best=legal[0],bestValue=-Infinity;
  for(const pawn of legal){
    const next=structuredClone(game);
    moveFlight(next,pawn);
    let value=score(next);
    if(level==="hard" && next.winner===null){
      // Average the best available reply for each equally likely die face.
      let sum=0;
      for(let die=1;die<=6;die++){
        const rolled=structuredClone(next);rollFlight(rolled,die);
        const replies=choices(rolled).map(i=>{
          const outcome=structuredClone(rolled);moveFlight(outcome,i);return score(outcome);
        });
        sum+=replies.length?(next.turn===1?Math.max(...replies):Math.min(...replies)):score(rolled);
      }
      value=.2*value+.8*sum/6;
    }
    if(value>bestValue){bestValue=value;best=pawn;}
  }
  return best;
}
