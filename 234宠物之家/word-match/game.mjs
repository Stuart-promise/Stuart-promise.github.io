import {WordMatchSession,normalizeName} from './model.mjs?v=crossplay2';

const $=id=>document.getElementById(id);
const RULES='234-word-match-v1-';
let peer=null,link=null,model=null,snapshot=null,code='',role='host';
let roomState='idle',generation=0,connectTimer,submitBusy=false,composing=false;
let lastRound='',historyKey='',nicknameEdited=false;
const note=text=>{$('notice').textContent=text;};
const text=(id,value)=>{const node=$(id);if(node)node.textContent=value;};
const roomCode=value=>String(value||'').normalize('NFKC').trim().replace(/^r/i,'');
function invitation(){const url=new URL('./',location.href);url.searchParams.set('room',code);url.searchParams.set('v','crossplay2');return url.href;}

function renderHistory(){
  const entries=snapshot?.history||[];
  $('history-section').hidden=!entries.length;
  const key=JSON.stringify(entries);
  if(key===historyKey)return;
  historyKey=key;
  const nodes=entries.slice(-200).reverse().map(entry=>{
    const row=document.createElement('li');row.className='history-row'+(entry.matched?' matched':'');
    const number=document.createElement('span');number.className='history-round';number.textContent='第 '+entry.round+' 轮';
    const pair=document.createElement('div');pair.className='history-pair';
    const order=[snapshot.seat,1-snapshot.seat];
    for(let i=0;i<2;i++){
      const seat=order[i],word=document.createElement('strong');word.textContent=entry.words[seat];
      word.title=(snapshot.names[seat]||'好友')+' 的答案';pair.append(word);
      if(i===0){const divider=document.createElement('span');divider.className='history-divider';divider.textContent=entry.matched?'＝':'·';pair.append(divider);}
    }
    row.append(number,pair);return row;
  });
  $('history-list').replaceChildren(...nodes);
}

function render(){
  const active=['connecting','waiting','paired'].includes(roomState),s=snapshot;
  $('lobby').hidden=active;
  $('room-panel').hidden=roomState==='idle';
  $('room-code').textContent=code||'------';
  $('copy-invite').disabled=!['waiting','paired'].includes(roomState);
  $('copy-code').disabled=$('copy-invite').disabled;
  $('leave-room').hidden=!active;
  $('create-room').disabled=active;$('join-room').disabled=active;
  $('game-panel').hidden=!s||s.phase==='connecting';
  text('connection-status',({idle:'准备好，和好友一起开始',connecting:'正在连接房间…',waiting:'房间已创建，等待好友加入',paired:'两人已就位 · 在线',closed:'连接已结束，可重新创建房间'})[roomState]);
  if(s){
    const me=s.seat,other=1-me,revealed=Array.isArray(s.words),closed=s.phase==='closed';
    text('round-number',s.round);
    text('my-name',s.names[me]||'我');text('their-name',s.names[other]||'好友');
    text('my-word',revealed?s.words[me]:s.myWord||'？');
    text('their-word',revealed?s.words[other]:'？');
    text('my-state',closed?'本局已结束':revealed?'答案已揭晓':s.mineSubmitted?'已提交，答案锁定':'正在想词');
    text('their-state',closed?'本局已结束':revealed?'答案已揭晓':s.theirSubmitted?'已提交，等待揭晓':'正在想词');
    $('my-word').closest('.word-card')?.classList.toggle('is-submitted',s.mineSubmitted);
    $('their-word').closest('.word-card')?.classList.toggle('is-submitted',s.theirSubmitted);
    $('word-form').hidden=['result','won','closed'].includes(s.phase);
    $('word-input').disabled=!s.canSubmit||submitBusy;
    $('submit-word').disabled=!s.canSubmit||submitBusy;
    text('submit-word',submitBusy?'正在锁定…':s.mineSubmitted?'已提交 · 等待好友':'锁定我的词 →');
    $('round-result').hidden=s.phase!=='result';
    text('result-title','还差一点点，再靠近一些');
    text('result-note','从这一轮的两个词出发，想想它们的共同点，再试一次。');
    $('next-round').disabled=s.mineReady||closed;
    text('next-round',s.mineReady?'已准备 · 等待好友':s.theirReady?'好友已准备，进入下一轮 →':'继续下一轮 →');
    text('next-status',s.mineReady?'你的好友准备好后，下一轮就会开始。':s.theirReady?'好友已经准备好了，就差你啦。':'双方都点击后进入下一轮。');
    $('victory').hidden=s.phase!=='won';
    text('matched-word',revealed?s.words[me]:'');text('total-rounds',s.round);
    $('play-again').disabled=s.mineReady||closed;
    text('play-again',s.mineReady?'已邀请 · 等待好友':s.theirReady?'好友想再玩一次 · 同意':'一起再玩一次 →');
    text('victory-status',s.mineReady?'等待好友同意后重新开始。':s.theirReady?'好友已准备再来一局。':'双方同意后开始新一局。');
    const nextKey=s.gameId+':'+s.round;
    if(s.canSubmit&&nextKey!==lastRound){
      lastRound=nextKey;$('word-input').value='';
      if(matchMedia('(pointer:fine)').matches)$('word-input').focus({preventScroll:true});
    }
  }else{
    $('round-result').hidden=true;$('victory').hidden=true;
  }
  renderHistory();
}

