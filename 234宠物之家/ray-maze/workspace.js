(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  const frame=el('studio'), loading=el('loading'), save=el('save'), angle=el('angle');
  const status=document.querySelector('[data-creative-status]');
  let store, studio, initial={}, maze, dirty=false, revision=0, saveTimer, previous='', sliderFrame=0;
  let newestWrite=Promise.resolve(), pendingWrites=0;

  function fault(error) {
    const message=error?.message || String(error);
    if(studio) {status.textContent=message;return;}
    loading.hidden=false; frame.hidden=true;
    loading.textContent='作品未打开。'+message;
    const retry=document.createElement('button');
    retry.textContent='重新读取'; retry.onclick=()=>location.reload();
    loading.appendChild(retry);
  }
  function rateText(degrees) {
    angle.disabled=degrees===null;
    if(degrees===null) {el('degrees').textContent='—';return;}
    if(document.activeElement!==angle) angle.value=degrees.toFixed(1);
    el('degrees').textContent=degrees.toFixed(1)+'°';
  }
  function changed(){
    if(!studio) return;
    dirty=true;
    revision++;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>persist().catch(fault),450);
  }
  async function persist(force=false) {
    clearTimeout(saveTimer);
    if(!studio) return;
    if(!dirty && !force) return newestWrite;
    const cut=revision;
    const current=await studio.saveReady();
    if(cut!==revision) return persist(force);
    const raw=JSON.stringify(current);
    initial=current;
    if(raw===previous) {
      dirty=false;
      await newestWrite;
      if(force) await store.flush();
      return;
    }
    previous=raw;
    dirty=false;
    pendingWrites++;
    newestWrite=store.save(current).then(result=>{
      if(cut===revision && !dirty) studio.acknowledge();
      return result;
    }).catch(error=>{if(previous===raw){previous='';dirty=true;}throw error;}).finally(()=>{pendingWrites--;});
    return newestWrite;
  }
  window.RayWorkspace={
    initial:()=>initial, maze:()=>structuredClone(maze), changed, angleChanged:rateText, problem:fault,
    async language(language) {
      try {
        await persist(true);
        initial={...initial,language};
        await store.save(initial);
        openStudio(language);
      }catch(error){fault(error);}
    },
    ready(api) {
      studio=api;
      previous=initial.scene ? JSON.stringify(studio.snapshot()) : '';
      for(const id of ['save','fit','reset'])el(id).disabled=false;
      rateText(studio.rayAngle());
      loading.hidden=true;
    }
  };
  function openStudio(language) {
    studio=null;
    for(const id of ['save','fit','reset','angle'])el(id).disabled=true;
    loading.textContent='正在打开光学场景…'; loading.hidden=false;
    frame.hidden=false;
    frame.src='./engine/simulator/?'+(language==='en'?'en':'zh-CN');
  }
  save.addEventListener('click',()=>persist(true).catch(fault));
  el('fit').addEventListener('click',()=>{studio.fitMaze();changed();});
  el('reset').addEventListener('click',()=>el('confirm-reset').showModal());
  el('cancel-reset').addEventListener('click',()=>el('confirm-reset').close());
  el('confirm').addEventListener('click',()=>{
    el('confirm-reset').close();studio.reset();persist(true).catch(fault);
  });
  angle.addEventListener('input',()=>{
    el('degrees').textContent=Number(angle.value).toFixed(1)+'°';
    cancelAnimationFrame(sliderFrame);
    sliderFrame=requestAnimationFrame(()=>studio?.aim(Number(angle.value),false));
  });
  angle.addEventListener('change',()=>{
    cancelAnimationFrame(sliderFrame);
    studio?.aim(Number(angle.value),true);
  });
  document.addEventListener('contextmenu',event=>event.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)persist().catch(fault);});
  window.addEventListener('pagehide',()=>{if(dirty)persist().catch(()=>{});});
  window.addEventListener('beforeunload',event=>{
    if(dirty || pendingWrites) {event.preventDefault();event.returnValue='';}
  });
  for(const anchor of document.querySelectorAll('.bar a')){
    anchor.addEventListener('click',async event=>{
      if(!studio || event.ctrlKey || event.metaKey || event.shiftKey || event.button!==0) return;
      event.preventDefault();
      try{await persist();location.assign(anchor.href);}catch(error){fault(error);}
    });
  }
  (async()=>{
    [store,maze]=await Promise.all([
      window.CreativeSave.open('ray-maze'),
      fetch('./maze.json').then(res=>{if(!res.ok)throw Error('迷宫未能下载。');return res.json();})
    ]);
    const saved=store.read();
    if(saved && (saved.format!=='ray-maze-v1' || !saved.scene)) throw Error('这个存档的格式无法读取。');
    initial=saved || {};
    openStudio(initial.language);
  })().catch(fault);
})();
