"use strict";

const checkers=new ChineseCheckers();
const board=document.getElementById("checkers-board");
const statusLine=document.getElementById("status");
const undo=document.getElementById("undo");
const restart=document.getElementById("restart");
const hint=document.getElementById("move-hint");
const ns="http://www.w3.org/2000/svg";
let moves=checkers.history;
let localMode=false;
let selected=null;
const nextColor=()=>checkers.turn===0?"红":"蓝";
const activeTurn=()=>checkers.winner===null && !checkers.blocked && (localMode || room.phase==="playing" && room.color===nextColor());
function element(tag,attrs,text) {
  const item=document.createElementNS(ns,tag);
  for(const [key,value] of Object.entries(attrs))item.setAttribute(key,value);
  if(text!==undefined)item.textContent=text;
  return item;
}
function position(key) {
  const {q,r}=checkers.cells.get(key);
  return [360+(q+r/2)*46,380+r*40];
}
function drawBoard() {
  board.replaceChildren();
  const defs=element("defs",{});
  for(const [id,light,dark] of [["red","#ffbcb0","#b82f34"],["blue","#b5eaff","#176caa"],["hole","#edf1e6","#c2cdbb"]]) {
    const gradient=element("radialGradient",{id,cx:"30%",cy:"25%",r:"75%"});
    gradient.append(element("stop",{offset:"0%","stop-color":light}),element("stop",{offset:"100%","stop-color":dark}));
    defs.append(gradient);
  }
  board.append(defs);
  board.append(element("rect",{x:5,y:5,width:710,height:750,rx:26,fill:"#f6f4e8",stroke:"#b1c2ae","stroke-width":2}));
  const triangles=[
    ["4,-8","0,-4","4,-4"],["-4,8","-4,4","0,4"],
    ["8,-4","4,-4","4,0"],["4,4","4,0","0,4"],
    ["-8,4","-4,4","-4,0"],["-4,-4","-4,0","0,-4"]
  ];
  triangles.forEach((keys,i)=>{
    const fill=i===0?"#d8eaf3":i===1?"#f4ded4":"#e6e9df";
    board.append(element("polygon",{points:keys.map(key=>position(key).join(",")).join(" "),fill,stroke:"#c5cfbe","stroke-width":2,"stroke-linejoin":"round"}));
  });
  for(const [from,cell] of checkers.cells) {
    for(const [dq,dr] of [[1,0],[0,1],[-1,1]]) {
      const to=(cell.q+dq)+","+(cell.r+dr);
      if(checkers.cells.has(to)) {
        const [x1,y1]=position(from),[x2,y2]=position(to);
        board.append(element("line",{x1,y1,x2,y2,stroke:"#c0cab6","stroke-width":1.2}));
      }
    }
  }
  const targets=selected===null?new Map():checkers.destinations(selected);
  const last=moves.at(-1);
  if(last)board.append(element("polyline",{points:last.path.map(key=>position(key).join(",")).join(" "),fill:"none",stroke:"#a68146","stroke-width":4,"stroke-dasharray":"6 5",opacity:".7","pointer-events":"none"}));
  for(const [key,cell] of checkers.cells) {
    const [cx,cy]=position(key);
    const seat=checkers.pieces[key];
    const occupied=seat!==undefined;
    const active=activeTurn() && (targets.has(key)||seat===checkers.turn);
    const label=occupied?(seat===0?"红":"蓝")+"方棋子":"空位";
    const group=element("g",{role:"button",tabindex:active?0:-1,"data-cell":key,"data-owner":occupied?seat:"","aria-label":label+"，坐标 "+key,"aria-disabled":String(!active),"aria-pressed":String(selected===key),class:"checker-hole"});
    group.append(element("circle",{cx,cy,r:19,fill:occupied?"url(#"+(seat===0?"red":"blue")+")":"url(#hole)",stroke:occupied?(seat===0?"#9a2f30":"#1a5e89"):"#b5c2ac","stroke-width":occupied?2:1}));
    if(selected===key)group.append(element("circle",{cx,cy,r:22,fill:"none",stroke:"#1d7852","stroke-width":4}));
    if(targets.has(key))group.append(element("circle",{cx,cy,r:8,fill:"#237b50",stroke:"#f9fff0","stroke-width":2}));
    if(key===last?.to)group.append(element("circle",{cx,cy,r:4,fill:"#fff6c8"}));
    group.onclick=()=>choose(key);
    group.onkeydown=event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();choose(key);}};
    board.append(group);
  }
  board.append(element("text",{x:360,y:30,"text-anchor":"middle",fill:"#22688d","font-size":18,"font-weight":700},"蓝方 · 10 枚"));
  board.append(element("text",{x:360,y:744,"text-anchor":"middle",fill:"#a23836","font-size":18,"font-weight":700},"红方 · 10 枚"));
}
function render() {
  const online=!localMode;
  const ready=localMode||room.phase==="playing";
  const active=activeTurn();
  document.getElementById("count").textContent=moves.length;
  document.getElementById("red-progress").textContent=checkers.goals[0].filter(key=>checkers.pieces[key]===0).length+" / 10";
  document.getElementById("blue-progress").textContent=checkers.goals[1].filter(key=>checkers.pieces[key]===1).length+" / 10";
  if(!ready)statusLine.textContent=room.phase==="closed"?"房间已断开":"等待双人就位";
  else if(checkers.blocked)statusLine.textContent="双方均无合法走法，等待协商重新开局";
  else if(checkers.winner!==null)statusLine.textContent=(checkers.winner===0?"红":"蓝")+"方获胜！";
  else statusLine.textContent=online?(active?"轮到你走棋（"+room.color+"方）":"等待对方走棋"):"轮到"+nextColor()+"方走棋";
  undo.hidden=online;
  undo.disabled=!moves.length;
  restart.disabled=online?!ready||!moves.length||room.mineAgain:!moves.length;
  restart.textContent=online?(room.mineAgain?"等待对方同意":room.theirAgain?"同意重新开局":"申请重新开局"):"重新开局";
  drawBoard();
}
function legalMove(move){return checkers.legal(move);}
function place(move) {
  checkers.move(move);
  selected=null;
  const hops=moves.at(-1).path.length-1;
  hint.textContent=hops>1?"完成 "+hops+" 段连续跳跃。":"点击己方棋子，绿色标记为可到达位置。";
  if(checkers.blocked) hint.textContent="双方回合均已跳过。当前无法继续走棋，可申请重新开局。";
  else if(checkers.skipped.length) hint.textContent=(checkers.skipped[0]===0?"红":"蓝")+"方无合法走法，自动跳过回合，"+nextColor()+"方继续。";
  render();
}
function choose(key) {
  if(!activeTurn())return;
  if(checkers.pieces[key]===checkers.turn) {
    selected=selected===key?null:key;
    hint.textContent=selected===null?"点击己方棋子查看走法。":"点击绿色标记完成移动，可对称远跳，也可转向连跳；点想停下的落点。";
    render();return;
  }
  const move={from:selected,to:key};
  if(!legalMove(move)){hint.textContent="此处不能走，请选择绿色标记位置。";return;}
  if(!localMode&&!sendMove(move))return;
  place(move);
}
function clearBoard() {
  checkers.reset();moves=checkers.history;selected=null;
  hint.textContent="点击己方棋子，绿色标记为可到达位置。";
  render();
}
undo.onclick=()=>{if(!localMode)return;checkers.undo();selected=null;render();};
restart.onclick=()=>{
  if(!localMode)return voteAgain();
  if(moves.length && checkers.winner===null && !confirm("结束当前对局，重新开局？"))return;
  clearBoard();
};
