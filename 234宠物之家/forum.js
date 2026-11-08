const A=window.PetAccount,$=id=>document.getElementById(id);
const categories={study:'学习交流',games:'游戏交流',chat:'小院闲聊'};
let currentPost=null,category='all',search='',listCursor=null,commentCursor=null,sequence=0,listBusy=false,commentBusy=false;
const listHash=(cat=category,q=search)=>'#'+new URLSearchParams({category:cat,...(q?{q}:{})}).toString();
const postHash=id=>'#post='+id+'&'+listHash().slice(1);
let postRequestId='',commentRequestId='';
const make=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const note=text=>{$('forum-feedback').textContent=text;};
const ownIdentity=()=>({nickname:A.profile?.nickname||A.session?.user.username||'小院会员',level:A.profile?.level||1,title:A.profile?.equippedTitle||null});
function author(value){
  const row=make('div','forum-author'),avatar=make('span','forum-avatar',Array.from(value.nickname||'会')[0].toUpperCase());avatar.setAttribute('aria-hidden','true');
  const name=make('span','forum-author-name',value.nickname),rank=make('span','forum-rank','Lv.'+value.level);rank.dataset.level=String(value.level);
  row.append(avatar,name,rank);
  if(value.title){const title=make('span','title-badge',value.title.name);title.dataset.color=value.title.color;row.append(title);}else row.append(make('span','forum-no-title','暂无称号'));
  return row;
}
function dateNode(timestamp){const date=new Date(timestamp*1000),n=make('time','',date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}));n.dateTime=date.toISOString();n.title=date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+'（北京时间）';return n;}
function chip(value){const n=make('span','forum-category',categories[value]||'小院闲聊');n.dataset.category=value;return n;}
function empty(title,text){const n=make('div','forum-empty');n.append(make('h2','',title),make('p','',text));return n;}
function identity(){
  $('new-post').disabled=false;$('new-post').textContent=A.session?'发布新帖':'登录后发帖';
  $('forum-me').replaceChildren(A.session?author(ownIdentity()):make('h2','','欢迎来小院坐坐'));
  $('forum-me-note').textContent=A.session?(A.profile?.canManageTitles?'站长可以管理所有帖子和评论。':'用你的昵称参与讨论，也可以删除自己的发言。'):'游客可以浏览，注册会员可以发帖与评论。';
  for(const id of ['post-identity','comment-identity'])$(id).replaceChildren(...(A.session?[author(ownIdentity())]:[]));
  $('comment-form').hidden=!A.session;$('comment-login').hidden=!!A.session;
}
const draftKey=kind=>'pet234:forum-draft:v1:'+A.owner+':'+kind;
function draft(kind){try{return JSON.parse(localStorage.getItem(draftKey(kind)))||{};}catch{return {};}}
function saveDraft(kind,value){try{localStorage.setItem(draftKey(kind),JSON.stringify(value));}catch{note('设备未能保存草稿，请先复制内容再离开页面。');}}
function clearDraft(kind){try{localStorage.removeItem(draftKey(kind));}catch{}}
function savePostDraft(){saveDraft('post',{title:$('post-title').value,body:$('post-body').value,category:$('post-category').value,requestId:postRequestId});}
function openComposer(){
  if(!A.session){location.href='./account.html';return;}
  const saved=draft('post');$('post-title').value=typeof saved.title==='string'?saved.title:'';$('post-body').value=typeof saved.body==='string'?saved.body:'';
  $('post-category').value=categories[saved.category]?saved.category:category==='all'?'chat':category;
  postRequestId=saved.requestId||crypto.randomUUID();$('post-feedback').textContent='';identity();$('post-dialog').showModal();$('post-title').focus();
}
function closeComposer(){if($('post-fields').disabled)return;savePostDraft();$('post-dialog').close();}
$('new-post').onclick=openComposer;$('close-post').onclick=closeComposer;$('save-close-post').onclick=closeComposer;
$('post-dialog').oncancel=e=>{e.preventDefault();closeComposer();};
for(const id of ['post-title','post-body','post-category'])$(id).addEventListener('input',()=>{postRequestId=crypto.randomUUID();savePostDraft();});
$('post-form').onsubmit=async event=>{
  event.preventDefault();if($('post-fields').disabled)return;
  $('post-fields').disabled=true;$('close-post').disabled=true;$('post-feedback').textContent='正在发布…';
  try{
    A.assertOwner();savePostDraft();
    const result=await A.request('/v1/forum/posts',{method:'POST',body:JSON.stringify({title:$('post-title').value.trim(),body:$('post-body').value.trim(),category:$('post-category').value,requestId:postRequestId})});
    clearDraft('post');$('post-dialog').close();$('post-form').reset();note('帖子已发布。');location.hash=postHash(result.id);
  }catch(e){$('post-feedback').textContent=e.status===401?'登录已过期，草稿已保留。请到个人中心重新登录后发布。':e.message;}
  finally{$('post-fields').disabled=false;$('close-post').disabled=false;}
};
function postCard(post){
  const card=make('a','forum-post-card');card.href=postHash(post.id);card.append(author(post.author));
  const h=make('h2','',post.title);h.id='post-title-'+post.id;card.setAttribute('aria-labelledby',h.id);card.append(h,make('p','forum-excerpt',post.body));
  const meta=make('div','forum-post-meta');meta.append(chip(post.category),dateNode(post.created),make('span','forum-replies',post.commentCount+' 条评论'));card.append(meta);return card;
}
function deleteButton(label,action){const b=make('button','forum-delete',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await action();}catch(e){note(e.message);}finally{b.disabled=false;}};return b;}
function commentCard(comment,postId){
  const card=make('article','forum-comment');card.id='comment-'+comment.id;card.append(author(comment.author),make('p','forum-body',comment.body));
  const meta=make('div','forum-post-meta');meta.append(dateNode(comment.created));
  if(comment.canDelete)meta.append(deleteButton('删除评论',async()=>{if(!confirm('确定删除这条评论吗？'))return;await A.request('/v1/forum/comments/'+comment.id+'/delete',{method:'POST'});note('评论已删除。');if(currentPost?.id===postId)await loadThread(postId,sequence);}));
  card.append(meta);return card;
}
async function loadList(reset=true){
  if(listBusy&&!reset)return;
  const run=sequence,chosen=category;listBusy=true;$('more-posts').disabled=true;
  try{
    const result=await A.request('/v1/forum/posts?category='+chosen+'&q='+encodeURIComponent(search)+(!reset&&listCursor?'&before='+listCursor:''));
    if(run!==sequence)return;
    if(reset)$('post-list').replaceChildren();
    $('post-list').append(...result.posts.map(postCard));listCursor=result.nextCursor;$('more-posts').hidden=!listCursor;
    $('forum-total').textContent=(chosen==='all'?'全部话题':categories[chosen])+(search?' · “'+search+'” 的搜索结果':'')+' · '+result.total+' 篇帖子';
    if(!result.total)$('post-list').replaceChildren(search?empty('没有找到相关帖子','试试其他关键词，或清空搜索查看当前分区的全部帖子。'):empty('第一段讨论，等你开启','这里还很安静。分享一个问题或发现，让小院热闹起来吧。'));
  }catch(e){if(run===sequence){if(reset)showError(e.message);else note(e.message);}}
  finally{if(run===sequence){listBusy=false;$('more-posts').disabled=false;}}
}
async function loadThread(id,run){
  const result=await A.request('/v1/forum/posts/'+id);if(run!==sequence)return;
  const post=result.post;currentPost=post;commentCursor=result.nextCursor;
  const article=make('article','forum-thread');article.append(chip(post.category),make('h1','',post.title),author(post.author));
  const meta=make('div','forum-post-meta');meta.append(dateNode(post.created));
  if(post.canDelete)meta.append(deleteButton('删除帖子',async()=>{if(!confirm('确定删除这篇帖子吗？帖子中的所有评论也将不再显示。'))return;await A.request('/v1/forum/posts/'+id+'/delete',{method:'POST'});note('帖子已删除。');location.hash=listHash();}));
  article.append(meta,make('div','forum-body',post.body));$('thread-content').replaceChildren(article);
  $('comment-count').textContent=post.commentCount;$('comment-list').replaceChildren(...result.comments.map(r=>commentCard(r,id)));
  if(!post.commentCount)$('comment-list').append(make('p','forum-muted','还没有评论，来留下第一句回应吧。'));
  $('more-comments').hidden=!commentCursor;
  const saved=draft('comment:'+id);$('comment-body').value=typeof saved.body==='string'?saved.body:'';commentRequestId=saved.requestId||crypto.randomUUID();
  document.querySelector('.forum-comments').hidden=false;identity();document.title=post.title+' · 小院论坛';
}
function showError(text){$('list-view').hidden=true;$('thread-view').hidden=true;$('forum-error').hidden=false;$('forum-error-text').textContent=text;}
async function route(){
  const run=++sequence;listBusy=false;commentBusy=false;$('more-comments').disabled=false;currentPost=null;$('forum-error').hidden=true;
  const params=new URLSearchParams(location.hash.slice(1));const raw=params.get('post');
  const chosen=params.get('category');category=chosen&&categories[chosen]?chosen:'all';search=(params.get('q')||'').trim();
  $('forum-search-input').value=search;$('clear-search').hidden=!search;
  for(const a of document.querySelectorAll('#forum-tabs [data-category]')){a.href=listHash(a.dataset.category);if(a.dataset.category===category)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  if(raw!==null){
    const id=Number(raw);$('list-view').hidden=true;$('thread-view').hidden=false;document.querySelector('.forum-comments').hidden=true;
    $('thread-content').replaceChildren(make('p','forum-muted','正在读取讨论…'));$('back-to-list').href=listHash();
    if(!Number.isSafeInteger(id)||id<1){showError('这个帖子链接无效，请返回论坛列表。');return;}
    try{await loadThread(id,run);}catch(e){if(run===sequence)showError(e.message);}
  }else{
    $('list-view').hidden=false;$('thread-view').hidden=true;document.title='小院论坛 · 234宠物之家';
    $('post-list').replaceChildren(make('p','forum-muted','正在读取帖子…'));$('more-posts').hidden=true;await loadList();
  }
}
$('comment-body').oninput=()=>{if(!currentPost)return;commentRequestId=crypto.randomUUID();saveDraft('comment:'+currentPost.id,{body:$('comment-body').value,requestId:commentRequestId});};
$('comment-form').onsubmit=async event=>{
  event.preventDefault();if(!currentPost||$('comment-fields').disabled)return;
  const id=currentPost.id,body=$('comment-body').value.trim();$('comment-fields').disabled=true;note('正在发表评论…');
  try{
    A.assertOwner();saveDraft('comment:'+id,{body,requestId:commentRequestId});
    const result=await A.request('/v1/forum/posts/'+id+'/comments',{method:'POST',body:JSON.stringify({body,requestId:commentRequestId})});
    clearDraft('comment:'+id);note('评论已发布。');
    if(currentPost?.id===id){await loadThread(id,sequence);document.getElementById('comment-'+result.id)?.scrollIntoView({block:'center'});}
  }catch(e){note(e.status===401?'登录已过期，评论草稿已保留。请到个人中心重新登录。':e.message);}
  finally{$('comment-fields').disabled=false;}
};
$('more-comments').onclick=async()=>{
  if(!currentPost||!commentCursor||commentBusy)return;
  const id=currentPost.id,run=sequence;commentBusy=true;$('more-comments').disabled=true;
  try{const result=await A.request('/v1/forum/posts/'+id+'/comments?before='+commentCursor);if(run!==sequence)return;
    $('comment-list').prepend(...result.comments.map(r=>commentCard(r,id)));commentCursor=result.nextCursor;$('more-comments').hidden=!commentCursor;
  }catch(e){if(run===sequence)note(e.message);}finally{if(run===sequence){commentBusy=false;$('more-comments').disabled=false;}}
};
$('more-posts').onclick=()=>loadList(false);$('refresh-list').onclick=route;$('retry-forum').onclick=route;
$('forum-search-form').onsubmit=e=>{e.preventDefault();const hash=listHash(category,$('forum-search-input').value.trim());if(location.hash===hash)route();else location.hash=hash;};
$('clear-search').onclick=()=>{location.hash=listHash(category,'');};
$('refresh-thread').onclick=async()=>{if(!currentPost)return;$('refresh-thread').disabled=true;try{await loadThread(currentPost.id,sequence);}catch(e){note(e.message);}finally{$('refresh-thread').disabled=false;}};
window.addEventListener('hashchange',route);window.addEventListener('pet-account-profile',identity);
await A.ready;identity();await route();
