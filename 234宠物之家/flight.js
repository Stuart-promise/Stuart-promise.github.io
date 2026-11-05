import {choices} from "./flight-engine.mjs";
const $=id=>document.getElementById(id);
const colors=["#b83b30","#2674a5","#bd8618","#35794e"];
const labels=["红","蓝","黄","绿"];
const key="pet234-flight-duo-room";
let room=null, token="", code="", busy=false, timer=null, generation=0, lastVersion=-1;
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
  $("log").textContent=game?.log||"掷骰结果由服务器生成，所有玩家同步显示。";
  $("plane-controls").replaceChildren();
  if(mine && !busy)for(const pawn of choices(game)){
    const button=document.createElement("button");
    button.textContent="移动 "+(pawn+1)+" 号";
    button.onclick=()=>command("plane",{pawn});
    $("plane-controls").append(button);
  }
  renderBoard();
}
function save(){
  try{if(room && room.phase!=="closed")sessionStorage.setItem(key,JSON.stringify({code,token}));else sessionStorage.removeItem(key);}catch{}
}
async function api(message){
  const response=await fetch(window.ROOM_SERVER+"/v1/rooms/flight/"+code,{
    method:message?"POST":"GET",headers:{"Authorization":"Bearer "+token,...(message?{"Content-Type":"application/json"}:{})},
    body:message?JSON.stringify(message):undefined,cache:"no-store",signal:AbortSignal.timeout(10000)
  });
  const data=await response.json();
  if(!response.ok){const e=new Error(data.error||"服务暂不可用");e.status=response.status;throw e;}
  return data;
}
function apply(data){
  if(data.version<lastVersion)return;
  lastVersion=data.version;room=data;save();render();
  $("note").textContent=data.phase==="closed"?"房间已结束，请返回大厅创建新房间。":data.phase==="waiting"?"等待另一位玩家加入，入座后自动开始。":"你是"+labels[data.seat]+"方。刷新页面可恢复本局。";
}
function schedule(){
  clearTimeout(timer);
  if(room && room.phase!=="closed")timer=setTimeout(poll,1200);
}
async function poll(){
  if(busy)return schedule();
  const session=generation;
  try{const data=await api();if(session===generation)apply(data);}
  catch(e){if(session===generation){$("note").textContent=e.status?e.message:"网络暂时断开，正在自动重连…";if([401,404,410].includes(e.status)){room.phase="closed";save();render();}}}
  if(session===generation)schedule();
}
async function command(action,extra={}){
  if(busy)return;
  const session=generation;
  busy=true;clearTimeout(timer);render();
  const message={action,version:room?.version,id:crypto.randomUUID(),...extra};
  try{
    let data;
    for(let attempt=0;attempt<3;attempt++){
      try{data=await api(message);break;}catch(e){if(e.status||attempt===2)throw e;}
    }
    if(session===generation)apply(data);
  }catch(e){if(session===generation)$("note").textContent=e.status?e.message:"当前网络无法连接房间服务，请检查网络后重试。";}
  finally{if(session===generation){busy=false;render();schedule();}}
}
async function enter(create){
  if(busy)return;
  generation++;lastVersion=-1;room=null;
  code=create?String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,"0"):$("code").value;
  token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
  await command(create?"create":"join");
}
$("create").onclick=()=>enter(true);
$("entry").onsubmit=e=>{e.preventDefault();enter(false);};
$("start").onclick=()=>command("start");
$("roll").onclick=()=>command("roll");
$("invite").onclick=async()=>{
  const url=new URL("./flight.html?v=flight2&room="+code,location.href).href;
  try{await navigator.clipboard.writeText(url);$("note").textContent="邀请链接已复制。";}catch{prompt("复制邀请链接",url);}
};
async function leave(){
  if(busy)return false;
  if(room && room.phase!=="closed"){
    if(room.phase==="playing" && !confirm("退出会结束本局，确定退出？"))return false;
    await command("leave");
  }
  generation++;clearTimeout(timer);room=null;token="";code="";lastVersion=-1;save();render();return true;
}
$("leave").onclick=leave;
$("home-link").onclick=async e=>{e.preventDefault();if(await leave())location.href=e.currentTarget?.href||"./?v=flight2";};
const invite=new URLSearchParams(location.search).get("room");
if(/^[0-9]{6}$/.test(invite||""))$("code").value=invite;
render();
try{
  const stored=JSON.parse(sessionStorage.getItem(key));
  if(stored && /^[0-9]{6}$/.test(stored.code) && /^[a-f0-9]{64}$/.test(stored.token) && (!invite||invite===stored.code)){
    code=stored.code;token=stored.token;room={phase:"waiting",players:[],seat:0,version:-1};poll();
  }
}catch{}
