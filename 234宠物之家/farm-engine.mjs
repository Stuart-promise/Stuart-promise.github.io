export const CROPS = {
  turnip:{name:"春萝卜",icon:"🥕",seasons:[0],grow:4,seed:10,sell:28,xp:8,unlock:1},
  potato:{name:"土豆",icon:"🥔",seasons:[0],grow:6,seed:30,sell:80,xp:14,unlock:1},
  strawberry:{name:"草莓",icon:"🍓",seasons:[0],grow:8,regrow:3,seed:70,sell:45,xp:14,unlock:3},
  tomato:{name:"番茄",icon:"🍅",seasons:[1],grow:5,regrow:3,seed:35,sell:60,xp:12,unlock:1},
  corn:{name:"玉米",icon:"🌽",seasons:[1,2],grow:7,regrow:4,seed:45,sell:85,xp:16,unlock:2},
  pumpkin:{name:"南瓜",icon:"🎃",seasons:[2],grow:8,seed:70,sell:185,xp:24,unlock:2},
  wheat:{name:"小麦",icon:"🌾",seasons:[0,1,2,3],grow:3,seed:8,sell:20,xp:6,unlock:1},
  winter:{name:"冬萝卜",icon:"🥬",seasons:[3],grow:5,seed:15,sell:42,xp:10,unlock:1}
};
export const SEASONS=["春","夏","秋","冬"];
export const RESOURCES={
  wood:{name:"木材",icon:"🪵",sell:2},
  stone:{name:"石料",icon:"🪨",sell:2},
  berry:{name:"野莓",icon:"🫐",sell:20},
  egg:{name:"鸡蛋",icon:"🥚",sell:35}
};
export function farmLevel(state){return 1+Math.floor(Math.sqrt(state.xp/40));}
export function maxEnergy(state){return 100+(farmLevel(state)-1)*5+state.can*10;}
export function seasonOf(state){return Math.floor((state.day-1)/28)%4;}
export function seasonDay(state){return (state.day-1)%28+1;}
export function unlocked(state,index) {
  const row=Math.floor(index/8),col=index%8;
  if(state.land===0)return row>=1&&row<=4&&col>=2&&col<=5;
  if(state.land===1)return row>=1&&row<=4&&col>=1&&col<=6;
  if(state.land===2)return col>=1&&col<=6;
  return true;
}
export function newFarm() {
  return {
    schema:1,day:1,minutes:360,energy:100,coins:300,xp:0,land:0,can:0,weather:"晴",
    seeds:{turnip:5,wheat:5,potato:2},bag:{wood:0,stone:0,berry:0,egg:0},hay:0,
    plots:Array.from({length:48},(_,i)=>({tilled:false,crop:null,debris:[11,20,27,36].includes(i)?(i%2?"tree":"rock"):null})),
    coop:false,chickens:0,chickenAge:0,fed:false,eggs:0,foraged:false,
    stats:{harvest:0,earned:0},message:"欢迎来到四季小院。先开垦土地，播下种子，再给作物浇水。"
  };
}
function requireRule(condition,message){if(!condition)throw new Error(message);}
function spendEnergy(state,cost) {
  requireRule(state.minutes<1320,"夜深了，去农舍睡觉，明天继续吧。");
  requireRule(state.energy>=cost,"体力不足，去农舍睡觉恢复体力。");
  state.energy-=cost;state.minutes=Math.min(1320,state.minutes+10);
}
function purchase(state,coins,wood=0,stone=0) {
  requireRule(state.coins>=coins,"金币不足。");
  requireRule((state.bag.wood||0)>=wood&&(state.bag.stone||0)>=stone,"木材或石料不足，可以到农场林地采集。");
  state.coins-=coins;state.bag.wood-=wood;state.bag.stone-=stone;
}
export function applyFarmAction(state,action,args={}) {
  const season=seasonOf(state),level=farmLevel(state);
  if(action==="sleep"){
    let growth=0;
    state.plots.forEach(plot=>{
      if(plot.crop && !plot.crop.dead && plot.crop.watered){plot.crop.age++;growth++;}
    });
    if(state.coop && state.fed && state.chickens){
      state.chickenAge++;
      if(state.chickenAge>=2)state.eggs+=state.chickens;
    }
    state.day++;state.minutes=360;state.weather=Math.random()<.24?"雨":"晴";
    state.energy=maxEnergy(state);state.foraged=false;state.fed=false;
    const nextSeason=seasonOf(state);
    let withered=0;
    state.plots.forEach(plot=>{
      if(plot.crop){
        if(!CROPS[plot.crop.type].seasons.includes(nextSeason)){plot.crop.dead=true;withered++;}
        plot.crop.watered=state.weather==="雨";
      }
    });
    state.message="新的一天开始了！"+(growth?growth+" 块作物得到生长。":"")+(withered?withered+" 块作物因换季枯萎，请清理后重种。":"")+(state.weather==="雨"?"今天下雨，农田已自动浇水。":"");
  }else if(action==="tile"){
    const index=args.index,tool=args.tool;
    requireRule(Number.isInteger(index)&&index>=0&&index<48,"请选择一块土地。");
    requireRule(unlocked(state,index),"这片土地尚未开放，先升级农田。");
    const plot=state.plots[index];
    if(tool==="clear"){
      requireRule(plot.debris||plot.crop?.dead,"这里没有需要清理的东西。");
      spendEnergy(state,3);
      if(plot.debris==="tree")state.bag.wood+=5;
      if(plot.debris==="rock")state.bag.stone+=5;
      plot.debris=null;
      if(plot.crop?.dead)plot.crop=null;
      state.message="土地已清理。";
    }else if(tool==="hoe"){
      requireRule(!plot.debris&&!plot.crop&&!plot.tilled,"只能开垦没有作物和杂物的草地。");
      spendEnergy(state,2);plot.tilled=true;state.message="开垦完成，可以播种了。";
    }else if(tool==="seed"){
      const crop=CROPS[args.crop];
      requireRule(crop&&crop.unlock<=level,"这种种子尚未解锁。");
      requireRule(crop.seasons.includes(season),"这种作物不适合当前季节。");
      requireRule(plot.tilled&&!plot.crop&&!plot.debris,"请先开垦空地，再播种。");
      requireRule((state.seeds[args.crop]||0)>0,"没有这种种子了，可从送货商店购买。");
      spendEnergy(state,1);state.seeds[args.crop]--;
      plot.crop={type:args.crop,age:0,watered:state.weather==="雨",dead:false};
      state.message=crop.name+" 已播种，浇水后睡觉就会生长。";
    }else if(tool==="water"){
      const row=Math.floor(index/8),col=index%8;
      const targets=state.plots.filter((p,i)=>{
        const distance=Math.abs(Math.floor(i/8)-row)+Math.abs(i%8-col);
        const inRange=state.can===0?i===index:state.can===1?distance<=1:Math.abs(Math.floor(i/8)-row)<=1&&Math.abs(i%8-col)<=1;
        return inRange&&unlocked(state,i)&&p.crop&&!p.crop.dead&&!p.crop.watered;
      });
      requireRule(targets.length>0,"范围内没有需要浇水的作物。");
      spendEnergy(state,state.can?3:2);targets.forEach(p=>{p.crop.watered=true;});
      state.message="浇好了 "+targets.length+" 块作物。";
    }else if(tool==="harvest"){
      requireRule(plot.crop&&!plot.crop.dead&&plot.crop.age>=CROPS[plot.crop.type].grow,"作物还没成熟，先浇水并等待生长。");
      const type=plot.crop.type,crop=CROPS[type];
      spendEnergy(state,1);state.bag[type]=(state.bag[type]||0)+1;state.xp+=crop.xp;state.stats.harvest++;
      if(crop.regrow)plot.crop.age=crop.grow-crop.regrow;
      else plot.crop=null;
      state.message="收获了 "+crop.name+"！可以从背包售卖。";
    }else throw new Error("请选择工具。");
  }else if(action==="buy"){
    const type=args.crop,qty=args.quantity;
    requireRule(Number.isInteger(qty)&&qty>=1&&qty<=99,"购买数量应为 1～99。");
    if(type==="hay"){
      purchase(state,qty*5);state.hay+=qty;state.message="买到了 "+qty+" 份饲料。";
    }else{
      const crop=CROPS[type];
      requireRule(crop&&crop.unlock<=level,"种子尚未解锁。");
      requireRule(crop.seasons.includes(season),"商店只供应当季种子。");
      purchase(state,crop.seed*qty);state.seeds[type]=(state.seeds[type]||0)+qty;state.message="买到了 "+qty+" 份"+crop.name+"种子。";
    }
  }else if(action==="sell"){
    const type=args.item,qty=args.quantity;
    const item=CROPS[type]||RESOURCES[type];
    requireRule(item&&Number.isSafeInteger(qty)&&qty>0,"请选择有效的出售数量。");
    requireRule((state.bag[type]||0)>=qty,"背包中数量不足。");
    state.bag[type]-=qty;state.coins+=qty*item.sell;state.stats.earned+=qty*item.sell;
    state.message="售出 "+qty+" 份"+item.name+"，获得 "+qty*item.sell+" 金币。";
  }else if(action==="forage"){
    requireRule(!state.foraged,"今天的林地已经采集过了，明天再来。");
    spendEnergy(state,12);state.foraged=true;state.bag.wood+=8;state.bag.stone+=5;state.bag.berry+=2;
    state.message="林地采集完成，获得木材 8、石料 5 和野莓 2。";
  }else if(action==="expand"){
    const upgrades=[{coins:300,wood:20,stone:10,level:2},{coins:900,wood:50,stone:30,level:4},{coins:2000,wood:100,stone:60,level:6}];
    const upgrade=upgrades[state.land];
    requireRule(upgrade,"农田已全部开放。");
    requireRule(level>=upgrade.level,"需要农场等级 "+upgrade.level+"。");
    purchase(state,upgrade.coins,upgrade.wood,upgrade.stone);state.land++;state.message="农田扩建完成，去开垦新的土地吧。";
  }else if(action==="can"){
    requireRule(state.can<2,"浇水壶已升至最高级。");
    const cost=state.can===0?[250,15,5]:[700,30,15];
    purchase(state,...cost);state.can++;state.message="浇水壶升级，现在一次可浇更多土地，次日体力上限也会提高。";
  }else if(action==="coop"){
    requireRule(!state.coop,"鸡舍已经建好了。");
    requireRule(level>=2,"达到农场 2 级后可以建鸡舍。");
    purchase(state,600,20,10);state.coop=true;state.message="鸡舍建好了，可以领养小鸡。";
  }else if(action==="chicken"){
    requireRule(state.coop&&state.chickens<4,"需要鸡舍，且最多养四只鸡。");
    purchase(state,120);state.chickens++;state.chickenAge=0;state.message="小鸡入住。每天喂食，两次喂养过夜后开始产蛋。";
  }else if(action==="feed"){
    requireRule(state.coop&&state.chickens>0&&!state.fed,"没有需要喂食的小鸡，或今天已经喂过了。");
    requireRule(state.hay>=state.chickens,"饲料不足，请先购买饲料。");
    spendEnergy(state,2);state.hay-=state.chickens;state.fed=true;state.message="小鸡已经吃饱了，明天来看看鸡舍吧。";
  }else if(action==="eggs"){
    requireRule(state.eggs>0,"鸡舍暂时没有鸡蛋，记得每天喂食。");
    spendEnergy(state,1);state.bag.egg+=state.eggs;state.message="收集了 "+state.eggs+" 枚鸡蛋。";state.eggs=0;
  }else throw new Error("不支持的农场操作。");
  return state;
}
