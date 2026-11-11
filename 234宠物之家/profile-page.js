const A=window.PetAccount,$=id=>document.getElementById(id);
const notice=t=>{$('profile-message').textContent=t;};
let catalog=[],target=null,adminLoaded=false,historyCursor=null,historyBusy=false;
function badge(title){const s=document.createElement('span');s.className='title-badge';s.dataset.color=title.color;s.textContent=title.name;return s;}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){notice(e.message);}finally{b.disabled=false;}};return b;}
function paint(){
  const p=A.profile;if(!p||!A.session)return;
  $('profile-name').textContent=p.nickname;$('profile-username').textContent='登录用户名：'+A.session.user.username;
  $('profile-level').textContent='Lv.'+p.level;
  document.querySelector('.profile-growth p').textContent=p.levelOverride?'当前享有站长专属等级；积分余额与历史获得积分独立记录。':'等级由历史累计获得积分决定，今后消费积分不会降低等级。';
  if(document.activeElement!==$('nickname'))$('nickname').value=p.nickname;
  $('profile-title').hidden=!p.equippedTitle;
  if(p.equippedTitle){$('profile-title').textContent=p.equippedTitle.name;$('profile-title').dataset.color=p.equippedTitle.color;}
  $('profile-balance').textContent=p.balance.toLocaleString();$('profile-lifetime').textContent=p.lifetimePoints.toLocaleString();$('profile-days').textContent=p.loginDays;
  $('level-caption').textContent=p.level===9?'最高等级 · 感谢一路相伴':'Lv.'+p.level+' → Lv.'+(p.level+1);
  $('level-remaining').textContent=p.level===9?'已达 9 级':'还需 '+(p.nextLevelPoints-p.lifetimePoints).toLocaleString()+' 分';
  $('level-progress').value=p.level===9?100:100*(p.lifetimePoints-p.levelFloor)/(p.nextLevelPoints-p.levelFloor);
  $('profile-streak').textContent=p.streak;
  $('checkin-status').textContent=p.checkedInToday?'今日已领取 +'+p.todayReward+' 积分 · 明天再来可得 '+p.nextReward+' 分':'今日尚未领取，连接服务器后自动发放。';
  $('retry-checkin').hidden=p.checkedInToday;
  $('reward-track').replaceChildren();
  const start=p.checkedInToday?p.streak:p.streak+1;
  for(let i=0;i<7;i++){const node=document.createElement('div');node.className='reward-day'+(i===0?' current':'');
    const day=document.createElement('span'),amount=document.createElement('strong'),caption=document.createElement('small');
    day.textContent='第 '+(start+i)+' 天';amount.textContent='+'+Math.min(30,10+2*(start+i-1));caption.textContent=i===0?(p.checkedInToday?'已领':'今天'):i===1?'明天':'积分';node.append(day,amount,caption);$('reward-track').append(node);}
  $('level-table').replaceChildren(...p.thresholds.map((n,i)=>{const cell=document.createElement('div');const lv=document.createElement('b'),points=document.createElement('span');lv.textContent='Lv.'+(i+1);points.textContent=n.toLocaleString()+' 分';if(p.level===i+1)cell.className='current';cell.append(lv,points);return cell;}));
  $('my-titles').replaceChildren();
  if(!p.titles.length){const empty=document.createElement('p');empty.className='pet-account-muted';empty.textContent='还没有称号。获得称号后会出现在这里。';$('my-titles').append(empty);}
  else {
    for(const t of p.titles){const node=document.createElement('div');node.className='title-choice';node.append(badge(t));const active=t.id===p.equippedTitle?.id;
      const b=button(active?'已佩戴':'佩戴',async()=>{const result=await A.request('/v1/profile/title',{method:'PUT',body:JSON.stringify({titleId:t.id})});A.updateProfile(result.profile);notice('称号已更新。');});b.disabled=active;node.append(b);$('my-titles').append(node);}
    if(p.equippedTitle)$('my-titles').append(button('不展示称号',async()=>{A.updateProfile((await A.request('/v1/profile/title',{method:'PUT',body:'{"titleId":null}'})).profile);notice('已取消展示称号。');}));
  }
  $('title-admin').hidden=!p.canManageTitles;
  if(p.canManageTitles&&!adminLoaded){adminLoaded=true;loadCatalog().catch(e=>{$('admin-message').textContent=e.message;adminLoaded=false;});}
}
async function loadCatalog(){
  catalog=(await A.request('/v1/admin/titles')).titles;
  $('grant-title').replaceChildren(...catalog.map(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.name;return o;}));
}
function paintTarget(){
  $('admin-user').hidden=!target;if(!target)return;
  $('admin-user-name').textContent=target.nickname+'（'+target.user.username+'）';
  $('admin-owned-titles').replaceChildren();
  if(!target.titles.length)$('admin-owned-titles').textContent='这个用户暂时没有称号。';
  for(const t of target.titles){const item=document.createElement('div');item.className='title-choice';item.append(badge(t));
    item.append(button('撤销',async()=>{if(!confirm('撤销 '+target.user.username+' 的「'+t.name+'」称号？'))return;await grant(t.id,'revoke');}));$('admin-owned-titles').append(item);}
}
async function grant(id,action){
  target=await A.request('/v1/admin/user-title',{method:'POST',body:JSON.stringify({username:target.user.username,titleId:id,action})});
  paintTarget();$('admin-message').textContent=action==='grant'?'称号已授予。用户可在个人中心佩戴。':'称号已撤销。';
  if(target.user.id===A.session.user.id)A.updateProfile((await A.request('/v1/me')).profile);
}
async function history(reset=false){
  if(historyBusy)return;historyBusy=true;$('history-more').disabled=true;
  try{const result=await A.request('/v1/points/history'+(!reset&&historyCursor?'?before='+historyCursor:''));
    if(reset)$('points-history').replaceChildren();
    for(const r of result.entries){const item=document.createElement('div');item.className='point-entry';const desc=document.createElement('div'),small=document.createElement('small'),value=document.createElement('strong');desc.textContent=r.day+' · '+(r.source==='vocab_learning'?'单词学习达标':'每日登录');small.textContent='连续第 '+r.streak+' 天 · 入账后余额 '+r.balance_after;desc.append(small);value.textContent='+'+r.amount;item.append(desc,value);$('points-history').append(item);}
    if(!$('points-history').children.length)$('points-history').textContent='暂无积分记录。';
    historyCursor=result.nextCursor;$('history-more').hidden=!historyCursor;
  }catch(e){notice(e.message);}finally{historyBusy=false;$('history-more').disabled=false;}
}
async function formTask(form,fn,messageId='profile-message'){
  const b=form.querySelector('button[type="submit"]');b.disabled=true;
  try{await fn();}catch(e){$(messageId).textContent=e.message;}finally{b.disabled=false;}
}
$('nickname-form').onsubmit=e=>{e.preventDefault();formTask(e.currentTarget,async()=>{const name=$('nickname').value.trim();A.updateProfile((await A.request('/v1/profile/nickname',{method:'PUT',body:JSON.stringify({nickname:name})})).profile);notice('昵称已保存，登录用户名不变。');});};
$('retry-checkin').onclick=async()=>{try{await A.checkIn();await history(true);}catch(e){notice(e.message);}};
$('create-title-form').onsubmit=e=>{e.preventDefault();formTask(e.currentTarget,async()=>{await A.request('/v1/admin/titles',{method:'POST',body:JSON.stringify({name:$('title-name').value.trim(),color:$('title-color').value})});$('title-name').value='';await loadCatalog();$('admin-message').textContent='新称号已创建，可以授予用户。';},'admin-message');};
$('find-user-form').onsubmit=e=>{e.preventDefault();formTask(e.currentTarget,async()=>{target=null;paintTarget();target=await A.request('/v1/admin/user?username='+encodeURIComponent($('title-username').value.trim()));paintTarget();$('admin-message').textContent='';},'admin-message');};
$('grant-title-form').onsubmit=e=>{e.preventDefault();formTask(e.currentTarget,()=>grant($('grant-title').value,'grant'),'admin-message');};
$('history-more').onclick=()=>history();
window.addEventListener('pet-account-profile',()=>{paint();history(true);});
await A.ready;
if(A.session){paint();await history(true);}
