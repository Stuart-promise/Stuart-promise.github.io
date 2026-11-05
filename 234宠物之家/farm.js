import {CROPS,RESOURCES,SEASONS,farmLevel,maxEnergy,seasonOf,seasonDay,unlocked} from "./farm-engine.mjs?v=farm1";

const $=id=>document.getElementById(id);
const authKey="pet234-farm-session-v1";
let auth=null,record=null,notice="",mode="login",busy=false,needsRefresh=false,tool="hoe",selectedSeed="turnip",panel="shop";
const buttons=[];
const toolNames={clear:"清理杂物或枯苗",hoe:"开垦草地",seed:"播下所选种子",water:"给作物浇水",harvest:"收获成熟作物"};
const randomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
function message(text){notice=text;$("farm-status").textContent=text;}
function remember(){
  try{if(auth)localStorage.setItem(authKey,JSON.stringify(auth));else localStorage.removeItem(authKey);}catch{}
}
function button(text,handler,disabled=false){
  const item=document.createElement("button");item.type="button";item.textContent=text;item.disabled=disabled||busy||needsRefresh;item.onclick=handler;return item;
}
function text(tag,className,value){
  const item=document.createElement(tag);item.className=className;item.textContent=value;return item;
}
async function api(username,route,body,token,attempts=3){
  for(let attempt=0;attempt<attempts;attempt++){
    try{
      const response=await fetch(window.ROOM_SERVER+"/v1/farm/"+encodeURIComponent(username)+"/"+route,{
        method:body===undefined?"GET":"POST",headers:{...(token?{Authorization:"Bearer "+token}:{}),...(body===undefined?{}:{"Content-Type":"application/json"})},
        body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(15000)
      });
      const data=await response.json();
      if(!response.ok){const error=new Error(data.error||"云端操作未完成。");error.status=response.status;error.data=data;throw error;}
      return data;
    }catch(error){
      if(error.status||attempt===attempts-1)throw error;
      await new Promise(resolve=>setTimeout(resolve,700));
    }
  }
}
function cloudError(error){return error.status?error.message:"暂时无法连接云端，请检查网络后重试。";}
function setMode(next){
  mode=next;
  document.querySelectorAll("[data-auth]").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.auth===mode)));
  $("auth-title").textContent=mode==="register"?"开垦你的第一块田":mode==="reset"?"找回你的农场":"回到你的农场";
  $("auth-submit").textContent=mode==="register"?"注册并创建农场":mode==="reset"?"重置密码并登录":"登录农场";
  $("confirm-label").hidden=mode==="login";$("confirm-password").required=mode!=="login";
  $("recovery-label").hidden=mode!=="reset";$("recovery-input").required=mode==="reset";
  $("password").autocomplete=mode==="login"?"current-password":"new-password";
  $("password").placeholder=mode==="reset"?"设置新密码，至少 8 个字符":"至少 8 个字符";
  $("password").value=$("confirm-password").value="";
  $("auth-status").textContent="";
}
function showRecovery(code){
  $("recovery-account").textContent="账号 "+auth.username;
  $("recovery-code").value=code;$("copy-status").textContent="";
  $("recovery-dialog").showModal();
}
function loadRecord(data){
  record=data;needsRefresh=false;notice="";
  $("account-screen").hidden=true;$("farm-screen").hidden=false;
  render();
}
function signOutLocal(note){
  auth=null;record=null;remember();needsRefresh=false;
  $("farm-screen").hidden=true;$("account-screen").hidden=false;$("resume-account").hidden=true;
  $("auth-status").textContent=note||"已退出登录，已保存的农场进度会保留。";
}
function setBusy(value){
  busy=value;
  document.querySelectorAll("#account-form input,#account-form button,[data-auth]").forEach(item=>item.disabled=value);
  $("resume-account").disabled=value;
  if(record)render();
}
$("account-form").onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  const username=$("username").value.trim().toLowerCase(),password=$("password").value;
  if(mode!=="login"&&password!==$("confirm-password").value){$("auth-status").textContent="两次密码不一致。";return;}
  const body={password,id:crypto.randomUUID()};
  if(mode==="register")body.recovery=randomCode();
  if(mode==="reset"){body.recovery=$("recovery-input").value.trim().toLowerCase();body.newPassword=password;body.newRecovery=randomCode();}
  setBusy(true);$("auth-status").textContent="正在连接云端农场…";
  try{
    const data=await api(username,mode,body);
    auth={username,token:data.token};remember();loadRecord(data);
    $("recovery-input").value="";
    if(data.recovery)showRecovery(data.recovery);
  }catch(error){$("auth-status").textContent=cloudError(error);}
  finally{$("password").value=$("confirm-password").value="";setBusy(false);}
};
document.querySelectorAll("[data-auth]").forEach(item=>item.onclick=()=>setMode(item.dataset.auth));
$("copy-recovery").onclick=async()=>{
  try{await navigator.clipboard.writeText($("recovery-code").value);$("copy-status").textContent="恢复码已复制，请保存到你能找回的地方。";}
  catch{$("recovery-code").select();$("copy-status").textContent="请复制上方恢复码并保存。";}
};
$("close-recovery").onclick=()=>{$("recovery-dialog").close();$("recovery-code").value="";};
async function refreshFarm(){
  if(!auth||busy)return;
  setBusy(true);
  try{loadRecord(await api(auth.username,"state",undefined,auth.token));}
  catch(error){
    if(error.status===401)signOutLocal(error.message);
    else if(record){needsRefresh=true;message(cloudError(error));}
    else {$("auth-status").textContent=cloudError(error);$("resume-account").hidden=false;}
  }finally{setBusy(false);}
}
$("resume-account").onclick=refreshFarm;
$("refresh-farm").onclick=refreshFarm;
$("logout").onclick=async()=>{
  if(busy)return;
  setBusy(true);
  try{await api(auth.username,"logout",{},auth.token,1);}catch{}
  signOutLocal();setBusy(false);
};
async function action(name,args={}){
  if(busy||!auth||!record||needsRefresh)return;
  const body={action:name,args,id:crypto.randomUUID(),version:record.version};
  notice="";setBusy(true);$("save-state").textContent="正在保存…";
  try{loadRecord(await api(auth.username,"action",body,auth.token));}
  catch(error){
    if(error.status===401)signOutLocal(error.message);
    else{
      if(error.data?.farm)loadRecord(error.data);
      if(!error.status)needsRefresh=true;
      if(record){render();message(cloudError(error)+(needsRefresh?" 请先刷新存档确认云端状态。":""));}
    }
  }finally{setBusy(false);}
}
function render(){
  if(!record)return;
  const farm=record.farm,season=seasonOf(farm),level=farmLevel(farm);
  $("farm-name").textContent=record.username+" 的小院";
  $("calendar").textContent="第 "+(Math.floor((farm.day-1)/112)+1)+" 年 · "+SEASONS[season]+" "+seasonDay(farm)+" 日";
  $("weather").textContent=farm.weather==="雨"?"🌧 雨天":"☀ 晴天";
  $("coins").textContent=farm.coins;$("level").textContent="🌿 Lv."+level;
  $("energy").textContent="⚡ "+farm.energy+" / "+maxEnergy(farm);
  $("farm-clock").textContent="🕒 "+Math.floor(farm.minutes/60).toString().padStart(2,"0")+":"+(farm.minutes%60).toString().padStart(2,"0");
  $("season-banner").textContent=SEASONS[season]+"日小院";
  $("farm-screen").dataset.season=season;
  $("farm-screen").dataset.weather=farm.weather;
  $("save-state").textContent=needsRefresh?"存档状态待确认":busy?"正在保存…":"✓ 已保存 "+new Date(record.savedAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
  for(const id of ["sleep","forage","view-coop"])$(id).disabled=busy||needsRefresh;
  $("forage").disabled=busy||needsRefresh||farm.foraged;
  $("refresh-farm").disabled=busy;$("logout").disabled=busy;
  document.querySelectorAll("[data-tool]").forEach(item=>{
    item.setAttribute("aria-pressed",String(item.dataset.tool===tool));item.disabled=busy||needsRefresh;
  });
  const eligible=Object.entries(CROPS).filter(([,crop])=>crop.seasons.includes(season)&&crop.unlock<=level);
  if(!eligible.some(([id])=>id===selectedSeed))selectedSeed="wheat";
  $("seed-select").replaceChildren();
  eligible.forEach(([id,crop])=>{
    const option=document.createElement("option");option.value=id;option.textContent=crop.icon+" "+crop.name+" · 种子 "+(farm.seeds[id]||0);option.selected=id===selectedSeed;$("seed-select").append(option);
  });
  $("seed-select").disabled=busy||needsRefresh;
  $("tool-help").textContent=toolNames[tool]+(tool==="water"?" · 壶等级 "+farm.can:"");
  farm.plots.forEach((plot,i)=>{
    const item=buttons[i],open=unlocked(farm,i),crop=plot.crop&&CROPS[plot.crop.type],ready=crop&&!plot.crop.dead&&plot.crop.age>=crop.grow;
    item.className="farm-tile"+(plot.tilled?" tilled":"")+(plot.crop?.watered?" watered":"")+(ready?" ready":"")+(!open?" locked":"")+(plot.crop?.dead?" dead":"");
    item.disabled=busy||needsRefresh||!open;item.replaceChildren();
    const icon=!open?"·":plot.debris==="tree"?"🌲":plot.debris==="rock"?"🪨":plot.crop?.dead?"🥀":crop?(ready?crop.icon:plot.crop.age===0?"🌱":"🌿"):plot.tilled?"":"";
    if(open&&(plot.debris||plot.crop)){
      const sprite=plot.debris|| (plot.crop.dead?"wilt":ready?plot.crop.type:plot.crop.age===0?"seedling":"growing");
      const image=document.createElement("img");image.className="tile-sprite";image.src="./farm-sprites/"+sprite+".svg";image.alt="";image.draggable=false;item.append(image);
    }else item.append(text("span","tile-icon",icon));
    if(crop&&open)item.append(text("span","tile-info",plot.crop.dead?"已枯萎":ready?"可收获":plot.crop.age+"/"+crop.grow+" 天"));
    if(plot.crop?.watered&&open)item.append(text("span","tile-water","💧"));
    const description=!open?"未开放土地":plot.debris?"需要清理的"+(plot.debris==="tree"?"树木":"石块"):crop?crop.name+"，"+(plot.crop.dead?"已枯萎":ready?"已成熟":plot.crop.age+"/"+crop.grow+" 天，"+(plot.crop.watered?"已浇水":"未浇水")):plot.tilled?"已开垦的空地":"未开垦草地";
    item.title=description;item.setAttribute("aria-label","第"+(Math.floor(i/8)+1)+"行第"+(i%8+1)+"列，"+description);
  });
  $("farm-status").textContent=notice||(needsRefresh?"云端状态尚未确认，请刷新存档后继续。":farm.message);
  $("harvest-stats").textContent="累计收获 "+farm.stats.harvest;
  $("earned-stats").textContent="累计收入 "+farm.stats.earned+" 金币";
  $("land-stats").textContent="已开放 "+farm.plots.filter((_,i)=>unlocked(farm,i)).length+" / 48 块";
  document.querySelectorAll("[data-panel]").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.panel===panel)));
  renderPanel();
}
function itemCard(title,description,actions){
  const item=document.createElement("div");item.className="shop-item";
  item.append(text("div","item-title",title),text("p","item-desc",description));
  const row=document.createElement("div");row.className="item-actions";row.append(...actions);item.append(row);return item;
}
function renderPanel(){
  const farm=record.farm,season=seasonOf(farm),level=farmLevel(farm),container=$("side-content");
  container.replaceChildren();
  if(panel==="shop"){
    container.append(text("h2","",SEASONS[season]+"季种子配送"));
    Object.entries(CROPS).filter(([,crop])=>crop.seasons.includes(season)).forEach(([id,crop])=>{
      container.append(itemCard(crop.icon+" "+crop.name+"种子","生长 "+crop.grow+" 天"+(crop.regrow?"，之后每 "+crop.regrow+" 天再收获":"")+" · 售价 "+crop.sell+" · 需要 Lv."+crop.unlock,[
        button("买 1 · "+crop.seed,()=>action("buy",{crop:id,quantity:1}),farm.coins<crop.seed||level<crop.unlock),
        button("买 5 · "+crop.seed*5,()=>action("buy",{crop:id,quantity:5}),farm.coins<crop.seed*5||level<crop.unlock)
      ]));
    });
    container.append(itemCard("🌾 小鸡饲料 · 库存 "+farm.hay,"每只鸡每天吃一份，喂养过夜后成长并产蛋。",[
      button("买 5 · 25",()=>action("buy",{crop:"hay",quantity:5}),farm.coins<25)
    ]));
  }else if(panel==="bag"){
    container.append(text("h2","","背包与出货"));
    const items=Object.entries(farm.bag).filter(([,qty])=>qty>0);
    if(!items.length)container.append(text("p","farm-note","还没有可出售的物品。成熟作物先收获，林地每天也能采集。"));
    items.forEach(([id,qty])=>{
      const item=CROPS[id]||RESOURCES[id];
      container.append(itemCard(item.icon+" "+item.name+" × "+qty,"每份售价 "+item.sell+" 金币",[
        button("出售 1",()=>action("sell",{item:id,quantity:1})),button("全部出售 · "+qty*item.sell,()=>action("sell",{item:id,quantity:qty}))
      ]));
    });
    container.append(text("p","farm-note","木材 "+farm.bag.wood+" · 石料 "+farm.bag.stone+" · 饲料 "+farm.hay));
    container.append(text("h3","","种子库存"));
    for(const [id,qty] of Object.entries(farm.seeds))if(qty>0)container.append(text("p","farm-note",CROPS[id].icon+" "+CROPS[id].name+"种子 × "+qty));
  }else if(panel==="upgrade"){
    container.append(text("h2","","农场建设"));
    const expansions=[["扩建到 24 块","300 金币 · 木材20 · 石料10 · Lv.2"],["扩建到 36 块","900 金币 · 木材50 · 石料30 · Lv.4"],["扩建到 48 块","2000 金币 · 木材100 · 石料60 · Lv.6"]];
    container.append(itemCard(farm.land<3?expansions[farm.land][0]:"农田已全部开放",farm.land<3?expansions[farm.land][1]:"可以经营 48 块土地。",[button("扩建农田",()=>action("expand"),farm.land>=3)]));
    container.append(itemCard("💧 升级浇水壶",farm.can===0?"250 金币 · 木材15 · 石料5，浇灌十字五格":farm.can===1?"700 金币 · 木材30 · 石料15，浇灌周围九格":"最高级水壶，浇灌周围九格",[button("升级水壶",()=>action("can"),farm.can>=2)]));
    container.append(itemCard("🐓 建造鸡舍",farm.coop?"鸡舍已建好，最多容纳四只鸡。":"600 金币 · 木材20 · 石料10 · Lv.2",[button("建造鸡舍",()=>action("coop"),farm.coop)]));
  }else{
    container.append(text("h2","","小院鸡舍"));
    container.append(text("div","coop-summary",farm.coop?"🐓 小鸡 "+farm.chickens+" / 4 只 · "+(farm.chickenAge>=2?"已成长":"成长 "+farm.chickenAge+" / 2")+"，待收鸡蛋 "+farm.eggs+" 枚。":"先从建设面板建造鸡舍，再领养小鸡。"));
    container.append(itemCard("每天照料","今天"+(farm.fed?"已喂食":"尚未喂食")+" · 饲料 "+farm.hay+" 份。新鸡加入会重新经历两次喂养成长。",[
      button("领养小鸡 · 120",()=>action("chicken"),!farm.coop||farm.chickens>=4||farm.coins<120),
      button("喂食",()=>action("feed"),!farm.coop||!farm.chickens||farm.fed||farm.hay<farm.chickens),
      button("收鸡蛋",()=>action("eggs"),!farm.eggs)
    ]));
  }
}
for(let i=0;i<48;i++){
  const item=document.createElement("button");item.type="button";item.className="farm-tile";
  item.onclick=()=>action("tile",{index:i,tool,crop:selectedSeed});buttons.push(item);$("farm-grid").append(item);
}
document.querySelectorAll("[data-tool]").forEach(item=>item.onclick=()=>{tool=item.dataset.tool;render();});
document.querySelectorAll("[data-panel]").forEach(item=>item.onclick=()=>{panel=item.dataset.panel;render();});
$("seed-select").onchange=()=>{selectedSeed=$("seed-select").value;};
$("sleep").onclick=()=>{if(confirm("结束今天的劳作？睡觉会进入下一天，已浇水的作物会生长。"+(seasonDay(record.farm)===28?" 明天换季，不适应新季节的作物会枯萎。":"")))action("sleep");};
$("forage").onclick=()=>action("forage");
$("view-coop").onclick=()=>{panel="coop";render();$("side-content").scrollIntoView({behavior:"smooth",block:"nearest"});};
$("password-form").onsubmit=async event=>{
  event.preventDefault();if(busy||!auth)return;
  setBusy(true);
  try{
    const data=await api(auth.username,"password",{password:$("old-password").value,newPassword:$("new-password").value},auth.token,1);
    auth.token=data.token;remember();loadRecord(data);message("密码已更新，其他设备需重新登录。");
  }catch(error){
    if(error.status===401)signOutLocal(error.message);
    else message(cloudError(error)+(!error.status?" 若请求已成功，请用新密码重新登录。":""));
  }finally{$("old-password").value=$("new-password").value="";setBusy(false);}
};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&auth&&record&&!busy)refreshFarm();});
try{
  const saved=JSON.parse(localStorage.getItem(authKey));
  if(saved&&/^[a-z0-9_]{3,24}$/.test(saved.username)&&/^[a-f0-9]{64}$/.test(saved.token)){
    auth=saved;$("username").value=auth.username;refreshFarm();
  }
}catch{}