function closeRoom(reason){
  ++generation;clearTimeout(connectTimer);roomState='closed';submitBusy=false;
  if(model){model.close();snapshot=model.snapshot();}
  model=null;
  const old=peer;peer=null;link=null;old?.destroy();
  $('invitation-link').hidden=true;
  render();if(reason)note(reason);
}

const errors={
  'peer-unavailable':'这个房间不存在或已关闭，请让好友重新创建房间。',
  'room-full':'房间已有两个人，请核对房间码，或另外创建一个房间。',
  'unavailable-id':'这个房间号正在使用，请重新创建房间。',
  'rules-version':'双方页面版本不同，请刷新后重新创建房间。',
  'rate-limited':'连接太频繁，请稍等片刻再试。',
  'server-busy':'房间服务正忙，请稍后重试。',
  'room-expired':'等待时间较长，房间已关闭。可以重新创建房间。',
  'relay-unreachable':'暂时无法连接房间，请检查网络后重试。',
  'connection-timeout':'连接已超时，请重新创建房间并邀请好友。'
};

function connect(isHost,requestedCode,attempt=0){
  const value=roomCode(requestedCode);
  if(!/^\d{6}$/.test(value)){note('请输入好友分享的 6 位房间码。');$('room-input').focus();return;}
  if(!window.ROOM_SERVER||typeof createGamePeer!=='function'){note('房间功能加载失败，请刷新页面后重试。');return;}
  if(typeof globalThis.crypto?.subtle?.digest!=='function'||typeof globalThis.crypto?.getRandomValues!=='function'){note('请通过网站的 HTTPS 地址打开，并使用新版手机浏览器。');return;}
  let name;
  try{name=normalizeName($('nickname').value.trim()||(isHost?'房主':'好友'));}
  catch(error){note(error.message);$('nickname').focus();return;}
  ++generation;const run=generation;clearTimeout(connectTimer);peer?.destroy();model?.close();
  model=null;snapshot=null;lastRound='';historyKey='';submitBusy=false;
  roomState='connecting';code=value;role=isHost?'host':'guest';
  $('invitation-link').hidden=true;
  note('');render();
  let paired=false;
  function attach(connection){
    if(run!==generation)return;
    link=connection;
    connection.on('open',()=>{
      if(run!==generation||paired)return;paired=true;clearTimeout(connectTimer);
      roomState='paired';
      model=new WordMatchSession({role,name,
        send:packet=>{if(run!==generation||!link?.open)throw Error('连接已断开');link.send(packet);},
        onChange:()=>{if(run===generation&&model){snapshot=model.snapshot();render();}},
        onError:error=>{if(run===generation)closeRoom(typeof error==='string'?error:error?.message||'双方数据未能同步，请重新创建房间。');}
      });
      snapshot=model.snapshot();render();
      Promise.resolve(model.start()).catch(error=>{if(run===generation)closeRoom(error.message);});
      connectTimer=setTimeout(()=>{if(run===generation&&snapshot?.phase==='connecting')closeRoom('好友连接未能完成，请双方重新创建并加入房间。');},10000);
    });
    connection.on('data',packet=>{
      if(run!==generation||!model)return;
      Promise.resolve(model.handle(packet)).catch(error=>{if(run===generation)closeRoom(error.message||'双方数据未能同步，请重开房间。');});
    });
    connection.on('close',()=>{if(run===generation)closeRoom('好友已离开或网络断开，本局已停止。已揭晓的记录仍可查看。');});
  }
  peer=createGamePeer('word-match',RULES,'R'+code,isHost);
  peer.on('open',()=>{
    if(run!==generation)return;
    clearTimeout(connectTimer);
    if(isHost){roomState='waiting';render();note('把邀请链接或房间码发给好友，对方加入后就能开始。');}
    else{
      attach(peer.connect());
      connectTimer=setTimeout(()=>{if(run===generation&&!paired)closeRoom('好友连接未能完成，请重新加入。');},10000);
    }
  });
  peer.on('connection',attach);
  peer.on('error',error=>{
    if(run!==generation)return;
    if(isHost&&error.type==='unavailable-id'&&attempt<2){connect(true,createRoomCode(true).slice(1),attempt+1);return;}
    closeRoom(errors[error.type]||'房间连接中断，请检查网络后重试。');
  });
  connectTimer=setTimeout(()=>{if(run===generation&&roomState==='connecting')closeRoom('连接房间超时，请检查网络后重试。');},12000);
}

