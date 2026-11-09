const A=window.PetAccount,$=id=>document.getElementById(id),key='pet234:hidden-pass:v1';let pass=null,timer;
try{pass=JSON.parse(sessionStorage.getItem(key));}catch{}
function forget(message=''){pass=null;clearTimeout(timer);try{sessionStorage.removeItem(key);}catch{}$('hidden-content').hidden=true;$('hidden-games').replaceChildren();$('hidden-title').textContent='';$('hidden-copy').textContent='';$('hidden-gate').hidden=false;$('hidden-message').textContent=message;}
async function content(){
 const current=pass;
 const data=await A.request('/v1/hidden/content',{headers:{'X-Hidden-Token':current.token}});
 if(pass!==current)return;
 $('hidden-title').textContent=data.title;$('hidden-copy').textContent='挑选一款游戏，享受安静的游玩时光。';
 if(!$('hidden-games').firstChild){
  const card=document.createElement('a');card.className='hidden-game-card';card.href='./probably-stolen/';
  const cover=document.createElement('img');cover.src='./probably-stolen/cover.jpg';cover.alt='Probably Stolen 的像素风店铺';
  const title=document.createElement('h3');title.textContent='Probably Stolen';
  const description=document.createElement('p');description.textContent='经营你的店铺，接待顾客，鉴别来路不明的货物。';
  const action=document.createElement('span');action.textContent='单人 · 电脑游玩　进入店铺 ↗';
  card.append(cover,title,description,action);$('hidden-games').append(card);
  const stardew=document.createElement('a');stardew.className='hidden-game-card';stardew.href='https://111.228.4.20/hidden-games/launch';
  const farmCover=document.createElement('img');farmCover.src='./stardew-cover.png';farmCover.alt='星露谷物语原版农场画面';farmCover.loading='lazy';
  const farmTitle=document.createElement('h3');farmTitle.textContent='星露谷物语 · Stardew Valley';
  const farmDescription=document.createElement('p');farmDescription.textContent='开启原版单人农场生活。睡觉后自动保存到本机浏览器，可在游戏菜单导出存档。';
  const farmAction=document.createElement('span');farmAction.textContent='单人 · 电脑键鼠 · 首次加载较久　进入农场 ↗';
  stardew.append(farmCover,farmTitle,farmDescription,farmAction);$('hidden-games').append(stardew);
  let launching=false;
  stardew.onclick=async event=>{event.preventDefault();if(launching||!pass)return;launching=true;const entryPass=pass;farmAction.textContent='正在准备进入农场…';try{const grant=await A.request('/v1/hidden/game-ticket',{method:'POST',headers:{'X-Hidden-Token':entryPass.token}});if(pass!==entryPass)return;location.assign('https://111.228.4.20/hidden-games/launch#ticket='+encodeURIComponent(grant.ticket));}catch(error){$('hidden-message').textContent=error.message;}finally{launching=false;farmAction.textContent='单人 · 电脑键鼠 · 首次加载较久　进入农场 ↗';}};
 }
 $('hidden-content').hidden=false;$('hidden-gate').hidden=true;$('hidden-message').textContent='';
 clearTimeout(timer);timer=setTimeout(()=>forget('通行已过期，请重新输入密码。'),Math.max(0,pass.expires*1000-Date.now()));
}
$('hidden-unlock').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('hidden-message').textContent='正在验证…';try{pass=await A.request('/v1/hidden/unlock',{method:'POST',body:JSON.stringify({password:$('hidden-password').value})});$('hidden-password').value='';try{sessionStorage.setItem(key,JSON.stringify(pass));}catch{}await content();}catch(error){forget(error.message);}finally{button.disabled=false;}};
$('hidden-lock').onclick=async()=>{const token=pass?.token;forget('空间已锁定。');if(token)try{await A.request('/v1/hidden/lock',{method:'POST',headers:{'X-Hidden-Token':token}});}catch{}};
async function refresh(){if(!pass)return;try{await content();}catch(e){forget(e.message);}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},60000);
await A.ready;
try{const status=await A.request('/v1/hidden/status');$('hidden-status').textContent=status.enabled?'密码由站长统一设置，验证后本标签页可访问 4 小时。':'站长暂未设置访问密码，请稍后再来。';if(pass)await refresh();}catch(e){$('hidden-status').textContent=e.message;}
