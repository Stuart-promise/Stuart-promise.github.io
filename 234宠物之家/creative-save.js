(function creativeProjects(){
  'use strict';
  const A = window.PetAccount;
  const base = new URL('.', document.currentScript.src);
  const titles = {'fantasy-map':'奇幻地图生成器','ray-maze':'射线光学模拟 · 光线迷宫'};
  const statuses = {guest:'游客作品已存本机', synced:'已同步到云端', empty:'账号云存档已就绪', pending:'已存本机 · 等待云同步',
    offline:'离线 · 使用本机副本', saving:'正在保存作品…', checking:'正在读取存档…', conflict:'本机和云端各有一个版本',
    stale:'作品已在另一个标签页更新，请重新打开', error:'存档失败'};
  const LIMIT = 192 * 1024 * 1024, PART = 1024 * 1024, MAX_PARTS = 128;
  const encoder = new TextEncoder();
  const tooBig = '作品超过单个云存档容量，请通过工具的导出功能保留副本。';
  const stale = () => Object.assign(Error(statuses.stale), {stale:true});
  const sessions = new Map();
  let dbPromise, codecPromise;
  const idbKey = (owner, mod) => owner+':'+mod;
  const statusKey = (owner, mod) => 'pet234:creative:status:'+idbKey(owner,mod);
  function database(){
    if (!dbPromise) dbPromise = new Promise((resolve,reject)=>{
      const request = indexedDB.open('pet234-creative-projects-v1',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('projects');
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();dbPromise=null;};resolve(request.result);};
      request.onerror=()=>reject(Error('无法打开本机存档，请允许浏览器保存数据。'));
    }).catch(error=>{dbPromise=null;throw error;});
    return dbPromise;
  }
  // Read, compare and replace inside one transaction, including browsers without Web Locks.
  async function record(key,change){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('projects',change?'readwrite':'readonly'), table=tx.objectStore('projects');
      const request=table.get(key);
      let result, reason;
      request.onsuccess=()=>{
        try {
          A.assertOwner();
          const old=request.result || {version:0,dirty:false,packet:null};
          result=change ? change(old,table) : old;
          if(change && result!==undefined) table.put(result,key);
        } catch(error) {reason=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=tx.onerror=()=>reject(reason || Error('无法写入本机存档，请检查浏览器可用空间。'));
    });
  }
  function metadata(owner,module) {
    try {return JSON.parse(localStorage.getItem(statusKey(owner,module)))||{};} catch {return {};}
  }
  function remember(owner,module,state) {
    const {version,dirty,updated,conflict}=state;
    try {localStorage.setItem(statusKey(owner,module),JSON.stringify({version,dirty,updated,conflict,exists:!!state.packet,hash:state.packet?.hash}));} catch {}
  }
  function codec(){
    if (!codecPromise) codecPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=new URL('creative-codec/fflate-0.8.2.js',base).href;
      script.onload=()=>resolve(window.fflate);
      script.onerror=()=>reject(Error('无法载入作品压缩组件，请刷新重试。'));
      document.head.append(script);
    }).catch(e=>{codecPromise=null;throw e;});
    return codecPromise;
  }
  function base64(bytes){
    const groups=[];
    for(let start=0;start<bytes.length;start+=24576) groups.push(btoa(String.fromCharCode(...bytes.subarray(start,start+24576))));
    return groups.join('');
  }
  function unbase64(text){
    const size=text.length/4*3-(text.endsWith('==')?2:text.endsWith('=')?1:0);
    const result=new Uint8Array(size);
    for(let offset=0;offset<text.length;offset+=32768){
      const s=atob(text.slice(offset,offset+32768));
      for(let i=0,pos=offset/4*3;i<s.length;i++) result[pos+i]=s.charCodeAt(i);
    }
    return result;
  }
  async function hash(bytes) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function encode(raw) {
    const bytes=encoder.encode(raw);
    if(bytes.length>LIMIT) throw Error(tooBig);
    const checksum=await hash(bytes);
    let compressed;
    if(bytes.length>=3072){
      if(window.CompressionStream) compressed=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
      else {
        const lib=await codec();
        compressed=await new Promise((resolve,reject)=>lib.gzip(bytes,(e,result)=>e?reject(e):resolve(result)));
      }
    }
    const gzip=compressed && compressed.length<bytes.length;
    const stored=gzip?compressed:bytes;
    if(Math.ceil(stored.length/3)*4>PART*MAX_PARTS) throw Error(tooBig);
    return {format:'pet234-creative-v1',encoding:gzip?'gzip':'utf8',hash:checksum,bytes:bytes.length,body:base64(stored)};
  }
  function checkHeader(packet){
    if(packet?.format!=='pet234-creative-v1' || !['gzip','utf8'].includes(packet.encoding) ||
       !Number.isInteger(packet.bytes) || packet.bytes<1 || packet.bytes>LIMIT || !/^[a-f0-9]{64}$/.test(packet.hash))
      throw Error('云存档格式无法识别，请保留现有作品。');
  }
  async function decode(packet) {
    if(!packet) return null;
    checkHeader(packet);
    if(typeof packet.body!=='string'||packet.body.length>PART*MAX_PARTS) throw Error('云存档内容不完整');
    let bytes=unbase64(packet.body);
    if(packet.encoding==='gzip'){
      if(window.DecompressionStream){
        const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
        bytes=new Uint8Array(packet.bytes);
        let n=0;
        for(;;){
          const chunk=await reader.read();
          if(chunk.done) break;
          if(n+chunk.value.length>bytes.length){await reader.cancel();throw Error('云存档长度校验失败');}
          bytes.set(chunk.value,n);n+=chunk.value.length;
        }
        if(n!==bytes.length) throw Error('云存档长度校验失败');
      } else {
        const lib=await codec();
        bytes=await new Promise((resolve,reject)=>lib.gunzip(bytes,{size:packet.bytes},(e,result)=>e?reject(e):resolve(result)));
      }
    }
    if(bytes.length!==packet.bytes || await hash(bytes)!==packet.hash) throw Error('云存档校验失败，请重新读取。');
    const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    const doc=JSON.parse(raw);
    if(!doc||typeof doc!=='object'||Array.isArray(doc)) throw Error('作品内容无效');
    return raw;
  }
  async function parallel(items,fn) {
    const out=new Array(items.length);
    let index=0;
    async function worker(){while(index<items.length){const i=index++;out[i]=await fn(items[i],i);}}
    await Promise.all(Array.from({length:Math.min(3,items.length)},worker));
    return out;
  }
  async function receive(module,cloud){
    if(!cloud.version) return {packet:null,raw:null};
    const data=cloud.data;
    checkHeader(data);
    let packet=data;
    if(data.parts){
      if(!Array.isArray(data.parts)||data.parts.length>MAX_PARTS||data.parts.some(h=>!/^[a-f0-9]{64}$/.test(h))) throw Error('云存档分片清单无效');
      const parts=await parallel(data.parts,async h=>{
        const part=await A.request('/v1/creative/'+module+'/chunks/'+h);
        if(typeof part.body!=='string'||part.body.length>PART||await hash(encoder.encode(part.body))!==h) throw Error('作品分片未通过校验');
        return part.body;
      });
      const {parts:ids,...rest}=data;
      packet={...rest,body:parts.join('')};
    }
    return {packet,raw:await decode(packet)};
  }
  async function send(module,local){
    let data=local.packet;
    if(data.body.length>PART){
      const {body,...header}=data;
      const chunks=[];
      for(let i=0;i<body.length;i+=PART) chunks.push(body.slice(i,i+PART));
      const ids=await parallel(chunks,async part=>{
        const id=await hash(encoder.encode(part));
        await A.request('/v1/creative/'+module+'/chunks/'+id,{method:'PUT',body:JSON.stringify({body:part})});
        return id;
      });
      data={...header,parts:ids};
    }
    return A.request('/v1/data/'+module,{method:'PUT',body:JSON.stringify({baseVersion:local.version,data})});
  }
  function choice(title,message,buttons){
    return new Promise(resolve=>{
      const dialog=document.createElement('dialog');
      dialog.style.cssText='width:min(28rem,92vw);box-sizing:border-box;border:1px solid #8c9e97;padding:20px;border-radius:12px;color:#183d34;background:#fffdf7;font:16px/1.6 system-ui';
      const heading=document.createElement('strong'),p=document.createElement('p');
      heading.textContent=title;p.textContent=message;dialog.append(heading,p);
      for(const [value,label] of buttons){
        const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='font:inherit;margin:3px;padding:8px';
        b.onclick=()=>{dialog.remove();resolve(value);};dialog.append(b);
      }
      dialog.oncancel=e=>e.preventDefault();document.body.append(dialog);
      if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
    });
  }
  async function create(module){
    if(!Object.hasOwn(titles,module)) throw Error('未知作品类型');
    if(!A) throw Error('账号组件未载入，请刷新重试。');
    await A.ready;A.assertOwner();
    const owner=A.owner, key=idbKey(owner,module), endpoint='/v1/data/'+module;
    let state=await record(key), raw=await decode(state.packet), blocked=false, inflight=null;
    let writes=Promise.resolve(), pendingDiskWrites=0, status;
    const protectWrite=event=>{event.preventDefault();event.returnValue='';};
    const result=(code,message=statuses[code])=>({state:code,message});
    function paint(code,message){
      status=result(code,message);
      for(const el of document.querySelectorAll('[data-creative-status]')) {
        el.textContent=status.message;
        const control=el.closest('a') || el;
        const old=control.parentElement?.querySelector('[data-creative-reopen]');
        if(code==='conflict'||code==='stale'){
          if(!old){const b=document.createElement('button');b.textContent=code==='conflict'?'选择版本':'重新打开';b.type='button';b.dataset.creativeReopen='';b.onclick=()=>location.reload();control.after(b);}
        } else old?.remove();
      }
      window.dispatchEvent(new CustomEvent('creative-save-status',{detail:{module,...status}}));
      return status;
    }
    async function commit(change) {
      const next=await record(key,change);
      if(next){state=next;remember(owner,module,state);}
      return next;
    }
    async function adopt(cloud,expected,keepLocal=false) {
      const remote=keepLocal?null:await receive(module,cloud);
      await commit((current,table)=>{
        if(current.packet?.hash!==expected?.hash) throw stale();
        if(!keepLocal && current.dirty && current.packet && current.packet.hash!==remote.packet?.hash) table.put(current,key+':before-conflict');
        return {packet:keepLocal?current.packet:remote.packet,version:cloud.version,updated:cloud.updated,dirty:keepLocal,known:true};
      });
      if(remote)raw=remote.raw;
    }
    async function settle(cloud) {
      const original=state.packet;
      const keep=await choice('选择要保留的作品','本机和云端都已有修改。使用云端版本时，本机副本会保留在账号导出文件中。',[['cloud','使用云端作品'],['local','上传本机作品']]);
      A.assertOwner();
      await adopt(cloud,original,keep==='local');
    }
    paint('checking');
    let cloud;
    if(A.session){
      try{cloud=await A.request(endpoint);}
      catch(error){
        A.assertOwner();
        if(!state.known || error.status && error.status<500) throw error;
        paint('offline');
      }
      if(cloud) {
        if(state.dirty && state.packet?.hash===cloud.data?.hash) {
          await adopt(cloud,state.packet);
        } else if(state.dirty && state.version!==cloud.version) {
          await settle(cloud);
        } else if(!state.dirty) {
          if(!state.known || state.version!==cloud.version || state.packet?.hash!==cloud.data?.hash) await adopt(cloud,state.packet);
        }
        if(!cloud.version && !state.packet){
          const guest=(await record(idbKey('guest',module))).packet;
          const importedKey='pet234:creative:guest-choice:'+key;
          if(guest && sessionStorage.getItem(importedKey)!==guest.hash){
            const answer=await choice('导入游客作品？','当前账号还没有这项作品。可以将这台设备上的游客作品复制到账号中。',[['import','导入游客作品'],['new','从新作品开始']]);
            A.assertOwner();
            if(answer==='import'){
              const guestRaw=await decode(guest);
              await commit(current=>{if(current.packet)throw stale();return {...current,packet:guest,dirty:true};});
              raw=guestRaw;
            } else sessionStorage.setItem(importedKey,guest.hash);
          }
        }
        paint(state.dirty?'pending':state.packet?'synced':'empty');
      }
    } else paint('guest',state.packet?statuses.guest:'游客模式 · 作品保存在本机');
    async function sync(){
      if(inflight) return inflight;
      inflight=A.locked('creative-upload:'+module,async()=>{
        A.assertOwner();
        if(blocked) throw stale();
        let local=await record(key);
        if(local.packet?.hash!==state.packet?.hash){blocked=true;paint('stale');throw stale();}
        if(!A.session) return paint('guest');
        if(local.conflict) {paint('conflict');throw Error('请重新打开工具，选择本机或云端版本。');}
        if(!local.dirty) return paint(local.packet?'synced':'empty');
        paint('saving');
        try{
          const cloud=await send(module,local);
          // Acknowledging an upload must never erase edits saved while the network was busy.
          const saved=await record(key,latest=>{
            if(latest.version>cloud.version) return latest;
            return {...latest,version:cloud.version,updated:cloud.updated,dirty:latest.packet?.hash!==local.packet.hash,known:true,conflict:false};
          });
          remember(owner,module,saved);
          if(state.packet?.hash===saved.packet?.hash)state=saved;
          return paint(saved.dirty?'pending':'synced');
        } catch(error){
          A.assertOwner();
          if(error.status===409){
            const latest=await record(key,row=>({...row,conflict:true}));
            remember(owner,module,latest);
            if(state.packet?.hash===latest.packet?.hash)state=latest;
            paint('conflict');throw Error('另一个设备已保存作品。请重新打开工具选择版本，本机作品已保留。');
          }
          if(error.status && error.status<500 && ![408,429].includes(error.status)){
            paint('error',error.message);throw error;
          }
          return paint('pending',statuses.pending+' · '+error.message);
        }
      }).finally(()=>{inflight=null;});
      return inflight;
    }
    async function persist(text){
      A.assertOwner();
      if(blocked){paint('stale');throw stale();}
      if(text===raw) return;
      const packet=await encode(text);
      const expected=state.packet?.hash;
      await commit(current=>{
        if(current.packet?.hash!==expected){blocked=true;throw stale();}
        return {...current,packet,dirty:!!A.session,known:true};
      });
      raw=text;paint(A.session?'pending':'guest');
    }
    const handle={
      read(){A.assertOwner();return raw===null?null:JSON.parse(raw);},
      get status(){return status;},
      async save(document){
        if(!document||typeof document!=='object'||Array.isArray(document))throw Error('无效的作品快照');
        const text=JSON.stringify(document);
        if(++pendingDiskWrites===1)window.addEventListener('beforeunload',protectWrite);
        const save=writes.then(()=>persist(text)).finally(()=>{
          if(--pendingDiskWrites===0)window.removeEventListener('beforeunload',protectWrite);
        });
        writes=save.catch(()=>{});
        try{
          await save;
          const initial=await sync();
          // A previous upload may have acknowledged an earlier local revision.
          if(initial.state==='pending' && initial.message===statuses.pending && state.dirty) return await sync();
          return initial;
        }catch(error){if(error.stale)paint('stale');else if(status.state!=='conflict')paint('error',error.message);throw error;}
      },
      async flush(){await writes;return sync();}
    };
    const retry=()=>{if(state.dirty&&!state.conflict&&!blocked)handle.flush().catch(()=>{});};
    window.addEventListener('online',retry);
    window.addEventListener('pageshow',retry);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)retry();});
    setInterval(()=>{if(!document.hidden)retry();},30000);
    window.addEventListener('storage',event=>{
      if(event.key!==statusKey(owner,module))return;
      record(key).then(other=>{
        if(other.packet?.hash!==state.packet?.hash){blocked=true;paint('stale');}
        else {state=other;if(other.conflict)paint('conflict');}
      }).catch(()=>{});
    });
    window.addEventListener('pet-account-session',()=>location.reload());
    if(state.dirty && cloud)setTimeout(retry,0);
    return handle;
  }
  function open(module){
    if(!sessions.has(module))sessions.set(module,create(module).catch(error=>{sessions.delete(module);throw error;}));
    return sessions.get(module);
  }
  async function exportLocal(){
    A.assertOwner();
    const out={};
    for(const m of Object.keys(titles)){
      const key=idbKey(A.owner,m), current=await record(key), previous=await record(key+':before-conflict');
      if(current.packet||previous.packet)out[m]={version:current.version,dirty:current.dirty,document:current.packet,previous:previous.packet};
    }
    return out;
  }
  window.CreativeSave={open,metadata,titles,exportLocal};
})();
