const $=id=>document.getElementById(id);
const COLORS={red:{name:'红色',symbol:'●'},yellow:{name:'黄色',symbol:'★'},green:{name:'绿色',symbol:'▲'},blue:{name:'蓝色',symbol:'◆'}};
const FACES={skip:'⊘',reverse:'↺',draw2:'+2',wild:'✦',wild4:'+4'};
const VALUES={skip:'跳过',reverse:'反转',draw2:'加二',wild:'变色',wild4:'变色加四'};
const KEY='pet234:uno:resume:v1';
let socket=null,state=null,credentials=null,connection='idle',generation=0,pending=null;
let heartbeat,connectTimeout,retryTimer,actionTimeout,retryDeadline=0,retryCount=0,lastMessage=0,receivedAt=0;
let selected=null,declareArmed=false,handKey='',logKey='',suspended=false,nicknameEdited=false,storeWarning=false;
const element=(tag,className,content)=>{const e=document.createElement(tag);if(className)e.className=className;if(content!==undefined)e.textContent=content;return e;};
const note=text=>{$('notice').textContent=text;};
const codeOf=raw=>String(raw||'').normalize('NFKC').trim().toUpperCase().replace(/^R/,'');
const invited=codeOf(new URL(location.href).searchParams.get('room'));
const me=()=>state?.players?.[state.you];
const live=()=>connection==='online'&&socket?.readyState===WebSocket.OPEN;
const canAct=()=>live()&&!pending&&!!state;
const cardName=card=>(card.color?COLORS[card.color]?.name+' '+COLORS[card.color]?.symbol+' ':'')+(VALUES[card.value]||card.value);
function randomId(){const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
function persist(){try{if(credentials)sessionStorage.setItem(KEY,JSON.stringify(credentials));else sessionStorage.removeItem(KEY);}catch{storeWarning=true;}}
function readSaved(){try{const value=JSON.parse(sessionStorage.getItem(KEY));return value&&/^\d{6}$/.test(value.code)&&typeof value.token==='string'&&value.token.length>=24&&value.token.length<256?{code:value.code,token:value.token,name:String(value.name||'')}:null;}catch{return null;}}
function closeDialog(id){const dialog=$(id);if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
function openDialog(id){const dialog=$(id);if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();}else dialog.setAttribute('open','');}
function clearTimers(){clearInterval(heartbeat);clearTimeout(connectTimeout);clearTimeout(retryTimer);clearTimeout(actionTimeout);}
function stop(message=''){
  ++generation;clearTimers();const old=socket;socket=null;if(old)old.close();
  connection='idle';state=null;credentials=null;pending=null;retryDeadline=0;selected=null;declareArmed=false;handKey='';logKey='';persist();
  closeDialog('color-dialog');closeDialog('leave-dialog');$('invite-fallback').hidden=true;$('invite-fallback').value='';render();if(message)note(message);
}
function send(packet){if(socket?.readyState!==WebSocket.OPEN)return false;try{socket.send(JSON.stringify(packet));return true;}catch{return false;}}
function reconnect(){
  if(!credentials||suspended)return;
  clearTimeout(retryTimer);
  if(!retryDeadline)retryDeadline=Date.now()+90000;
  if(Date.now()>=retryDeadline){stop('连接未能及时恢复，已退出本页房间。请重新创建或加入房间。');return;}
  connection='reconnecting';pending=null;render();
  if(!navigator.onLine)return;
  retryTimer=setTimeout(()=>connect('resume'),Math.min(5000,800*Math.pow(1.6,retryCount++)));
}
function connect(mode,code){
  if(mode!=='resume'){
    let name=$('nickname').value.normalize('NFKC').trim();if(!name)name='玩家';
    if(Array.from(name).length>16||/[\p{Cc}\p{Cf}]/u.test(name)){note('昵称请使用 1—16 个可见文字。');return;}
    if(mode==='join'&&!/^\d{6}$/.test(codeOf(code))){note('请输入好友分享的 6 位数字房间码。');return;}
    if(!globalThis.crypto?.getRandomValues){note('请使用支持安全随机数的新版浏览器。');return;}
    pending=null;state=null;selected=null;declareArmed=false;handKey='';logKey='';retryDeadline=0;retryCount=0;note('');
    credentials=null;persist();
    code=codeOf(code);
    connect.hello={type:'hello',version:1,mode,name,...(mode==='join'?{code}:{})};
  }else if(!credentials)return;
  ++generation;const run=generation;clearTimers();const old=socket;socket=null;if(old)old.close();
  if(mode==='resume'&&!retryDeadline)retryDeadline=Date.now()+90000;
  connection=mode==='resume'?'reconnecting':'connecting';render();
  let url;
  try{
    url=new URL('/v1/uno/ws',window.ROOM_SERVER);
    if(!['https:','http:'].includes(url.protocol)||(location.protocol==='https:'&&url.protocol!=='https:'))throw Error();
    url.protocol=url.protocol==='https:'?'wss:':'ws:';
    socket=new WebSocket(url);
  }catch{stop('房间服务未能加载，请刷新页面后重试。');return;}
  const current=socket;let welcomed=false;
  connectTimeout=setTimeout(()=>{if(run!==generation)return;current.close();if(credentials)reconnect();else stop('连接房间超时，请检查网络后重试。');},12000);
  current.onopen=()=>{
    if(run!==generation)return;lastMessage=Date.now();
    send(mode==='resume'?{type:'hello',version:1,mode:'resume',code:credentials.code,token:credentials.token}:connect.hello);
    heartbeat=setInterval(()=>{
      if(run!==generation)return;
      if(Date.now()-lastMessage>50000){current.close();return;}
      send({type:'ping'});
    },15000);
  };
  current.onmessage=event=>{
    if(run!==generation)return;lastMessage=Date.now();let packet;
    try{packet=JSON.parse(event.data);}catch{current.close();return;}
    if(packet.type==='welcome'){
      if(packet.version!==1||!/^\d{6}$/.test(packet.code)||typeof packet.token!=='string'){stop('房间版本不一致，请刷新页面。');return;}
      credentials={code:packet.code,token:packet.token,name:mode==='resume'?credentials?.name||'玩家':connect.hello.name};persist();welcomed=true;
    }else if(packet.type==='state'){
      if(!welcomed||!Array.isArray(packet.players)||!Array.isArray(packet.hand))return;
      clearTimeout(connectTimeout);connection='online';retryCount=0;retryDeadline=0;
      if(pending&&packet.revision>=pending.revision+1){pending=null;clearTimeout(actionTimeout);}
      if(!state||state.turn!==packet.turn||state.phase!==packet.phase||state.hand?.length!==packet.hand.length)declareArmed=false;
      if(state?.phase==='playing'&&packet.phase==='lobby')note(packet.log?.[packet.log.length-1]?.text||'本局已取消，重新邀请三位玩家准备后即可开局。');
      state=packet;receivedAt=Date.now();if(!state.hand.some(c=>c.id===selected))selected=null;
      if(state.paused||state.turn!==state.you||!state.playable.includes(selected))closeDialog('color-dialog');
      render();
      if(storeWarning){note('浏览器不允许保存临时座位，当前可正常玩；刷新页面后可能无法恢复。');storeWarning=false;}
    }else if(packet.type==='ack'){
      if(pending?.id===packet.id&&state?.revision>=packet.revision){pending=null;clearTimeout(actionTimeout);render();}
    }else if(packet.type==='error'){
      pending=null;clearTimeout(actionTimeout);note(packet.message||'操作未完成，请稍后重试。');
      if(packet.fatal){stop(packet.message||'房间已结束，请重新加入。');return;}
      render();send({type:'sync'});
    }
  };
  current.onclose=event=>{
    if(run!==generation)return;clearInterval(heartbeat);clearTimeout(connectTimeout);clearTimeout(actionTimeout);pending=null;
    if(event.reason==='connection-replaced'){stop('这个座位已在另一页面恢复，本页已退出连接。');return;}
    if(credentials)reconnect();else stop('房间连接已关闭，请重新创建或加入。');
  };
  current.onerror=()=>{};
}
function action(actionName,extra={}){
  if(!canAct())return;
  const id=randomId();pending={id,revision:state.revision};
  if(!send({type:'action',id,revision:state.revision,action:actionName,...extra})){pending=null;socket?.close();reconnect();return;}
  actionTimeout=setTimeout(()=>{if(!pending||pending.id!==id)return;pending=null;send({type:'sync'});note('正在核对牌局状态，请稍候。');render();},10000);
  render();
}
function cardFace(card,tag='div'){
  const node=element(tag,'card color-'+(card?.color||'wild'));
  if(!card){node.classList.add('is-back');node.append(element('span','card-center','UNO'));return node;}
  const face=FACES[card.value]||card.value;
  node.append(element('span','card-corner',face),element('span','card-center',face),element('span','card-symbol',card.color?COLORS[card.color].symbol:'● ◆ ★ ▲'));
  node.setAttribute('aria-label',cardName(card));return node;
}
function drawHand(){
  const key=JSON.stringify(state.hand);
  if(key!==handKey){
    const scroll=$('hand-list').scrollLeft;handKey=key;
    $('hand-list').replaceChildren(...state.hand.map(card=>{
      const button=cardFace(card,'button');button.type='button';button.dataset.cardId=card.id;
      button.onclick=()=>{selected=selected===card.id?null:card.id;renderHandControls();};return button;
    }));
    $('hand-list').scrollLeft=scroll;
  }
  renderHandControls();
}
function renderHandControls(){
  if(!state)return;
  const eligible=canAct()&&state.phase==='playing'&&!state.paused;
  for(const card of $('hand-list').children){
    const legal=state.playable.includes(card.dataset.cardId);
    card.classList.toggle('selected',card.dataset.cardId===selected);card.classList.toggle('playable',eligible&&legal);
    card.disabled=!eligible;card.setAttribute('aria-pressed',String(card.dataset.cardId===selected));
  }
  const chosen=state.hand.find(card=>card.id===selected);
  $('selected-card-label').textContent=chosen?'已选 '+cardName(chosen)+(state.playable.includes(selected)?'':' · 当前不能出这张'):state.turn===state.you?'点击手牌选中，再点击「出牌」。':'等待你的回合，可以看看自己的手牌。';
  $('play-card').disabled=!eligible||!chosen||!state.playable.includes(selected);
  $('draw-card').disabled=!eligible||!state.canDraw;$('draw-pile').disabled=$('draw-card').disabled;
  $('pass-turn').disabled=!eligible||!state.canPass;
  $('pass-turn').hidden=!state.canPass;
  const canDeclare=eligible&&(state.catchSeat===state.you||(state.turn===state.you&&state.hand.length===2));
  $('uno-button').disabled=!canDeclare;$('uno-button').classList.toggle('armed',declareArmed);$('uno-button').setAttribute('aria-pressed',String(declareArmed));
  $('uno-button').textContent=state.catchSeat===state.you?'补喊 UNO！':declareArmed?'UNO 已准备 ✓':me()?.uno&&state.hand.length===1?'已喊 UNO ✓':'喊 UNO！';
  $('catch-uno').disabled=!eligible||state.catchSeat===null||state.catchSeat===undefined||state.catchSeat===state.you;
  $('catch-uno').hidden=state.catchSeat===null||state.catchSeat===undefined||state.catchSeat===state.you;
  $('catch-uno').textContent=state.catchSeat!==null&&state.catchSeat!==undefined&&state.catchSeat!==state.you?'抓漏喊 · '+(state.players[state.catchSeat]?.name||'好友'):'抓漏喊';
}
function connectionText(){
  if(connection==='connecting')return '正在连接房间…';
  if(connection==='reconnecting')return '连接中断，正在恢复座位…';
  if(connection==='idle')return '创建房间，邀请两位好友一起玩。';
  return state?.paused?'有人暂时掉线 · 牌局已暂停':'云房间已连接 · '+(state?.players.filter(Boolean).length||1)+' / 3 人';
}
function renderConnection(){
  $('connection-status').textContent=connectionText();
  let text='';
  if(connection==='reconnecting')text='请保持页面打开。短暂断线后会自动恢复；剩余约 '+Math.max(0,Math.ceil((retryDeadline-Date.now())/1000))+' 秒。';
  else if(state?.paused){text=(state.disconnects||[]).map(d=>(state.players[d.seat]?.name||'好友')+'：约 '+Math.max(0,Math.ceil(d.seconds-(Date.now()-receivedAt)/1000))+' 秒内可回来').join('；');}
  $('connection-note').textContent=text;$('connection-note').hidden=!text;
}
function render(){
  const active=connection!=='idle';
  $('lobby').hidden=active;$('room-panel').hidden=!active;
  $('create-room').disabled=active;$('join-room').disabled=active;
  $('room-code').textContent=credentials?.code||'------';
  $('copy-invite').disabled=!credentials;$('copy-code').disabled=!credentials;
  $('waiting-room').hidden=!state||state.phase==='playing';
  $('table-section').hidden=!state||state.phase!=='playing';
  $('round-end').hidden=!state||state.phase!=='finished';
  renderConnection();
  if(!state)return;
  $('seats').replaceChildren(...[0,1,2].map(seat=>{
    const player=state.players[seat],card=element('article','seat-card'+(seat===state.you?' is-me':'')+(player&&!player.online?' offline':''));
    card.append(element('span','seat-number','0'+(seat+1)),element('strong','seat-name',player?player.name+(seat===state.you?' · 你':''):'等待好友'),element('span','seat-status',player?(seat===state.host?'房主 · ':'')+(player.online?(player.ready?'已准备':'未准备'):'暂时离线'):'分享邀请链接即可加入'));
    return card;
  }));
  $('ready-button').hidden=state.phase==='finished';$('ready-button').disabled=!canAct();
  $('ready-button').textContent=me()?.ready?'取消准备':'我准备好了';
  $('start-game').hidden=state.you!==state.host;$('start-game').disabled=!canAct()||!state.canStart;
  $('start-game').textContent=state.phase==='finished'?'开始下一局':'三人就位，开始发牌';
  $('waiting-note').textContent=state.canStart?(state.you===state.host?'大家都准备好了，点击开始发牌。':'大家都准备好了，等待房主发牌。'):'需要三位玩家全部在线并准备。离开后空位可以由好友加入。';
  if(state.phase==='finished'){
    $('winner-name').textContent=state.players[state.winner]?.name||'本局结束';
    $('result-detail').textContent=state.winner===state.you?'你先出完了所有手牌，赢下这一局！':'对方先出完了手牌。准备好后，可以再来一局。';
    $('play-again').disabled=!canAct();$('play-again').textContent=me()?.ready?'已准备 · 点击取消':'准备再玩一局';
  }
  if(state.phase!=='playing')return;
  $('opponents').replaceChildren(...[1,2].map(offset=>{
    const seat=(state.you+offset)%3,player=state.players[seat],card=element('article','opponent'+(state.turn===seat?' is-turn':'')+(!player?.online?' offline':''));
    card.append(element('strong','opponent-name',player?.name||'空位'),element('span','opponent-status',player?.online?(state.turn===seat?'正在出牌':player.uno?'已喊 UNO':'等待回合'):'暂时离线'),element('span','opponent-count',String(player?.count||0)+' 张'));
    return card;
  }));
  $('turn-status').textContent=state.paused?'等待好友重连，暂停出牌':state.turn===state.you?(state.drawnId?'已抽一张：出这张牌或结束回合':'轮到你了'):'轮到 '+(state.players[state.turn]?.name||'好友');
  const color=COLORS[state.color];$('current-color').textContent=color?color.symbol+' '+color.name:'等待发牌';$('current-color').dataset.color=state.color||'';
  $('direction-label').textContent=state.direction===1?'顺时针 ↻':'逆时针 ↺';
  $('discard-pile').replaceChildren(cardFace(state.top));$('deck-count').textContent=String(state.deckCount??'');
  $('hand-count').textContent=state.hand.length+' 张';drawHand();
  const logs=state.log||[];const newLog=JSON.stringify(logs);
  if($('event-log')&&newLog!==logKey){logKey=newLog;$('event-log').replaceChildren(...logs.slice(-6).reverse().map(entry=>element('li','',entry.text)));}
}
function play(color){
  const card=state?.hand.find(c=>c.id===selected);if(!card||!state.playable.includes(card.id)||!canAct()||state.paused)return;
  if(!card.color&&!color){openDialog('color-dialog');return;}
  closeDialog('color-dialog');action('play',{cardId:card.id,...(color?{color}:{}),declare:declareArmed});
}
function invite(){const url=new URL('./',location.href);url.searchParams.set('room',credentials.code);return url.href;}
async function copy(text){
  try{await navigator.clipboard.writeText(text);$('invite-fallback').hidden=true;note('已复制，可以发给两位好友。');}
  catch{$('invite-fallback').value=text;$('invite-fallback').hidden=false;$('invite-fallback').focus();$('invite-fallback').select();note('请长按下方内容复制后分享。');}
}
$('nickname').oninput=()=>nicknameEdited=true;
$('create-room').onclick=()=>connect('create');
$('join-form').onsubmit=event=>{event.preventDefault();connect('join',$('room-input').value);};
$('room-input').oninput=()=>{$('room-input').value=codeOf($('room-input').value).replace(/\D/g,'').slice(0,6);};
$('copy-invite').onclick=()=>{if(credentials)copy(invite());};$('copy-code').onclick=()=>{if(credentials)copy(credentials.code);};
$('ready-button').onclick=()=>action('ready',{ready:!me()?.ready});$('play-again').onclick=()=>action('ready',{ready:!me()?.ready});
$('start-game').onclick=()=>action('start');$('play-card').onclick=()=>play();
$('draw-card').onclick=()=>action('draw');$('draw-pile').onclick=$('draw-card').onclick;$('pass-turn').onclick=()=>action('pass');
$('uno-button').onclick=()=>{if(state?.catchSeat===state.you)action('uno');else{declareArmed=!declareArmed;renderHandControls();}};
$('catch-uno').onclick=()=>action('catch');
for(const button of $('color-options').querySelectorAll('button[data-color]'))button.onclick=()=>play(button.dataset.color);
$('cancel-color').onclick=()=>closeDialog('color-dialog');
$('leave-room').onclick=()=>openDialog('leave-dialog');$('cancel-leave').onclick=()=>closeDialog('leave-dialog');
$('confirm-leave').onclick=()=>{
  if(live()&&state)send({type:'action',id:randomId(),revision:state.revision,action:'leave'});
  stop('已退出房间。');const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);
};
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else note('这个浏览器暂不支持网页全屏，横屏也可以直接玩。');}
  catch{note('未能进入全屏，可以直接在当前页面继续玩。');}
};
window.addEventListener('offline',()=>{if(socket)socket.close();if(credentials)reconnect();});
window.addEventListener('online',()=>{if(credentials&&!live()&&!suspended){clearTimeout(retryTimer);connect('resume');}});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)return;
  if(live()){if(Date.now()-lastMessage>45000)socket.close();else{send({type:'ping'});send({type:'sync'});}}
  else if(credentials&&!suspended){clearTimeout(retryTimer);connect('resume');}
});
window.addEventListener('pagehide',()=>{suspended=true;clearTimers();socket?.close();});
window.addEventListener('pageshow',event=>{suspended=false;if(event.persisted&&credentials)connect('resume');});
setInterval(()=>{if(connection==='reconnecting'||state?.paused)renderConnection();},1000);
if(/^\d{6}$/.test(invited)){$('room-input').value=invited;note('好友的房间码已填好，输入昵称后点击加入。');}
credentials=readSaved();
if(credentials&&/^\d{6}$/.test(invited)&&credentials.code!==invited){credentials=null;persist();}
render();
if(credentials)connect('resume');
window.PetAccount?.ready.then(()=>{if(!nicknameEdited&&connection==='idle')$('nickname').value=Array.from(window.PetAccount.profile?.nickname||window.PetAccount.session?.user?.username||'').slice(0,16).join('');}).catch(()=>{});
