import {choosePlane} from "./flight-opponent.mjs?v=board4";
import {choices, newFlight, rollFlight, moveFlight, flightTrackIndex, route, SIDE, ARM, TRACK, FINISH} from "./flight-engine.mjs?v=board4";
const $=id=>document.getElementById(id);
const colors=["#bd4552","#28669f"];
const labels=["红","蓝"];
const prefix="234-pet-flight-winding-v4-";
let room=null, code="", busy=false, peer=null, link=null, timer=null;
let isHost=false, cpuTimer=null;
const svg=$("flight-board"), ns="http://www.w3.org/2000/svg";
function node(tag,attrs,text){
  const element=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs))element.setAttribute(k,v);
  if(text!==undefined)element.textContent=text;
  return element;
}

const side=SIDE, middle=ARM+1;
const cell=34, margin=(660-side*cell)/2;
const airportSize=124;
const airportStart=seat=>seat===0 ? 660-16-airportSize : 16;
const center=(row,col)=>[margin+(col+0.5)*cell,margin+(row+0.5)*cell];
function airport(seat,pawn) {
  const base=airportStart(seat);
  return [base+35+(pawn%2)*54,base+48+Math.floor(pawn/2)*48];
}
function position(seat,pos,pawn) {
  if(pos<0)return airport(seat,pawn);
  if(pos<TRACK)return center(...route[flightTrackIndex(seat,pos,TRACK)]);
  const step=pos-TRACK+1;
  return center(middle,seat===0?side-1-step:step);
}
function tile(row,col,fill){
  return node("rect",{x:margin+col*cell+0.7,y:margin+row*cell+0.7,width:cell-1.4,height:cell-1.4,rx:4,fill,stroke:"#a6b1ba","stroke-width":0.9});
}
function caption(x,y,text,size,fill){
  return node("text",{x,y,fill,"text-anchor":"middle","font-size":size,"font-weight":650},text);
}
function renderBoard() {
  svg.replaceChildren();
  svg.append(node("rect",{x:2,y:2,width:656,height:656,rx:18,fill:"white",stroke:"#ced6dc","stroke-width":2}));
  const palette=[colors[1],"white",colors[0],"white"];
  const path=route.map(([r,c])=>center(r,c).join(",")).join(" ");
  svg.append(node("polygon",{points:path,fill:"none",stroke:"#abb8c2","stroke-width":5,"stroke-linejoin":"round"}));
  route.forEach(([r,c],index)=>{
    const [cx,cy]=center(r,c);
    const square=tile(r,c,palette[index%4]);
    square.setAttribute("data-track",index);
    svg.append(square);
    if(index%2===0){
      const relative=index%4===0 ? index : (index+TRACK/2)%TRACK;
      const mark=relative===16?"✈":relative===0?"起":"＋";
      svg.append(caption(cx,cy+6,mark,17,"white"));
    }else{
      const [nextRow,nextCol]=route[(index+1)%TRACK];
      const angle=Math.atan2(nextRow-r,nextCol-c)*180/Math.PI;
      svg.append(node("path",{d:"M -3 -5 L 2 0 L -3 5",transform:`translate(${cx} ${cy}) rotate(${angle})`,fill:"none",stroke:"#8195a3","stroke-width":2,"stroke-linecap":"round","stroke-linejoin":"round"}));
    }
  });
  for(let seat=0;seat<2;seat++){
    const start=airportStart(seat);
    const group=node("g",{"data-airport":seat,"aria-label":labels[seat]+"方机场"});
    group.append(node("rect",{x:start,y:start,width:airportSize,height:airportSize,rx:14,fill:seat===0?"#fff6f6":"#f3f8fd",stroke:colors[seat],"stroke-width":3}));
    for(let pawn=0;pawn<4;pawn++){
      const [cx,cy]=airport(seat,pawn);
      group.append(node("circle",{cx,cy,r:18,fill:"white",stroke:colors[seat],"stroke-opacity":0.38,"stroke-width":2}));
    }
    group.append(caption(start+airportSize/2,start+22,labels[seat]+"方机场",16,colors[seat]));
    svg.append(group);
    for(let p=TRACK;p<=FINISH;p++){
      const step=p-TRACK+1,col=seat===0?side-1-step:step;
      const [cx,cy]=center(middle,col);
      svg.append(tile(middle,col,colors[seat]),caption(cx,cy+5,p===FINISH?"★":seat===0?"‹":"›",17,"white"));
    }
  }
  svg.append(caption(330,334,"终",16,"#455763"));
  const game=room?.flight;
  const seats=game ? game.players : [0,1];
  const legal=game && game.players[game.turn]===room.seat && !busy ? choices(game):[];
  const occupied=new Map();
  seats.forEach((seat,index)=>{
    const planes=game ? game.planes[index] : [-1,-1,-1,-1];
    planes.forEach((pos,pawn)=>{
      let [cx,cy]=position(seat,pos,pawn);
      const bucket=cx.toFixed(1)+","+cy.toFixed(1),offset=occupied.get(bucket)||0;
      occupied.set(bucket,offset+1);
      if(offset){cx+=(offset%2 ? 5:-5);cy+=Math.floor((offset+1)/2)*5;}
      const active=legal.includes(pawn) && room.seat===seat && room.phase==="playing";
      const group=node("g",{class:"plane"+(active?" available":""),role:"button",tabindex:active?0:-1,"aria-label":labels[seat]+"方"+(pawn+1)+"号飞机"+(pos===FINISH?"，已到终点":""),"aria-disabled":String(!active)});
      group.append(node("circle",{cx,cy,r:13,fill:"white",stroke:colors[seat],"stroke-width":active?4:2}));
      group.append(node("text",{x:cx,y:cy+5,"text-anchor":"middle","font-size":15,"font-weight":700,fill:colors[seat]},pawn+1));
      if(active){
        group.onclick=()=>command("plane",{pawn});
        group.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();command("plane",{pawn});}};
      }
      svg.append(group);
    });
  });
}
function render(){
  $("entry").hidden=!!room;
  $("tools").hidden=!room || !!cpu.level;
  $("computer-form").hidden=!!room && !cpu.level;
  $("room-label").textContent="房间 "+code;
  const seats=room?.players||[false,false];
  $("seats").textContent=seats.filter(Boolean).length+" / 2 人";
  $("players").replaceChildren();
  seats.forEach((present,seat)=>{
    const li=document.createElement("li");
    li.style.borderLeft="5px solid "+colors[seat];
    li.textContent=labels[seat]+"方 · "+(present?(seat===room.seat?"你":cpu.level?"电脑":"已入座"):"等待加入")+(seat===0 && !cpu.level?" · 房主":"");
    $("players").append(li);
  });
  const game=room?.flight;
  const playing=room?.phase==="playing", mine=playing && game.players[game.turn]===room.seat;
  $("start").hidden=!game || game.winner===null;
  $("start").disabled=busy || !room || room.seat!==0 || room.phase==="closed" || seats.filter(Boolean).length<2;
  $("start").textContent=game?.winner!==null && game ? "房主再开一局":"等待好友加入";
  $("roll").disabled=busy || !mine || game.die!==null || game.winner!==null;
  const roll=game?.lastRoll;
  const patterns=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
  const face=$("dice");
  face.replaceChildren();
  for(const pip of patterns[roll?.value ?? 0]){
    face.append(node("circle",{cx:12+12*(pip%3),cy:12+12*Math.floor(pip/3),r:3.8,fill:colors[roll.seat]}));
  }
  if(!roll)face.append(caption(24,30,"—",17,"#758491"));
  $("die-result").textContent=roll ? labels[roll.seat]+"方 · "+roll.value+" 点" : "等待掷骰";
  $("roll").textContent=playing && game.winner===null ? (game.die!==null?"等待选飞机":mine?"掷骰子":"对方掷骰") : "掷骰子";
  $("status").textContent=!room?"创建或加入房间，邀请朋友入座":room.phase==="closed"?"房间已关闭":game?.winner!==null && game?labels[game.players[game.winner]]+"方获胜！":playing?(mine?"轮到你":(cpu.level?"轮到电脑":"轮到"+labels[game.players[game.turn]]+"方"))+(game.die===null?"掷骰子":"选择飞机"):"等待玩家入座";
  if(busy)$("status").textContent="正在同步…";
  $("log").textContent=game?.log||"骰子由房主设备生成，双方同步显示。";
  $("plane-controls").replaceChildren();
  if(mine && !busy)for(const pawn of choices(game)){
    const button=document.createElement("button");
    button.textContent="移动 "+(pawn+1)+" 号";
    button.onclick=()=>command("plane",{pawn});
    $("plane-controls").append(button);
  }
  renderBoard();
  if(cpu.level && playing && !mine && game.winner===null && cpuTimer===null){
    cpuTimer=setTimeout(()=>{
      cpuTimer=null;
      if(room?.flight!==game || game.turn!==1 || game.winner!==null)return;
      if(game.die===null)acceptAction(1,"roll",{version:room.version});
      else acceptAction(1,"plane",{version:room.version,pawn:choosePlane(game,cpu.level)});
    },650);
  }
}
function note(text) { $("note").textContent=text; }
function transmit(data) {
  if (!link?.open) return false;
  try { link.send(data); return true; }
  catch { closeRoom("与对方的连接已断开，请重新开房。"); return false; }
}
function closeRoom(message) {
  const oldPeer=peer;
  peer=link=null;
  clearTimeout(timer);
  busy=false;
  if(room) room.phase="closed";
  oldPeer?.destroy();
  render();
  note(message);
}
function sendState(error) {
  return transmit({type:"state",state:{...room,seat:1},error});
}
function acceptAction(seat,action,extra) {
  let error="";
  if(room?.phase!=="playing") error="对局尚未开始。";
  else if(extra.version!==room.version) error="棋盘已更新，请重试。";
  else if(action==="start") {
    if(seat!==0 || room.flight.winner===null) error="本局尚未结束。";
    else {room.flight=newFlight([0,1],true);room.version++;}
  } else if(room.flight.players[room.flight.turn]!==seat) error="请等待对方操作。";
  else {
    const valid=action==="roll" ? rollFlight(room.flight,randomDie()) :
      action==="plane" && moveFlight(room.flight,extra.pawn);
    if(valid)room.version++;
    else error="当前不能进行此操作。";
  }
  if(!cpu.level)sendState(error);
  render();
  if(error)note(error);
}
function randomDie() {
  const bytes=new Uint32Array(1);
  do {crypto.getRandomValues(bytes);} while(bytes[0]>=4294967292);
  return bytes[0]%6+1;
}
function command(action,extra={}) {
  if(busy || room?.phase!=="playing")return;
  const data={...extra,version:room.version};
  if(isHost) acceptAction(0,action,data);
  else {
    busy=true;
    if(!transmit({type:"action",action,...data}))busy=false;
    render();
  }
}
function bindConnection(connection) {
  link=connection;
  connection.on("open",()=>{
    if(link!==connection)return;
    if(isHost){
      clearTimeout(timer);
      room={seat:0,version:0,phase:"playing",players:[true,true],flight:newFlight([0,1],true)};
      sendState();
      render();
      note("你是红方。对局期间请保持双方页面打开。");
    }
  });
  connection.on("data",data=>{
    if(link!==connection || !data || typeof data!=="object")return;
    if(data.type==="full"){closeRoom("房间已经坐满，最多两人。");return;}
    if(data.type==="leave"){closeRoom("对方已退出，请重新开房。");return;}
    if(isHost && data.type==="action")acceptAction(1,data.action,data);
    else if(!isHost && data.type==="state" && data.state){
      clearTimeout(timer);
      room=data.state;
      busy=false;
      render();
      note(data.error||"你是蓝方。对局期间请保持双方页面打开。");
    }
  });
  const disconnected=()=>{if(link===connection)closeRoom("与对方的连接已断开，请重新开房。");};
  connection.on("close",disconnected);
  connection.on("error",disconnected);
}
function enter(host, relay = false) {
  if(busy||room)return;
  isHost=host;
  code=host?createRoomCode(relay):$("code").value.trim().toUpperCase();
  room={seat:host?0:1,phase:"connecting",version:0,players:host?[true,false]:[false,true],flight:null};
  render();note(host?"正在创建房间…":"正在连接房主…");
  timer=setTimeout(()=>closeRoom("连接超时，请检查网络后重新开房。"),25000);
  try {
    const current=createGamePeer("flight",prefix,code,host);
    peer=current;
    current.on("open",()=>{
      if(peer!==current)return;
      if(host){
        clearTimeout(timer);room.phase="waiting";render();note("等待好友加入，入座后自动开始。");
      }else bindConnection(current.connect(prefix+code,{reliable:true}));
    });
    current.on("connection",incoming=>{
      if(peer!==current||!host||link||room.phase!=="waiting"){
        incoming.on("open",()=>{incoming.send({type:"full"});setTimeout(()=>incoming.close(),500);});
        return;
      }
      bindConnection(incoming);
      clearTimeout(timer);
      timer=setTimeout(()=>closeRoom("未能连接对方，请重新开房。"),25000);
    });
    current.on("error",error=>{
      if(peer!==current || room.phase==="playing" && link?.open)return;
      const messages={"rules-version":"双方的游戏版本不同，请双方刷新页面后重新开房。","room-expired":"房间等待超过 20 分钟，请重新创建。","server-busy":"房间服务暂时繁忙，请稍后重试。","rate-limited":"连接过于频繁，请稍后重试。","connection-timeout":"与服务器连接超时，请重新开房。","room-full":"房间已经坐满，请换一个房间。","relay-unreachable":"无法连接本站服务器，请稍后重试或使用备用直连房。","peer-unavailable":"找不到房间，请确认房主在线并核对邀请码。","unavailable-id":"房间码已占用，请重新创建。"};
      closeRoom(messages[error.type]||"无法建立连接，请检查网络或使用新版浏览器。");
    });
    current.on("disconnected",()=>{
      if(peer===current && room.phase!=="playing")closeRoom("房间服务已断开，请重新开房。");
    });
  } catch { closeRoom("当前浏览器无法连接，请使用新版浏览器。"); }
}
$("create").onclick=()=>enter(true,true);
$("create-relay").onclick=()=>enter(true,false);
$("entry").onsubmit=event=>{event.preventDefault();enter(false);};
$("start").onclick=()=>command("start");
$("roll").onclick=()=>command("roll");
$("invite").onclick=async()=>{
  const url=new URL("./flight.html?v=board4&room="+code,location.href).href;
  try{await navigator.clipboard.writeText(url);note("邀请链接已复制。");}catch{prompt("复制邀请链接",url);}
};
function leave() {
  if(room?.phase==="playing" && !confirm("退出会结束本局，确定退出？"))return false;
  if(link?.open)transmit({type:"leave"});
  closeRoom("已返回大厅。");
  room=null;code="";render();return true;
}
$("leave").onclick=leave;
$("home-link").onclick=event=>{
  if(!cpu.level && room && !leave())event.preventDefault();
};
const invite=new URLSearchParams(location.search).get("room");
if(/^R?[0-9]{6}$/.test(invite||""))$("code").value=invite;
if(cpu.level){
  isHost=true;
  room={seat:0,version:0,phase:"playing",players:[true,true],flight:newFlight([0,1],true)};
  document.querySelector(".lobby h2").textContent="与电脑对弈";
  document.querySelector(".lobby .badge").textContent="人机 · "+cpu.label;
  note("你执红方先掷，蓝方由电脑操作。");
  window.addEventListener("pagehide",()=>{clearTimeout(cpuTimer);cpuTimer=null;});
  window.addEventListener("pageshow",render);
}
render();
