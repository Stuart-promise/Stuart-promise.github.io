/* Bridges the original Unity IDBFS saves without changing game rules or Steam-free build. */
(() => {
  const A=window.PetAccount;
  const module='probably-stolen';
  const database=A.session?'/idbfs-pet234-'+A.owner:'/idbfs';
  const metaKey='pet234:unity:v1:'+A.owner;
  let busy,started=false,blocked=false,queued=false,release;
  const allowed=/^\/idbfs\/[a-f0-9]{32}\/(?:[A-Za-z0-9_-]+\.es3|PlayerPrefs)$/;
  function meta(){try{return JSON.parse(localStorage.getItem(metaKey))||{version:0,hash:'',dirty:false};}catch{return {version:0,hash:'',dirty:false};}}
  function saveMeta(v){A.assertOwner();localStorage.setItem(metaKey,JSON.stringify(v));}
  function status(text){document.getElementById('status').textContent=text;}
  function openDB(name=database){return new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,21);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('FILE_DATA')){const store=db.createObjectStore('FILE_DATA');store.createIndex('timestamp','timestamp',{unique:false});}};
    req.onerror=()=>reject(Error('无法打开本地存档，请允许浏览器存储。'));req.onblocked=()=>reject(Error('另一个游戏页面正在使用存档，请先关闭它。'));
    req.onsuccess=()=>resolve(req.result);
  });}
  function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
  async function snapshot(name=database){
    const db=await openDB(name);
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('FILE_DATA','readonly'),store=tx.objectStore('FILE_DATA'),files=[];
      const req=store.openCursor();
      req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;const path=String(cursor.key),v=cursor.value;
        if(allowed.test(path)&&v.contents) files.push({path,mode:v.mode,at:new Date(v.timestamp).getTime(),bytes:base64(new Uint8Array(v.contents))});
        cursor.continue();};
      tx.oncomplete=()=>{db.close();
        // Main saves and PlayerPrefs are always retained; keep the five newest day backups in the cloud.
        const backups=files.filter(f=>/_day\d+_/.test(f.path)).sort((a,b)=>b.at-a.at).slice(0,5);
        resolve({format:1,files:files.filter(f=>!/_day\d+_/.test(f.path)).concat(backups).sort((a,b)=>a.path.localeCompare(b.path))});};
      tx.onerror=()=>{db.close();reject(Error('读取本地存档失败'));};
    });
  }
  function validate(data){
    if(data?.format!==1||!Array.isArray(data.files)||data.files.length>500)throw Error('云端存档格式无效，本机存档保持不变。');
    for(const f of data.files)if(!allowed.test(f.path)||typeof f.bytes!=='string'||!Number.isFinite(f.at)||f.bytes.length>20*1024*1024)throw Error('存档文件校验失败，本机存档保持不变。');
    return data;
  }
  async function hash(data){
    const bytes=new TextEncoder().encode(JSON.stringify(data.files.map(f=>[f.path,f.bytes])));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function backup(data){
    if(!data.files.length)return;
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pet234-save-backups-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise((resolve,reject)=>{const tx=db.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');
      store.put(data,A.owner+':'+Date.now());const r=store.getAllKeys();r.onsuccess=()=>r.result.filter(k=>k.startsWith(A.owner+':')).sort().slice(0,-3).forEach(k=>store.delete(k));
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  }
  async function restore(data){
    validate(data);const db=await openDB();
    // Decode every file before opening a write transaction so invalid data cannot partially replace a save.
    const entries=data.files.map(f=>({...f,contents:Uint8Array.from(atob(f.bytes),c=>c.charCodeAt(0))}));
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('FILE_DATA','readwrite'),store=tx.objectStore('FILE_DATA');
      const scan=store.openCursor();scan.onsuccess=()=>{
        const cur=scan.result;
        if(cur){if(allowed.test(String(cur.key)))cur.delete();cur.continue();return;}
        const dirs=new Set(entries.map(f=>f.path.slice(0,f.path.lastIndexOf('/'))));
        for(const path of dirs)store.put({timestamp:new Date(),mode:16895},path);
        for(const f of entries)store.put({timestamp:new Date(f.at),mode:33206,contents:f.contents},f.path);
      };
      tx.oncomplete=resolve;tx.onerror=()=>reject(Error('写入本地存档失败'));tx.onabort=()=>reject(Error('存档恢复已中止'));
    });db.close();
  }
  function choose(title,text,choices){return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.style.cssText='max-width:520px;background:#fdfcf5;color:#233c31;border:1px solid #9db09d;border-radius:16px;padding:24px;font:16px/1.7 system-ui';
    const h=document.createElement('h2'),p=document.createElement('p');h.textContent=title;p.textContent=text;dialog.append(h,p);
    for(const [value,label] of choices){const b=document.createElement('button');b.textContent=label;b.style.margin='6px';b.onclick=()=>{dialog.close();dialog.remove();resolve(value);};dialog.append(b);}
    dialog.oncancel=e=>e.preventDefault();document.body.append(dialog);dialog.showModal();
  });}
  async function holdLock(){
    if(navigator.locks){
      await new Promise((resolve,reject)=>{
        navigator.locks.request('pet234:unity-active',{ifAvailable:true},async lock=>{
          if(!lock){reject(Error('已有一个 Probably Stolen 页面正在运行，请先关闭它再进入。'));return;}
          await new Promise(done=>{release=done;resolve();});
        }).catch(reject);
      });
    }else{
      const key='pet234:unity-lease',id=crypto.randomUUID();
      const active=JSON.parse(localStorage.getItem(key)||'null');
      if(active&&Date.now()-active.at<25000)throw Error('请先关闭另一个 Probably Stolen 游戏页面。');
      const renew=()=>localStorage.setItem(key,JSON.stringify({id,at:Date.now()}));renew();
      const timer=setInterval(renew,8000);release=()=>{clearInterval(timer);if(JSON.parse(localStorage.getItem(key)||'null')?.id===id)localStorage.removeItem(key);};
    }
  }
  async function prepare(){
    await A.ready;await holdLock();
    if(!A.session){started=true;status('游客 · 本地存档');return database;}
    let local=await snapshot(),m=meta(),cloud;
    const localHash=await hash(local),changed=local.files.length&&(m.dirty||localHash!==m.hash);
    try{cloud=await A.request('/v1/data/'+module);}catch(error){
      status('离线游玩 · 存档等待同步');A.notify(error.message);
      if(!local.files.length){
        const answer=await choose('暂时无法读取账号存档','当前设备没有这个账号的本地存档。可重试连接，或离线新开一局；联网后遇到已有云存档时会让你选择。',[['retry','重新连接'],['offline','离线新开一局']]);
        if(answer==='retry'){location.reload();throw Error('正在重新连接');}
      }
      saveMeta({...m,dirty:!!changed});started=true;return database;
    }
    if(cloud.version){
      validate(cloud.data);const remoteHash=await hash(cloud.data);
      if(changed&&cloud.version!==m.version&&remoteHash!==localHash){
        const choice=await choose('发现两个游戏存档','此设备有未同步进度，云端也有另一个版本。请选择继续使用哪一份；替换前会在此设备保留旧版备份。',[['local','继续本机进度'],['cloud','使用云端进度']]);
        if(choice==='cloud'){await backup(local);await restore(cloud.data);m={version:cloud.version,hash:remoteHash,dirty:false};}
        else m={version:cloud.version,hash:m.hash,dirty:true};
      }else if(!changed||remoteHash===localHash){
        if(remoteHash!==localHash){await backup(local);await restore(cloud.data);}
        m={version:cloud.version,hash:remoteHash,dirty:false};
      }
    }else if(!local.files.length){
      const guest=await snapshot('/idbfs');
      if(guest.files.length){
        const answer=await choose('开始你的账号存档','此账号还没有游戏存档。这台设备有游客存档，是否导入？游客原件会保留。',[['import','导入游客存档'],['new','从新游戏开始']]);
        if(answer==='import'){await restore(guest);m={version:0,hash:'',dirty:true};}
      }
    }else m.dirty=!!changed;
    saveMeta(m);started=true;status(m.dirty?'本机存档 · 正在同步':'账号存档已就绪');
    setTimeout(()=>sync().catch(()=>{}),500);return database;
  }
  async function sync(){
    if(!A.session||!started||blocked)return;
    if(busy){queued=true;return busy;}
    busy=(async()=>{
      A.assertOwner();const data=await snapshot();if(!data.files.length)return;
      const value=await hash(data),m=meta();
      if(value===m.hash&&!m.dirty){status('账号存档已同步');return;}
      saveMeta({...m,dirty:true});status('正在上传存档…');
      try{
        const result=await A.request('/v1/data/'+module,{method:'PUT',body:JSON.stringify({baseVersion:m.version,data})});
        const current=await hash(await snapshot());
        saveMeta({version:result.version,hash:value,dirty:current!==value});
        status(current===value?'账号存档已同步':'已存本机 · 等待同步');
      }catch(error){
        if(error.status===409){blocked=true;status('存档冲突 · 请重新打开游戏选择版本');document.getElementById('cloud-reopen').hidden=false;}
        else status('已保存到本机 · 云同步未完成');
        throw error;
      }
    })().finally(()=>{busy=null;if(queued){queued=false;setTimeout(()=>sync().catch(()=>{}),1000);}});
    return busy;
  }
  function download(data){const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='probably-stolen-'+A.owner+'-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  window.addEventListener('probably-stolen-save',event=>{
    if(!started)return;
    if(event.detail.status==='saved'){if(A.session)sync().catch(()=>{});else status('游客存档已保存到本机');}
    else status(event.detail.status==='saving'?'正在保存到本机…':'本地保存失败，请勿关闭页面');
  });
  window.addEventListener('online',()=>sync().catch(()=>{}));
  setInterval(()=>sync().catch(()=>{}),30000);
  window.addEventListener('beforeunload',e=>{if(A.session&&(meta().dirty||busy)){e.preventDefault();e.returnValue='';}});
  window.addEventListener('pagehide',()=>release?.());
  document.getElementById('cloud-export').onclick=()=>snapshot().then(download).catch(e=>status(e.message));
  document.getElementById('cloud-reopen').onclick=()=>location.reload();
  window.PetGameCloud={prepare,sync,snapshot,restore,hash,database};
})();
