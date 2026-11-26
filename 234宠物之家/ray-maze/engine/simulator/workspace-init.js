(() => {
  'use strict';
  if (parent === window || !parent.RayWorkspace) {
    location.replace('../../');
    return;
  }
  const host = parent.RayWorkspace;
  const initial = host.initial();
  const prefs = new Map(Object.entries(initial.preferences || {}));
  const onTouch = matchMedia('(pointer:coarse)').matches;
  window.rayPixelRatio = () => Math.min(window.devicePixelRatio || 1, onTouch ? 1.5 : 2);
  // Upstream settings are per application. Keep them inside the current account's document.
  Object.defineProperty(window, 'localStorage', {value: {
    getItem(key) { return prefs.get(key) ?? null; },
    setItem(key, value) { prefs.set(key, String(value)); host.changed(); },
    removeItem(key) { prefs.delete(key); host.changed(); }
  }});
  const editable = node => node instanceof Element && node.closest(
    'textarea,input:not([type=button]):not([type=range]),[contenteditable=true],.mq-editable-field'
  );
  document.addEventListener('contextmenu', e => { if (!editable(e.target)) e.preventDefault(); }, true);
  document.addEventListener('selectstart', e => { if (!editable(e.target)) e.preventDefault(); }, true);

  window.attachRayStudio = (app, jsonEditor) => {
    const scene = app.scene;
    const editor = app.editor;
    // Upstream turns a held finger into a synthetic right-click. Keep that finger
    // available for dragging a small handle and keep the native canvas menu closed.
    editor.startLongPress = () => editor.cancelLongPress();
    let backgroundSrc = '';
    let backgroundData = '';
    let backgroundTask;
    let ready = false;

    function changed() {
      if (!ready) return;
      host.angleChanged(rayAngle());
      host.changed();
    }
    function ray() { return scene.objs.find(obj => obj.constructor.type === 'SingleRay'); }
    function rayAngle() {
      const source = ray();
      return source ? Math.atan2(source.p2.y-source.p1.y, source.p2.x-source.p1.x)*180/Math.PI : null;
    }
    function aim(degrees, commit) {
      const source = ray();
      if (!source || !Number.isFinite(degrees)) return;
      const length = Math.hypot(source.p2.x-source.p1.x, source.p2.y-source.p1.y) || 20;
      const radians = degrees*Math.PI/180;
      const target = {x: source.p1.x + length*Math.cos(radians), y: source.p1.y + length*Math.sin(radians)};
      const rayIndex = scene.objs.indexOf(source);
      const dx=target.x-source.p2.x, dy=target.y-source.p2.y;
      source.p2 = target;
      for (const obj of scene.objs) {
        if (obj.constructor.type !== 'Handle') continue;
        for (const cp of obj.controlPoints) {
          if (cp.targetObjIndex === rayIndex && cp.dragContext.part === 2) {
            cp.newPoint = {...target};
            if (obj.controlPoints.length === 1) obj.p2 = {...target};
          }
        }
      }
      if (dx || dy) app.simulator.updateSimulation();
      if (commit) editor.onActionComplete();
    }
    function fitMaze() {
      let xMin=Infinity, yMin=Infinity, xMax=-Infinity, yMax=-Infinity;
      function include(point) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
        xMin=Math.min(xMin,point.x); xMax=Math.max(xMax,point.x);
        yMin=Math.min(yMin,point.y); yMax=Math.max(yMax,point.y);
      }
      // Guides and export crop boxes sit outside the authored maze. Fit the editable
      // geometry first, including shapes later imported or drawn by the user.
      for (const obj of scene.objs) {
        if (['TextLabel','CropBox'].includes(obj.constructor.type)) continue;
        for (const field of ['p1','p2','p3','p4','c','center']) include(obj[field]);
        include(obj);
        if(Array.isArray(obj.path)) obj.path.forEach(include);
      }
      if (!Number.isFinite(xMin)) for(const obj of scene.objs) include(obj);
      if (!Number.isFinite(xMin)) { xMin=0; xMax=innerWidth; yMin=0; yMax=innerHeight; }
      const marginX = 18, top = innerHeight < 450 ? 52 : 90, bottom = 34;
      const scale = Math.max(0.001, Math.min(3, (innerWidth - 2*marginX)/Math.max(100,xMax-xMin+70), (innerHeight-top-bottom)/Math.max(100,yMax-yMin+50)));
      scene.scale = scale;
      scene.origin = {x: innerWidth/2 - (xMin+xMax)*scale/2, y: top + (innerHeight-top-bottom)/2 - (yMin+yMax)*scale/2};
      scene.setViewportSize(innerWidth, innerHeight);
      app.simulator.updateSimulation();
      editor.emit('scaleChange', {scale});
    }
    function loadScene(data) {
      if (!data || !Number.isInteger(data.version) || (data.objs !== undefined && !Array.isArray(data.objs))) {
        throw Error('无法读取此光学场景。');
      }
      scene.backgroundImage = null;
      editor.loadJSON(JSON.stringify(data));
      if (scene.error) throw Error(scene.error);
      editor.onActionComplete();
    }
    function restoreCamera(camera) {
      if (!camera || ![camera.x,camera.y,camera.scale,camera.width,camera.height].every(Number.isFinite) ||
          camera.scale <= 0 || camera.width <= 0 || camera.height <= 0) return;
      const ratio=Math.min(innerWidth/camera.width, innerHeight/camera.height);
      scene.scale=camera.scale*ratio;
      scene.origin={x: innerWidth/2 + (camera.x-camera.width/2)*ratio, y: innerHeight/2 + (camera.y-camera.height/2)*ratio};
      scene.setViewportSize(innerWidth, innerHeight);
      app.simulator.updateSimulation();
      editor.emit('scaleChange', {scale:scene.scale});
    }
    function encodeBlob(blob) {
      return new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(Error('背景图读取失败，请重试保存。'));
        reader.readAsDataURL(blob);
      });
    }
    function prepareBackground() {
      const src = scene.backgroundImage?.src || '';
      if (backgroundSrc === src) return backgroundTask;
      backgroundSrc = src;
      backgroundData = src.startsWith('data:') ? src : '';
      backgroundTask = null;
      if (src && !backgroundData) {
        const url = new URL(src, location.href);
        if (url.origin !== location.origin) throw Error('请先将背景图下载到本机，再通过文件菜单导入。');
        backgroundTask = fetch(url).then(response=>{
          if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw Error('场景背景未找到，请先通过文件菜单导入原图。');
          return response.blob();
        }).then(encodeBlob).then(data=>{if(backgroundSrc===src) backgroundData=data;});
        backgroundTask.catch(()=>{ if (backgroundSrc===src) backgroundSrc=''; });
      }
      return backgroundTask;
    }
    function snapshot() {
      const data = {
        format:'ray-maze-v1', scene:JSON.parse(scene.toJSON()), background:backgroundData || null,
        camera:{x:scene.origin.x, y:scene.origin.y, scale:scene.scale, width:innerWidth, height:innerHeight},
        preferences:Object.fromEntries(prefs), language:window.lang,
        selected:editor.selectedObjIndex, draft:jsonEditor.aceEditor && !jsonEditor.isSynced ? jsonEditor.aceEditor.session.getValue() : null
      };
      return data;
    }
    async function restore(data) {
      loadScene(data.scene);
      if (data.camera) restoreCamera(data.camera);
      if (data.background) {
        const img = new Image();
        // Some file pickers label image uploads as application/octet-stream.
        // Require an embedded URL; the browser's image decoder verifies its actual format.
        if (!/^data:[^,]*,/i.test(data.background)) throw Error('无法读取存档中的背景图。');
        img.src=data.background;
        if(img.decode) await img.decode();
        else await new Promise((resolve,reject)=>{if(img.complete && img.naturalWidth)resolve(); else {img.onload=resolve;img.onerror=reject;}});
        scene.backgroundImage=img;
        await prepareBackground();
        app.simulator.updateSimulation(true,true);
      }
      if (Number.isInteger(data.selected) && data.selected >= 0 && data.selected<scene.objs.length) {
        editor.selectObj(data.selected);
      }
      if (typeof data.draft==='string' && jsonEditor.aceEditor) {
        jsonEditor.lastCodeChangeIsFromScene=false;
        jsonEditor.aceEditor.session.setValue(data.draft);
        jsonEditor.isSynced=false;
      }
    }
    function reset() {
      ready=false;
      loadScene(host.maze());
      fitMaze();
      editor.onActionComplete();
      ready=true;
      changed();
    }
    async function saveReady() { await prepareBackground(); return snapshot(); }
    (async()=>{
      if (initial.scene) await restore(initial);
      else reset();
      window.rayStudio = {snapshot,saveReady,rayAngle,aim,fitMaze,reset, acknowledge:()=>app.setHasUnsavedChange(false)};
      window.rayStudio.acknowledge();
      ready=true;
      for (const event of ['sceneObjsChanged','sceneChanged','sceneObjSelectionChanged']) document.addEventListener(event,changed);
      for (const event of ['change','input','pointerup','touchend','keyup']) document.addEventListener(event,changed);
      let previous = scene.backgroundImage?.src || '';
      app.simulator.on('update', () => {
        const src = scene.backgroundImage?.src || '';
        if (src!==previous) {previous=src;changed();}
      });
      document.addEventListener('click', e=>{
        const link = e.target.closest('a[href]');
        if(!link || !link.closest('#languageModal')) return;
        const language=new URL(link.href).search.slice(1);
        if(!['zh-CN','en'].includes(language)) return;
        e.preventDefault();
        host.language(language);
      });
      host.ready(window.rayStudio);
    })().catch(error=>host.problem(error));
  };
})();
