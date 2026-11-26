(() => {
  'use strict';
  const frame=document.querySelector('#editor'),save=document.querySelector('#save'),loading=document.querySelector('#loading');
  const feedback=document.querySelector('#feedback');
  document.querySelector('.mapbar').addEventListener('contextmenu',event=>{
    if(matchMedia('(any-pointer:coarse)').matches) event.preventDefault();
  });
  let cloud,initial,capture,dirty=false,revision=0,timer,feedbackTimer,pending,previousSignature='';
  let dueSince=0,blocked=false;
  function message(text) { clearTimeout(feedbackTimer);feedback.textContent=text||''; if(text) feedbackTimer=setTimeout(()=>feedback.textContent='',6500); }
  function changed() {
    if(!capture || blocked) return;
    dirty=true;revision++;if(!dueSince)dueSince=Date.now();
    clearTimeout(timer);
    timer=setTimeout(()=>persist(false).catch(error=>message(error.message)),Math.max(100,Math.min(1500,9000-(Date.now()-dueSince))));
  }
  async function persist(manual) {
    clearTimeout(timer);
    if(pending) {await pending;if(dirty) return persist(manual);return;}
    if(!capture || blocked) throw Error('地图尚未准备好。');
    if(!dirty && !manual) return;
    dueSince=0;
    pending=(async()=>{
      const snapshot=capture();
      const measured=revision;
      const signature=JSON.stringify(snapshot);
      if(signature!==previousSignature) {
        const result=await cloud.save(snapshot);
        previousSignature=signature;
        if(manual)message(result?.message||'地图已保存');
      } else if(manual) {const result=await cloud.flush();message(result?.message||'地图已保存');}
      if(measured===revision) dirty=false;
    })();
    try {await pending;} finally {pending=null;}
    if(dirty) changed();
  }
  window.FantasyHost={
    get initial(){return initial;},
    changed,
    ready(fn){capture=fn;loading.hidden=true;save.disabled=false;if(!initial)changed();},
    failed(error){blocked=true;save.disabled=true;loading.hidden=false;loading.querySelector('p').textContent='无法打开地图。'+(error?.message||'请重新载入网页。');}
  };
  save.addEventListener('click',()=>{persist(true).catch(error=>message(error.message));});
  async function saveAndFollow(event) {
    if(event.ctrlKey||event.metaKey||!capture||blocked) return;
    event.preventDefault();
    const destination=event.currentTarget.href;
    try {await persist(true);location.href=destination;}catch(error){message(error.message);}
  }
  document.querySelector('#back').addEventListener('click',saveAndFollow);
  document.querySelector('#account-link').addEventListener('click',saveAndFollow);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && dirty && capture) persist(false).catch(error=>message(error.message));
  });
  window.addEventListener('beforeunload',event=>{if(dirty||pending){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pagehide',()=>{if(dirty && capture) persist(false).catch(()=>{});});
  (async()=>{
    cloud=await CreativeSave.open('fantasy-map');initial=cloud.read();
    if(initial && (initial.format!=='azgaar-workspace-1'||typeof initial.map!=='string'||!initial.map.length)) throw Error('存档格式不兼容，已保留原始记录。');
    if(initial) previousSignature=JSON.stringify(initial);
    frame.src='./editor/';
  })().catch(window.FantasyHost.failed);
})();