async function copy(value,success){
  try{await navigator.clipboard.writeText(value);$('invitation-link').hidden=true;note(success);}
  catch{$('invitation-link').value=value;$('invitation-link').hidden=false;$('invitation-link').focus();$('invitation-link').select();note('自动复制不可用，请长按下方内容复制后发给好友。');}
}
$('nickname').addEventListener('input',()=>nicknameEdited=true);
$('create-room').onclick=()=>connect(true,createRoomCode(true).slice(1));
$('join-form').onsubmit=event=>{event.preventDefault();connect(false,$('room-input').value);};
$('room-input').addEventListener('input',()=>{$('room-input').value=roomCode($('room-input').value).replace(/[^0-9]/g,'').slice(0,6);});
$('copy-invite').onclick=()=>copy(invitation(),'邀请链接已复制，发给好友就能加入。');
$('copy-code').onclick=()=>copy(code,'房间码已复制：'+code);
$('leave-room').onclick=()=>{closeRoom('已退出房间。可以创建新房间，再邀请好友一起玩。');const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);};
$('word-input').addEventListener('compositionstart',()=>composing=true);
$('word-input').addEventListener('compositionend',()=>composing=false);
$('word-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.isComposing||composing||event.keyCode===229))event.preventDefault();});
$('word-form').onsubmit=async event=>{
  event.preventDefault();if(!model||composing||submitBusy||!snapshot?.canSubmit)return;
  const current=model,run=generation;submitBusy=true;note('');render();
  try{await current.submit($('word-input').value);}
  catch(error){if(run===generation)note(error.message||'这个词暂时无法提交，请重试。');}
  finally{if(run===generation){submitBusy=false;if(model)snapshot=model.snapshot();render();}}
};
$('next-round').onclick=()=>{try{model?.next();}catch(error){note(error.message);}};
$('play-again').onclick=()=>{try{model?.again();}catch(error){note(error.message);}};
window.addEventListener('offline',()=>{if(['connecting','waiting','paired'].includes(roomState))closeRoom('网络已断开，本局停止。联网后请重新创建房间。');});
window.addEventListener('pagehide',()=>{if(peer)closeRoom();});
window.addEventListener('pageshow',event=>{if(event.persisted&&roomState!=='idle')closeRoom('页面已恢复，请重新开房连接好友。');});
const invited=roomCode(new URL(location.href).searchParams.get('room'));
if(/^\d{6}$/.test(invited)){$('room-input').value=invited;note('已填好好友的房间码，点击「加入房间」就能开始。');}
window.PetAccount?.ready.then(()=>{
  if(!nicknameEdited&&roomState==='idle')$('nickname').value=Array.from(PetAccount.profile?.nickname||PetAccount.session?.user.username||'').slice(0,16).join('');
}).catch(()=>{});
render();
