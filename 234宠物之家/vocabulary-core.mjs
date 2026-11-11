export const INTERVALS=[1,2,4,7,15,30];
export const dayKey=(d=new Date())=>`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
export function dayNumber(key){const [y,m,d]=key.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;}
export function afterDays(now,days){return new Date(now.getFullYear(),now.getMonth(),now.getDate()+days).getTime();}
export function parseRecord(raw){try{const r=JSON.parse(raw);return typeof r?.first==='string'&&Number.isFinite(r.due)&&Number.isInteger(r.stage)&&r.stage>=-1&&r.stage<INTERVALS.length?r:null;}catch{return null;}}
export function dayStats(rows,records,now=new Date()){
 const today=dayKey(now);let learned=0,reviewed=0,completed=0;
 const due=[],fresh=[],weak=[];
 for(const row of rows){const r=records.get(row[0]);if(!r){fresh.push(row);continue;}
  if(r.first===today)learned++;if(r.lastReview===today)reviewed++;
  if(r.first===today||r.lastReview===today)completed++;
  if(r.due<=+now)due.push(row);if(r.stage<1||((r.lapses||0)>0&&r.stage<3))weak.push(row);
 }
 due.sort((a,b)=>records.get(a[0]).due-records.get(b[0]).due);
 return {learned,reviewed,completed,due,fresh,weak};
}
export function dailyTarget(stats,plan,now=new Date()){
 const remainingDays=plan?Math.max(1,100-(dayNumber(dayKey(now))-dayNumber(plan.start))):100;
 return Math.ceil((stats.fresh.length+stats.learned)/remainingDays);
}
export function scheduled(previous,quality,word,sessionId,now=new Date()){
 if(previous?.lastSession===sessionId)return previous;
 const stage=quality===2?Math.min((previous?.stage??-1)+1,5):quality===1?Math.max(0,(previous?.stage??0)-1):0;
 return {...previous,first:previous?.first||dayKey(now),lastReview:previous?dayKey(now):'',stage,due:afterDays(now,INTERVALS[stage]),quality,
  lapses:(previous?.lapses||0)+(quality===0?1:0),spelled:(previous?.spelled||0)+1,lastSession:sessionId};
}
export function normalizeAnswer(s){return s.normalize('NFKC').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ');}
export function makeSession(rows,records,stats,target,size,mode,favorites=[],now=new Date()){
 const selected=mode==='weak'?stats.weak:mode==='favorites'?rows.filter(r=>favorites.includes(r[0])):mode==='review'?stats.due:[...stats.due,...stats.fresh.slice(0,Math.max(0,target-stats.learned))];
 const items=selected.slice(0,size).map(r=>({word:r[0],kind:records.has(r[0])?'复习':'新词',quality:2,misses:0}));
 if(!items.length)return null;
 return {v:2,id:globalThis.crypto.randomUUID(),date:dayKey(now),mode,items,index:0,phase:'recall',revealed:false,queue:items.map(r=>r.word),done:[],feedback:null};
}
export function streak(completed,today){const days=new Set(completed);let day=dayNumber(today);if(!days.has(today))day--;
 const nums=new Set([...days].map(dayNumber));let n=0;while(nums.has(day)){n++;day--;}return n;}

// New and review groups persist independently; old v2 groups can finish unchanged.
export function makeModuleSession(rows, records, stats, target, size, mode, favorites=[], now=new Date()) {
 const selected=mode==='new'?stats.fresh.slice(0,Math.max(0,target-stats.learned)):mode==='review'?stats.due:mode==='weak'?stats.weak:rows.filter(r=>favorites.includes(r[0]));
 const items=selected.slice(0,size).map(r=>({word:r[0],kind:records.has(r[0])?'复习':'新词',quality:2,misses:0}));
 return items.length?{v:3,id:globalThis.crypto.randomUUID(),mode,items,index:0,phase:'question',choices:null,selected:null}:null;
}
export function meaningChoices(row, rows, random=Math.random) {
 const key=r=>r[2].replace(/\s/g,'').toLowerCase(), seen=new Set([key(row)]), tag=row[2].match(/^[a-z]+\./i)?.[0];
 const pool=rows.filter(r=>r[0]!==row[0]);
 // Fisher-Yates, then prefer the same part of speech without creating duplicate answers.
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 pool.sort((a,b)=>Number(b[2].startsWith(tag||'!'))-Number(a[2].startsWith(tag||'!')));
 const answer=[row[0]];
 for(const candidate of pool){if(seen.has(key(candidate)))continue;seen.add(key(candidate));answer.push(candidate[0]);if(answer.length===4)break;}
 for(let i=answer.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[answer[i],answer[j]]=[answer[j],answer[i]];}
 return answer;
}
export function completeRecall(previous, quality, word, sessionId, now=new Date()) {
 if(previous?.lastSession===sessionId)return previous;
 // Extra practice today cannot repeatedly promote a word through the review intervals.
 if(previous&&previous.due>+now&&quality===2)return {...previous,lastSession:sessionId};
 return {...scheduled(previous,quality,word,sessionId,now),spelled:previous?.spelled||0};
}
