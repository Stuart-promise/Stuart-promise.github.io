"use strict";
const random = list => list[Math.floor(Math.random()*list.length)];
const dirs = [[1,0],[0,1],[1,1],[1,-1]];

function gomoku(board,level){
  const size=15;
  function at(r,c){return r>=0 && r<size && c>=0 && c<size ? board[r*size+c] : "#";}
  function value(i,color){
    const r=Math.floor(i/size),c=i%size;
    let score=0;
    for(const [dr,dc] of dirs){
      let count=1,open=0;
      for(const sign of [-1,1]){
        let step=1;
        while(at(r+step*dr*sign,c+step*dc*sign)===color)step++;
        count+=step-1;
        if(at(r+step*dr*sign,c+step*dc*sign)===null)open++;
      }
      if(count>=5)return 1000000;
      if(open)score += [0,1,9,130,4000][count]*(open===2?5:1);
    }
    return score;
  }
  function nearby(){
    const cells=new Set();
    board.forEach((stone,i)=>{
      if(!stone)return;
      const r=Math.floor(i/size),c=i%size;
      for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)
        if(at(r+dr,c+dc)===null)cells.add((r+dr)*size+c+dc);
    });
    return cells.size?[...cells]:[112];
  }
  const ranked=nearby().map(i=>{
    const attack=value(i,"白"),block=value(i,"黑");
    return {i,attack,block,score:attack+.92*block+Math.random()};
  }).sort((a,b)=>b.score-a.score);
  const win=ranked.find(m=>m.attack===1000000);
  if(win)return win.i;
  if(level==="easy")return random(ranked.slice(0,Math.min(12,ranked.length))).i;
  const block=ranked.find(m=>m.block===1000000);
  if(block)return block.i;
  if(level==="medium")return ranked[0].i;
  const shortlist=ranked.slice(0,12);
  for(const m of shortlist){
    board[m.i]="白";
    const replies=nearby().map(i=>({i,danger:value(i,"黑"),threat:value(i,"白")}));
    // Two distinct winning continuations cannot both be blocked in one turn.
    if(replies.filter(r=>r.threat===1000000).length>=2)m.score+=500000;
    m.score-=Math.max(0,...replies.map(r=>r.danger));
    board[m.i]=null;
  }
  return shortlist.sort((a,b)=>b.score-a.score)[0].i;
}

const worth={K:100000,R:900,C:460,H:420,E:210,A:210,P:100};
function chessMoves(g){
  const list=[];
  g.board.forEach((p,from)=>{
    if(p?.[0]===g.turn)for(const to of g.targets(from))list.push({from,to});
  });
  return list.sort((a,b)=>(worth[g.board[b.to]?.[1]]||0)-(worth[g.board[a.to]?.[1]]||0));
}
function chessValue(g){
  let total=0;
  g.board.forEach((p,i)=>{
    if(!p)return;
    const black=p[0]==="b",r=Math.floor(i/9),advance=black?r:9-r;
    let v=worth[p[1]];
    if(p[1]==="P")v+=advance*6+(advance>=5?48:0);
    if("HCR".includes(p[1]))v+=3*(4-Math.abs(i%9-4))+Math.min(advance,5)*2;
    total+=black?v:-v;
  });
  return total;
}
function xiangqi(state,level){
  importScripts("./xiangqi-engine.js");
  const g=new Xiangqi();
  g.board=state.board;g.turn="b";
  const root=chessMoves(g);
  if(level==="easy")return random(root);
  const deadline=performance.now()+750, expired=Symbol();
  function search(depth,alpha,beta){
    if(performance.now()>deadline)throw expired;
    if(!g.board.includes(g.turn+"K"))return -200000;
    if(!depth)return (g.turn==="b"?1:-1)*chessValue(g);
    const moves=chessMoves(g);
    if(!moves.length)return -150000-depth;
    for(const m of moves){
      alpha=Math.max(alpha,after(m,depth-1,alpha,beta));
      if(alpha>=beta)break;
    }
    return alpha;
  }
  function after(m,depth,alpha,beta){
    const {from,to}=m,held=g.board[to],turn=g.turn;
    g.board[to]=g.board[from];g.board[from]=null;g.turn=turn==="b"?"r":"b";
    try{return -search(depth,-beta,-alpha);}
    finally{g.turn=turn;g.board[from]=g.board[to];g.board[to]=held;}
  }
  let best=root[0];
  for(let depth=1;depth<=(level==="hard"?3:1);depth++){
    let leader=best,score=-Infinity;
    try{
      for(const m of root){
        const value=after(m,depth-1,score,Infinity);
        if(value>score){score=value;leader=m;}
      }
    }catch(e){if(e!==expired)throw e;break;}
    best=leader;
    root.splice(root.indexOf(best),1);root.unshift(best);
  }
  return best;
}

function checkers(state,level){
  importScripts("./checkers-engine.js?v=duo3");
  const g=new ChineseCheckers();g.pieces=state.pieces;g.turn=1;
  const distance=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
  function movesFor(seat){
    const result=[];
    for(const [from,owner] of Object.entries(g.pieces)){
      if(owner!==seat)continue;
      const goals=g.goals[seat],free=goals.filter(k=>!(k in g.pieces));
      const dist=k=>Math.min(...(free.length?free:goals).map(key=>distance(g.cells.get(k),g.cells.get(key))));
      const start=dist(from),last=state.last;
      for(const to of g.destinations(from,seat).keys()){
        const into=goals.includes(to)&&!goals.includes(from);
        const forward=(g.cells.get(to).r-g.cells.get(from).r)*(seat===1?1:-1);
        const score=(start-dist(to))*5+forward*2+(into?16:0)
          +(into && free.length===1?10000:0)-(last?.to===from && last.from===to?8:0)+Math.random()*.6;
        result.push({from,to,score});
      }
    }
    return result.sort((a,b)=>b.score-a.score);
  }
  const options=movesFor(1);
  if(level==="easy")return random(options.slice(0,Math.max(4,Math.ceil(options.length*.65))));
  if(level==="medium")return options[0];
  const shortlist=options.slice(0,12);
  for(const m of shortlist){
    delete g.pieces[m.from];g.pieces[m.to]=1;
    m.score-=.7*(movesFor(0)[0]?.score||0);
    m.score+=.25*(movesFor(1)[0]?.score||0);
    delete g.pieces[m.to];g.pieces[m.from]=1;
  }
  return shortlist.sort((a,b)=>b.score-a.score)[0];
}
self.onmessage=({data:{game,level,state}})=>{
  const choose={gomoku,xiangqi,checkers}[game];
  self.postMessage(choose(state,level));
};
