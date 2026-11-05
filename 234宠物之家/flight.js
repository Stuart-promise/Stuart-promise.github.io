import {choices, newFlight, rollFlight, moveFlight, flightTrackIndex} from "./flight-engine.mjs?v=cross1";
const $=id=>document.getElementById(id);
const colors=["#b83b30","#2674a5","#bd8618","#35794e"];
const labels=["红","蓝","黄","绿"];
const prefix="234-pet-flight-cross-v1-";
let room=null, code="", busy=false, peer=null, link=null, timer=null;
let isHost=false;
const svg=$("flight-board"), ns="http://www.w3.org/2000/svg";
function node(tag,attrs,text){
  const element=document.createElementNS(ns,tag);
  for(const [k,v] of Object.entries(attrs))element.setAttribute(k,v);
  if(text!==undefined)element.textContent=text;
  return element;
}

// Clockwise circuit around a fifteen-by-fifteen cross.
const route = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0]
];
const cell=40, margin=30;
const center=(row,col)=>[margin+col*cell+cell/2,margin+row*cell+cell/2];
function track(i) {
  const [row,col]=route[(i+52)%52];
  return center(row,col);
}
function airport(seat,pawn) {
  const base=seat===0 ? 466 : 106;
  return [base+(pawn%2)*80,base+Math.floor(pawn/2)*80];
}
function position(seat,pos,pawn) {
  if(pos<0)return airport(seat,pawn);
  if(pos<52)return track(flightTrackIndex(seat,pos));
  return center(7,seat===0 ? 65-pos : pos-51);
}
function tile(row,col,fill,stroke="#53645e") {
  return node("rect",{x:margin+col*cell,y:margin+row*cell,width:cell,height:cell,fill,stroke,"stroke-width":1.3});
}
function renderBoard() {
  svg.replaceChildren();
  svg.append(node("rect",{x:6,y:6,width:648,height:648,rx:22,fill:"#fffdf4",stroke:"#b7c7bd","stroke-width":2}));
  const trackColors=[colors[1],colors[2],colors[0],colors[3]];
  route.forEach(([row,col],index)=>{
    const [cx,cy]=center(row,col);
    svg.append(tile(row,col,trackColors[index%4]));
    svg.append(node("circle",{cx,cy,r:12,fill:"#fffdf4",stroke:"#ffffffaa","stroke-width":1}));
  });
  for(let seat=0;seat<2;seat++) {
    const base=seat===0?9:0;
    const airportGroup=node("g",{"data-airport":seat,"aria-label":labels[seat]+"方机场"});
    airportGroup.append(node("rect",{x:margin+base*cell+4,y:margin+base*cell+4,width:232,height:232,rx:18,fill:colors[seat],stroke:"#344c43","stroke-width":3}));
    airportGroup.append(node("text",{x:margin+base*cell+120,y:margin+base*cell+207,"text-anchor":"middle","font-size":20,"font-weight":700,fill:"white"},labels[seat]+"方机场"));
    for(let pawn=0;pawn<4;pawn++) {
      const [cx,cy]=airport(seat,pawn);
      airportGroup.append(node("circle",{cx,cy,r:29,fill:"#fffdf4",stroke:"#ffffff88","stroke-width":3}));
    }
    svg.append(airportGroup);
    for(let p=52;p<=57;p++) {
      const col=seat===0?65-p:p-51;
      const [cx,cy]=position(seat,p,0);
      svg.append(tile(7,col,colors[seat]));
      svg.append(node("circle",{cx,cy,r:12,fill:"#fffdf4"}));
    }
    const [sx,sy]=position(seat,0,0);
    svg.append(node("text",{x:sx,y:sy+5,"text-anchor":"middle","font-size":17,"font-weight":700,fill:colors[seat]},"➜"));
    const [fx,fy]=position(seat,16,0);
    svg.append(node("text",{x:fx,y:fy+6,"text-anchor":"middle","font-size":20,fill:colors[seat]},"✈"));
  }
  // The remaining two corners are deliberately open, with no airport or home lane.
  svg.append(node("text",{x:510,y:125,"text-anchor":"middle","font-size":26,"font-weight":700,fill:"#345349"},"双人对角飞行"));
  svg.append(node("text",{x:510,y:157,"text-anchor":"middle","font-size":17,fill:"#64776d"},"左上蓝方 · 右下红方"));
  svg.append(node("text",{x:150,y:495,"text-anchor":"middle","font-size":23,"font-weight":700,fill:"#345349"},"5 / 6 起飞"));
  svg.append(node("text",{x:150,y:528,"text-anchor":"middle","font-size":17,fill:"#64776d"},"只有 6 可再掷一次"));
  svg.append(node("polygon",{points:"270,270 390,270 330,330",fill:"#e3c54b",stroke:"#53645e"}));
  svg.append(node("polygon",{points:"390,270 390,390 330,330",fill:colors[0],stroke:"#53645e"}));
  svg.append(node("polygon",{points:"390,390 270,390 330,330",fill:"#75a880",stroke:"#53645e"}));
  svg.append(node("polygon",{points:"270,390 270,270 330,330",fill:colors[1],stroke:"#53645e"}));
  svg.append(node("circle",{cx:330,cy:330,r:25,fill:"#fffdf4",stroke:"#53645e"}));
  svg.append(node("text",{x:330,y:336,"text-anchor":"middle","font-size":17,"font-weight":700,fill:"#345349"},"终点"));
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
      const group=node("g",{class:"plane"+(active?" available":""),role:"button",tabindex:active?0:-1,"aria-label":labels[seat]+"方"+(pawn+1)+"号飞机"+(pos===57?"，已到终点":""),"aria-disabled":String(!active)});
      group.append(node("circle",{cx,cy,r:17,fill:"#fffaf0",stroke:colors[seat],"stroke-width":active?4:2}));
      group.append(node("text",{x:cx,y:cy+6,"text-anchor":"middle","font-size":17,"font-weight":700,fill:colors[seat]},pawn+1));
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
      const messages={"room-full":"房间已经坐满，请换一个房间。","relay-unreachable":"无法连接中转服务，请尝试直连房或更换网络。","peer-unavailable":"找不到房间，请确认房主在线并核对邀请码。","unavailable-id":"房间码已占用，请重新创建。"};
      closeRoom(messages[error.type]||"无法建立连接，请检查网络或使用新版浏览器。");
    });
    current.on("disconnected",()=>{
      if(peer===current && room.phase!=="playing")closeRoom("房间服务已断开，请重新开房。");
    });
  } catch { closeRoom("当前浏览器无法连接，请使用新版浏览器。"); }
}
$("create").onclick=()=>enter(true);
$("create-relay").onclick=()=>enter(true,true);
$("entry").onsubmit=event=>{event.preventDefault();enter(false);};
$("start").onclick=()=>command("start");
$("roll").onclick=()=>command("roll");
$("invite").onclick=async()=>{
  const url=new URL("./flight.html?v=relay1&room="+code,location.href).href;
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
if(/^R?[0-9]{6}$/.test(invite||""))$("code").value=invite;
render();
