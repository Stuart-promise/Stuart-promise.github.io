"use strict";
const cpu = (() => {
  const levels = {easy:"简单",medium:"中档",hard:"困难"};
  const query = new URLSearchParams(location.search);
  const level = !query.has("room") && Object.hasOwn(levels,query.get("cpu")) ? query.get("cpu") : null;
  const form = document.querySelector("#computer-form");
  form.elements.cpu.value = level || "medium";
  form.querySelector(".cpu-return").href = location.pathname;
  form.querySelector(".cpu-return").hidden = !level;
  if(level) {
    document.body.classList.add("cpu-mode");
    document.querySelector("#cpu-start").textContent = "按所选难度开新局";
    form.addEventListener("submit",event=>{
      if(!confirm("按所选难度重新开局？"))event.preventDefault();
    });
  }
  let timer, worker;
  function cancel() {
    clearTimeout(timer); timer=null;
    worker?.terminate(); worker=null;
  }
  function boardTurn(due, snapshot, apply, fallback) {
    if(!level || !due){cancel();return;}
    if(timer || worker)return;
    timer=setTimeout(()=>{
      timer=null;
      const pick = move => {cancel();apply(move ?? fallback());};
      try {
        const current=new Worker("./board-opponent.js?v=1");
        worker=current;
        current.onmessage=e=>{if(worker===current)pick(e.data);};
        current.onerror=()=>{if(worker===current)pick(null);};
        current.postMessage({game:document.body.dataset.game,level,state:snapshot()});
      } catch {pick(null);}
    },340);
  }
  window.addEventListener("pagehide",cancel);
  return {level,label:levels[level],cancel,boardTurn};
})();
