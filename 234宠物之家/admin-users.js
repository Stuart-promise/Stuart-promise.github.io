const A=window.PetAccount,$=id=>document.getElementById(id),panel=$('users-admin');
let page=1,query='',generation=0,loaded=false;
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const modules={python:'Python 闯关','vocab-cet4':'大学四级单词','vocab-cet6':'大学六级单词',animal2048:'动物 2048',blocks:'俄罗斯方块','animal-drop':'动物合成','probably-stolen':'Probably Stolen','stardew-valley':'星露谷物语'};
const date=value=>value?new Date(value*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'暂无';
function titleBadge(title){const e=node('span','title-badge',title.name);e.dataset.color=title.color;return e;}
function memberCard(u){
  const card=node('article','member-card'),head=node('div','member-heading'),identity=node('div','member-identity');
  identity.append(node('h3','',u.nickname),node('p','pet-account-muted','登录用户名：'+u.username));
  const rank=node('span','forum-rank member-rank','Lv.'+u.level);rank.dataset.level=u.level;head.append(identity,rank);
  if(u.role==='owner')head.append(node('span','member-role','站长权限'));card.append(head);
  const labels=node('div','member-titles');labels.append(node('span','pet-account-muted','当前称号：'),u.equippedTitle?titleBadge(u.equippedTitle):node('span','pet-account-muted','未佩戴'));card.append(labels);
  const stats=node('dl','member-stats');for(const [name,value] of [['可用积分',u.balance],['历史积分',u.lifetimePoints],['累计登录',u.loginDays+' 天'],['连续登录',u.streak+' 天']]){const cell=node('div');cell.append(node('dt','',name),node('dd','',value.toLocaleString()));stats.append(cell);}card.append(stats);
  const times=node('div','member-times');times.append(node('span','','注册：'+date(u.registeredAt)),node('span','','最近登录日期：'+(u.lastLoginDate||'暂无记录')));card.append(times);
  const details=node('details','member-details');details.append(node('summary','','更多资料与存档概况'));details.append(node('p','member-id','用户 ID：'+u.id));
  const owned=node('div','member-titles');owned.append(node('span','pet-account-muted','已获称号：'));if(u.titles.length)owned.append(...u.titles.map(titleBadge));else owned.append(node('span','pet-account-muted','暂无'));details.append(owned);
  const saves=node('ul','member-saves');if(!u.saves.length)saves.append(node('li','','暂无云端学习记录或游戏存档'));else for(const s of u.saves)saves.append(node('li','',(modules[s.module]||s.module)+' · 版本 '+s.version+' · '+date(s.updated)));details.append(saves);card.append(details);
  const manage=node('button','member-manage','管理称号');manage.type='button';manage.onclick=()=>{A.assertOwner();$('title-username').value=u.username;$('find-user-form').requestSubmit();$('title-admin').scrollIntoView({behavior:'smooth',block:'start'});};card.append(manage);return card;
}
function clear(){generation++;loaded=false;panel.hidden=true;$('member-list').replaceChildren();$('members-summary').textContent='';$('members-message').textContent='';}
async function load(){
  if(!A.session||!A.profile?.canManageTitles){clear();return;}
  const run=++generation,requestedPage=page,requestedQuery=query;
  $('members-message').textContent='正在读取会员资料…';$('members-prev').disabled=true;$('members-next').disabled=true;
  try{
    A.assertOwner();const result=await A.request('/v1/admin/users?q='+encodeURIComponent(requestedQuery)+'&page='+requestedPage);
    if(run!==generation)return;A.assertOwner();
    const pages=Math.max(1,Math.ceil(result.total/result.pageSize));if(page>pages){page=pages;return load();}
    $('member-list').replaceChildren(...result.users.map(memberCard));if(!result.users.length)$('member-list').append(node('p','members-empty',query?'没有找到匹配的会员。':'还没有注册会员。'));
    $('members-summary').textContent='已注册 '+result.registeredTotal+' 人'+(query?' · 匹配 '+result.total+' 人':'')+' · 第 '+page+' / '+pages+' 页';
    $('members-prev').disabled=page<=1;$('members-next').disabled=page>=pages;$('members-message').textContent='';loaded=true;
  }catch(e){if(run!==generation)return;$('member-list').replaceChildren();$('members-summary').textContent='';$('members-message').textContent=e.message+' 可点击刷新重试。';loaded=false;}
}
function permission(){if(A.session&&A.profile?.canManageTitles){panel.hidden=false;if(!loaded)load();}else clear();}
$('members-search').onsubmit=e=>{e.preventDefault();query=$('members-query').value.trim();page=1;load();};
$('members-reset').onclick=()=>{$('members-query').value='';query='';page=1;load();};
$('members-refresh').onclick=()=>load();$('members-prev').onclick=()=>{page--;load();};$('members-next').onclick=()=>{page++;load();};
window.addEventListener('pet-account-profile',permission);
window.addEventListener('storage',e=>{if(e.key==='pet234:session:v1'){clear();}});
await A.ready;permission();
