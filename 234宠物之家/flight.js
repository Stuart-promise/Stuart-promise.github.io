import {choices, newFlight, rollFlight, moveFlight} from "./flight-engine.mjs";
const $=id=>document.getElementById(id);
const colors=["#b83b30","#2674a5","#bd8618","#35794e"];
const labels=["红","蓝","黄","绿"];
const prefix="234-pet-flight-peer-v1-";
let room=null, code="", busy=false, peer=null, link=null, timer=null;
let isHost=false;
const svg=$("flight-board"), ns="http://www.w3.org/2000/svg";
function node(tag,attrs,text){
  const element=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs))element.setAttribute(k,v);
  if(text!==undefined)element.textContent=text;
  return element;
}
function track(i){
  i=(i+52)%52;
  const side=Math.floor(i/13),t=(i%13)/13;
  return [[95+310*t,95],[405,95+310*t],[405-310*t,405],[95,405-310*t]][side];
}
function airport(seat,pawn){
  const corners=[[43,43],[457,43],[457,457],[43,457]];
  return [corners[seat][0]+(pawn%2 ? 15:-15),corners[seat][1]+(pawn<2 ? -15:15)];
}
function position(seat,pos,pawn){
  if(pos<0)return airport(seat,pawn);
  if(pos<52)return track(seat*13+pos);
  const start=track(seat*13),t=(pos-51)/7;
  return [start[0]+(250-start[0])*t,start[1]+(250-start[1])*t];
}
function renderBoard(){
  svg.replaceChildren();
  svg.append(node("rect",{x:5,y:5,width:490,height:490,rx:24,fill:"#f6efd9"}));
  for(let seat=0;seat<2;seat++){
    const [x,y]=airport(seat,0),[xx,yy]=airport(seat,3);
    svg.append(node("rect",{x:Math.min(x,xx)-18,y:Math.min(y,yy)-18,width:66,height:66,rx:16,fill:colors[seat],opacity:".13"}));
    for(let p=52;p<=57;p++){
      const [cx,cy]=position(seat,p,0);
      svg.append(node("circle",{cx,cy,r:10,fill:colors[seat],opacity:".24",stroke:colors[seat]}));
    }
  }
  for(let i=0;i<52;i++){
    const [cx,cy]=track(i);
    const flightSeat=[0,1,2,3].find(seat=>(seat*13+16)%52===i);
    const color=flightSeat??i%4;
    svg.append(node("circle",{cx,cy,r:10,fill:colors[color],opacity:".7"}));
    if(flightSeat!==undefined)svg.append(node("text",{x:cx,y:cy+4,"text-anchor":"middle","font-size":12,fill:"white"},"✈"));
  }
  svg.append(node("circle",{cx:250,cy:250,r:28,fill:"#fffaf0",stroke:"#a2916e","stroke-width":2}));
  svg.append(node("text",{x:250,y:255,"text-anchor":"middle","font-size":16,fill:"#655638"},"终点"));
  svg.append(node("text",{x:250,y:145,"text-anchor":"middle","font-size":14,fill:"#655638"},"顺时针飞行 →"));
  const game=room?.flight;
  const seats=game ? game.players : (room?.players||[false,false]).flatMap((present,i)=>present?[i]:[]);
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
      const group=node("g",{class:"plane"+(active?" available":""),role:"button",tabindex:active?0:-1,"aria-label":labels[seat]+"方"+(pawn+1)+"号飞机"+(pos===57?"，已到终点":""),"aria-disabled":String(!active)});
      group.append(node("circle",{cx,cy,r:12,fill:"#fffaf0",stroke:colors[seat],"stroke-width":active?4:2}));
      group.append(node("text",{x:cx,y:cy+4,"text-anchor":"middle","font-size":12,"font-weight":700,fill:colors[seat]},pawn+1));
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
  $("tools").hidden=!room;
  $("room-label").textContent="房间 "+code;
  const seats=room?.players||[false,false];
  $("seats").textContent=seats.filter(Boolean).length+" / 2 人";
  $("players").replaceChildren();
  seats.forEach((present,seat)=>{
    const li=document.createElement("li");
    li.style.borderLeft="5px solid "+colors[seat];
    li.textContent=labels[seat]+"方 · "+(present?(seat===room.seat?"你":"已入座"):"等待加入")+(seat===0?" · 房主":"");
    $("players").append(li);
  });
  const game=room?.flight;
  const playing=room?.phase==="playing", mine=playing && game.players[game.turn]===room.seat;
  $("start").hidden=!game || game.winner===null;
  $("start").disabled=busy || !room || room.seat!==0 || room.phase==="closed" || seats.filter(Boolean).length<2;
  $("start").textContent=game?.winner!==null && game ? "房主再开一局":"等待好友加入";
  $("roll").disabled=busy || !mine || game.die!==null || game.winner!==null;
  $("dice").textContent=game?.die ?? "✈";
  $("status").textContent=!room?"创建或加入房间，邀请朋友入座":room.phase==="closed"?"房间已关闭":game?.winner!==null && game?labels[game.players[game.winner]]+"方获胜！":playing?(mine?"轮到你":"轮到"+labels[game.players[game.turn]]+"方")+(game.die===null?"掷骰子":"选择飞机"):"等待玩家入座";
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
    else {room.flight=newFlight([0,1]);room.version++;}
  } else if(room.flight.players[room.flight.turn]!==seat) error="请等待对方操作。";
  else {
    const valid=action==="roll" ? rollFlight(room.flight,randomDie()) :
      action==="plane" && moveFlight(room.flight,extra.pawn);
    if(valid)room.version++;
    else error="当前不能进行此操作。";
  }
  sendState(error);
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
      room={seat:0,version:0,phase:"playing",players:[true,true],flight:newFlight([0,1])};
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
function enter(host) {
  if(busy||room)return;
  isHost=host;
  code=host?String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0"):$("code").value;
  room={seat:host?0:1,phase:"connecting",version:0,players:host?[true,false]:[false,true],flight:null};
  render();note(host?"正在创建房间…":"正在连接房主…");
  timer=setTimeout(()=>closeRoom("连接超时，请检查网络后重新开房。"),25000);
  try {
    const current=host?new Peer(prefix+code):new Peer();
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
      const messages={"peer-unavailable":"找不到房间，请确认房主在线并核对邀请码。","unavailable-id":"房间码已占用，请重新创建。"};
      closeRoom(messages[error.type]||"无法建立连接，请检查网络或使用新版浏览器。");
    });
    current.on("disconnected",()=>{
      if(peer===current && room.phase!=="playing")closeRoom("房间服务已断开，请重新开房。");
    });
  } catch { closeRoom("当前浏览器无法连接，请使用新版浏览器。"); }
}
$("create").onclick=()=>enter(true);
$("entry").onsubmit=event=>{event.preventDefault();enter(false);};
$("start").onclick=()=>command("start");
$("roll").onclick=()=>command("roll");
$("invite").onclick=async()=>{
  const url=new URL("./flight.html?v=peer1&room="+code,location.href).href;
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
  if(room && !leave())event.preventDefault();
};
const invite=new URLSearchParams(location.search).get("room");
if(/^[0-9]{6}$/.test(invite||""))$("code").value=invite;
render();
