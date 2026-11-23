// The site keeps the last chapter link opened here. Reading itself takes place on Fanqie.
export function initOfficialCatalog({load,getProgress,rememberChapter,onReturn}){
 const dialog=document.querySelector('#official-catalog');
 const byId=id=>dialog.querySelector('#official-'+id);
 const filter=byId('filter'),list=byId('chapters'),status=byId('status'),resume=byId('resume');
 const previous=byId('previous'),next=byId('next'),pagination=byId('pagination');
 const pageSize=100;
 let book=null,controller=null,page=0,lastIndex=-1;

 function remember(index){
  lastIndex=index;
  rememberChapter(book.id,index);
  updateResume();
 }
 function updateResume(){
  const chapter=book.chapters?.[lastIndex];
  resume.hidden=!chapter;
  if(!chapter)return;
  resume.href=chapter.url;
  resume.textContent='上次打开 · '+chapter.title+' ↗';
 }
 function render(){
  const query=filter.value.trim().toLowerCase();
  const matches=book.chapters.map((chapter,index)=>({chapter,index}))
   .filter(({chapter,index})=>!query||String(index+1)===query||chapter.title.toLowerCase().includes(query));
  const pages=Math.max(1,Math.ceil(matches.length/pageSize));
  page=Math.max(0,Math.min(page,pages-1));
  list.replaceChildren();
  for(const {chapter,index} of matches.slice(page*pageSize,(page+1)*pageSize)){
   const link=document.createElement('a');
   link.href=chapter.url;
   link.target='_blank';
   link.rel='noopener noreferrer';
   link.textContent=chapter.title+' ↗';
   link.dataset.index=String(index);
   if(index===lastIndex)link.setAttribute('aria-current','true');
   list.append(link);
  }
  if(!matches.length)list.textContent='没有匹配的章节。';
  pagination.hidden=pages<=1;
  byId('page').textContent=(page+1)+' / '+pages;
  previous.disabled=page===0;
  next.disabled=page>=pages-1;
  list.scrollTop=0;
 }
 async function open(meta){
  controller?.abort();
  const request=new AbortController();
  controller=request;
  book=meta;
  lastIndex=-1;
  byId('title').textContent=book.title;
  byId('book').href=book.url;
  status.textContent='正在读取番茄目录…';
  filter.value='';
  filter.hidden=resume.hidden=pagination.hidden=byId('retry').hidden=true;
  list.replaceChildren();
  if(!dialog.open)dialog.showModal();
  try{
   const detail=await load(meta,request.signal);
   if(request.signal.aborted||!dialog.open)return;
   book=detail;
   lastIndex=getProgress(book.id)?.chapter??-1;
   if(lastIndex>=book.chapters.length)lastIndex=-1;
   page=lastIndex<0?0:Math.floor(lastIndex/pageSize);
   status.textContent='共 '+book.chapters.length+' 章，点击章节将在番茄官网阅读。';
   filter.hidden=false;
   updateResume();
   render();
  }catch(error){
   if(request.signal.aborted||!dialog.open)return;
   status.textContent=error.message||'番茄目录暂时无法加载。';
   byId('retry').hidden=false;
  }
 }
 list.addEventListener('click',event=>{
  const link=event.target.closest('a[data-index]');
  if(!link)return;
  remember(Number(link.dataset.index));
  list.querySelector('[aria-current]')?.removeAttribute('aria-current');
  link.setAttribute('aria-current','true');
 });
 filter.oninput=()=>{page=0;render();};
 previous.onclick=()=>{page--;render();};
 next.onclick=()=>{page++;render();};
 byId('retry').onclick=()=>open(book);
 byId('close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  controller?.abort();
  onReturn();
 });
 return open;
}
