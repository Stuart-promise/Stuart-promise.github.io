const API='https://111.228.4.20/v1/reader',SHELF_KEY='pet234:reader:shelf:v1';
const sourceId=/^[a-z0-9-]{1,40}$/,itemId=/^[A-Za-z0-9_-]{1,100}$/;
// Keep old shelf records and let the reader find another edition by title.
const retiredSources=new Set(['fanqie','qidian','jjwxc','zongheng','sfacg','17k']);
const $=s=>document.querySelector(s);
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const clean=(v,max=300)=>typeof v==='string'?v.slice(0,max):'';
export function normalizeWebBook(value,{detail=false}={}){
 if(!value||typeof value.sourceId!=='string'||!sourceId.test(value.sourceId)||typeof value.bookId!=='string'||!itemId.test(value.bookId)||!clean(value.title,100).trim())throw Error('书籍信息暂时不可用，请重试。');
 const b={id:value.sourceId+':'+value.bookId,web:true,sourceId:value.sourceId,bookId:value.bookId,title:clean(value.title,100),author:clean(value.author,80)||'作者未标注',description:clean(value.description,1200),sourceName:clean(value.sourceName,80)||value.sourceId};
 if(detail){
  if(!Array.isArray(value.chapters)||!value.chapters.length||value.chapters.length>30000)throw Error('这本书的目录暂时不可用。');
  const seen=new Set();
  b.chapters=value.chapters.map(c=>{
   if(!c||typeof c.id!=='string'||!itemId.test(c.id)||seen.has(c.id)||!clean(c.title,180).trim())throw Error('章节目录格式异常，请重试。');
   seen.add(c.id);
   return {id:c.id,title:clean(c.title,180),locked:c.locked===true};
  });
 }
 return b;
}
export async function readerAPI(path,{signal}={}){
 const controller=new AbortController(),abort=()=>controller.abort();if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,30000);
 try{const r=await fetch(API+path,{signal:controller.signal,credentials:'omit',cache:'no-cache'});let body;try{body=await r.json();}catch{throw Error('书源服务暂时没有响应，请稍后重试。');}if(!r.ok){const detail=body?.detail,error=Error(clean(typeof detail==='string'?detail:detail?.message,220)||'书源暂时无法读取，请重试。');error.code=typeof detail==='object'?detail.code:'';throw error;}return body;}catch(e){if(e.name==='AbortError'&&!signal?.aborted)throw Error('书源响应较慢，请稍后重试。');if(e instanceof TypeError)throw Error('暂时无法连接书源服务，请检查网络后重试。');throw e;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export async function webBookDetail(book,signal){const data=normalizeWebBook(await readerAPI('/books/'+book.sourceId+'/'+book.bookId,{signal}),{detail:true});if(data.id!==book.id)throw Error('返回的书籍与所选小说不一致，请重试。');return data;}
export async function webChapter(book,index,signal){const chapter=book.chapters[index];if(chapter.locked){const e=Error('这一章需要原站登录、订阅或暂未公开，当前书源不能提供正文。可从目录选择其他公开章节。');e.code='chapter_locked';throw e;}return readerAPI('/books/'+book.sourceId+'/'+book.bookId+'/chapters/'+chapter.id,{signal});}

export function initWebLibrary({onOpen,onChange,getProgress}){
 let shelf=[],results=[],query='',selected='all',page=1,hasMore=false,searchController=null,searchRevision=0,storageOK=true;
 try{const data=JSON.parse(localStorage.getItem(SHELF_KEY));if(data?.version===1&&Array.isArray(data.books)){const seen=new Set();for(const item of data.books.slice(0,100)){try{const book=normalizeWebBook(item);if(!seen.has(book.id)){seen.add(book.id);shelf.push(book);}}catch{}}}}catch{storageOK=false;}
 function save(){try{localStorage.setItem(SHELF_KEY,JSON.stringify({version:1,books:shelf}));storageOK=true;}catch{storageOK=false;}}
 function contains(book){return shelf.some(b=>b.id===book.id);}
 function add(book){if(contains(book))return true;if(shelf.length>=100){setStatus('书架最多保留100本，请先移除几本再添加。');return false;}shelf.unshift(normalizeWebBook(book));save();refresh();renderResults();onChange?.();return true;}
 function remove(id){shelf=shelf.filter(b=>b.id!==id);save();refresh();renderResults();onChange?.();}
 function setStatus(message){$('#novel-search-status').textContent=message;}
 function refresh(){
  const grid=$('#my-books');
  grid.replaceChildren();
  $('#my-shelf-count').textContent=shelf.length+' / 100';
  $('#my-shelf-empty').hidden=shelf.length>0;
  $('#web-save-note').textContent=storageOK?'书架与阅读进度保存在本机浏览器。':'浏览器暂时不允许保存，当前仍可搜索和阅读。';
  for(const b of shelf){
   const card=node('article','web-shelf-card'),mark=node('div','web-book-mark',b.title.slice(0,1));
   mark.setAttribute('aria-hidden','true');
   const info=node('div','web-shelf-info'),retired=retiredSources.has(b.sourceId);
   info.append(node('h3','',b.title),node('span','web-byline',b.author+' · '+b.sourceName+(retired?'（已下架）':'')));
   const progress=getProgress?.(b.id);
   const position=progress?(retired?'原记录：第 ':'上次读到第 ')+(progress.chapter+1)+' 章':'';
   info.append(node('span','web-book-progress',position||(retired?'可按书名查找其他版本':'加入书架，随时继续')));
   const actions=node('div','web-card-actions'),read=node('button','web-book-open',retired?'换源找书':(progress?'继续阅读':'开始阅读'));
   read.dataset.book=b.id;
   read.onclick=()=>retired?searchTitle(b.title):onOpen(b);
   const removeButton=node('button','web-book-remove','移除');
   removeButton.dataset.book=b.id;
   removeButton.setAttribute('aria-label','从书架移除'+b.title);
   removeButton.onclick=()=>remove(b.id);
   actions.append(read,removeButton);
   info.append(actions);
   card.append(mark,info);
   grid.append(card);
  }
 }
 function renderResults(){const grid=$('#novel-results');grid.replaceChildren();for(const b of results){const card=node('article','novel-result'),head=node('div','result-heading');head.append(node('h3','',b.title),node('span','result-source',b.sourceName));card.append(head,node('p','result-author',b.author),node('p','result-description',b.description||'打开目录，挑选章节开始阅读。'));const actions=node('div','web-card-actions'),read=node('button','result-read','阅读 / 目录'),addButton=node('button','result-add',contains(b)?'已加入书架':'加入书架');read.dataset.book=addButton.dataset.book=b.id;read.onclick=()=>onOpen(b);addButton.disabled=contains(b);addButton.onclick=()=>{if(add(b))setStatus('《'+b.title+'》已加入书架。'+(storageOK?'':'当前浏览器无法持久保存。'));};actions.append(read,addButton);card.append(actions);grid.append(card);}$('#search-more').hidden=!hasMore;}
 async function search(more=false){
  const value=$('#novel-query').value.trim(),source=$('#novel-source').value;
  if(!value){setStatus('输入书名或作者，开始找一本网文。');$('#novel-query').focus();return;}
  if(value.length>80){setStatus('请使用 80 字以内的书名或作者名。');return;}
  searchController?.abort();
  const controller=new AbortController(),revision=++searchRevision;
  searchController=controller;
  if(!more){query=value;selected=source;page=0;results=[];hasMore=false;renderResults();}
  $('#novel-search-button').disabled=true;
  $('#search-more').disabled=true;
  setStatus('正在书源中搜索…');
  try{
   const data=await readerAPI('/search?'+new URLSearchParams({query,source:selected,page:String(page+1)}),{signal:controller.signal});
   if(revision!==searchRevision)return;
   if(!Array.isArray(data.books))throw Error('搜索结果暂时不可用，请重试。');
   const seen=new Set(results.map(b=>b.id));
   for(const row of data.books.slice(0,120)){
    let book;
    try{book=normalizeWebBook(row);}catch{continue;}
    if(!retiredSources.has(book.sourceId)&&!seen.has(book.id)&&results.length<300){seen.add(book.id);results.push(book);}
   }
   const errors=Array.isArray(data.errors)?data.errors.filter(Boolean):[];
   // A failed request for the next page must not advance the search cursor.
   if(!data.books.length&&errors.length&&more){
    setStatus('暂时无法加载更多结果，请稍后重试。');
    return;
   }
   page++;
   hasMore=data.hasMore===true&&results.length<300&&page<20;
   renderResults();
   let summary='没有找到匹配的小说，试试完整书名或换一个书源。';
   if(results.length)summary='找到 '+results.length+' 本小说。';
   else if(errors.length)summary='部分或全部书源未能返回结果，请稍后重试或换一个书源。';
   const notices=errors.map(e=>[clean(e.sourceName,40),clean(e.message,120)].filter(Boolean).join('：')).filter(Boolean);
   setStatus([summary,...notices].join(' '));
  }catch(error){
   if(!controller.signal.aborted&&revision===searchRevision)setStatus(error.message||'搜索暂时失败，请重试。');
  }finally{
   if(revision===searchRevision){
    $('#novel-search-button').disabled=false;
    $('#search-more').disabled=false;
    searchController=null;
   }
  }
 }
 async function sources(){
  const select=$('#novel-source'),status=$('#source-service-status');
  status.textContent='正在加载书源…';
  try{
   const data=await readerAPI('/sources');
   if(!Array.isArray(data.sources))throw Error();
   const options=new Map();
   for(const source of data.sources){
    if(typeof source?.id!=='string'||!sourceId.test(source.id)||typeof source.name!=='string'||source.enabled===false||source.searchable===false||source.category==='official'||retiredSources.has(source.id))continue;
    const option=node('option','',clean(source.name,50));
    option.value=source.id;
    options.set(source.id,option);
   }
   if(!options.size)throw Error();
   const previous=select.value;
   select.replaceChildren(select.options[0],...options.values());
   if(options.has(previous))select.value=previous;
   status.textContent='可搜索 '+options.size+' 个书源。';
  }catch{
   status.textContent='书源列表暂时无法加载，可搜索全部书源。 ';
   const retry=node('button','source-retry','重新加载书源');
   retry.onclick=sources;
   status.append(retry);
  }
 }
 function discardSearch(message){
  searchController?.abort();
  searchController=null;
  searchRevision++;
  hasMore=false;
  results=[];
  renderResults();
  $('#novel-search-button').disabled=false;
  $('#search-more').disabled=false;
  setStatus(message);
 }
 $('#novel-search-form').onsubmit=e=>{e.preventDefault();search(false);};
 $('#search-more').onclick=()=>search(true);
 $('#novel-query').addEventListener('input',()=>discardSearch('输入书名或作者后，点击「搜索小说」。'));
 $('#novel-source').onchange=()=>discardSearch('点击「搜索小说」查看所选书源的结果。');
 refresh();
 sources();
 function searchTitle(title){
  $('#novel-query').value=title.slice(0,80);
  $('#novel-source').value='all';
  $('#web-novels').scrollIntoView({block:'start'});
  return search(false);
 }
 return {contains,add,refresh,searchTitle,get canSave(){return storageOK;}};
}
