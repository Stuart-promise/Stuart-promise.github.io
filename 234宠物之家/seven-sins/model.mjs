/** Original entertainment questionnaire. Not a validated psychological scale. */
export const VERSION = '1';

export const DIMENSIONS = Object.freeze([
  {id:'pride',name:'傲慢',en:'PRIDE',color:'#c2a6e9',tagline:'在意自己的判断，也希望被看见。',description:'这一项观察你对认可、面子与自身判断的坚持。得分较高，表示这些情境中的自我维护反应更常出现在你的回答里。',reflection:'当别人不同意时，我更想把事情弄清楚，还是更想证明自己？',action:'下一次收到不同意见，先问一句“你是怎么想到的”，再决定是否接受。'},
  {id:'greed',name:'贪婪',en:'GREED',color:'#dbc17d',tagline:'拥有带来安心，更多也格外诱人。',description:'这一项观察你对物质、利益与占有的追求。得分较高，表示“已经够用”之后继续争取或保留的念头，在这些回答中更突出。',reflection:'我现在想多要一点，是确实需要，还是只是很难说“够了”？',action:'挑一件最近想得到的东西，写下它将解决的具体需要，再决定是否继续追求。'},
  {id:'lust',name:'色欲',en:'LUST',color:'#e5a2b7',tagline:'心动与新鲜感，容易牵动注意力。',description:'这一项观察亲密吸引、暧昧与新鲜感对行动节奏的影响。它不评价恋爱经验、性取向或亲密关系的好坏。',reflection:'我喜欢的是眼前这个人，还是此刻被吸引的兴奋感？',action:'心动时给重要决定留一点时间，确认自己的边界，也尊重对方的意愿。'},
  {id:'envy',name:'嫉妒',en:'ENVY',color:'#91bba2',tagline:'别人的光亮，有时会照见自己的渴望。',description:'这一项观察向上比较与“为什么不是我”的反应。较高分反映这些具体感受被你更常认可，不代表你不能真心为别人高兴。',reflection:'让我在意的那份成绩，具体对应着我想得到的什么？',action:'把一次比较改写成自己的小目标，只安排一个今天能完成的步骤。'},
  {id:'wrath',name:'暴怒',en:'WRATH',color:'#df9983',tagline:'边界被碰到时，反应来得很快。',description:'这一项观察生气时的回应速度、反复回想与情绪延续。它描述回答里的反应习惯，不据此判断攻击性或给人贴危险标签。',reflection:'我真正介意的是事情本身，还是没有被理解、尊重的感觉？',action:'下一次想立刻回击时，先离开输入框片刻，再用一句话说清自己的具体诉求。'},
  {id:'gluttony',name:'暴食',en:'GLUTTONY',color:'#d3af86',tagline:'食物带来的满足，让人想多停留一会儿。',description:'这一项只观察食物享受、饱足之后继续进食和情绪安慰的情境，不评价体型，也不能据此判断任何饮食疾病。',reflection:'此刻我想继续吃，是还饿、喜欢味道，还是想多得到一点安慰？',action:'下一次吃喜欢的东西时，中途停一小会儿，留意身体的舒适感，再自由决定。'},
  {id:'sloth',name:'懒惰',en:'SLOTH',color:'#91b4d7',tagline:'知道如何开始，却容易把第一步留给以后。',description:'这一项限定在有时间、有余力的情况下，观察拖延、收尾与等人代劳。休息、疲惫或客观困难不等同于这一倾向。',reflection:'我正在避开的，是任务本身，还是开始时那一点不舒服？',action:'选一件有余力处理的小事，只做两分钟；完成这一步后再决定要不要继续。'}
].map(Object.freeze));

export const OPTIONS = Object.freeze([
  {value:0,label:'完全不符合'},
  {value:1,label:'较不符合'},
  {value:2,label:'一半一半'},
  {value:3,label:'比较符合'},
  {value:4,label:'非常符合'}
].map(Object.freeze));

// Four interleaved passes avoid presenting a whole dimension in one block.
// Each dimension has three forward items and one reverse item.
export const QUESTIONS = Object.freeze([
  {id:'pride-3',dimension:'pride',text:'做成一件事时，我愿意明确说出别人帮了什么忙。',reverse:true},
  {id:'greed-1',dimension:'greed',text:'已经有够用的东西时，我仍想把更多同类东西留给自己。',reverse:false},
  {id:'lust-1',dimension:'lust',text:'遇到有吸引力的人时，我会急着拉近关系，还没来得及了解对方。',reverse:false},
  {id:'envy-1',dimension:'envy',text:'看到与我起点相近的人进展更快，我会反复拿自己和对方比较。',reverse:false},
  {id:'wrath-1',dimension:'wrath',text:'计划被别人打乱时，我会很快用冲的语气回应。',reverse:false},
  {id:'gluttony-1',dimension:'gluttony',text:'明明已经吃饱，看到喜欢的食物时我还是想再吃一些。',reverse:false},
  {id:'sloth-3',dimension:'sloth',text:'在有余力的时候，我能先做完答应的小事再去消遣。',reverse:true},

  {id:'envy-2',dimension:'envy',text:'听到熟人获得好机会时，我会先想到为什么轮不到我。',reverse:false},
  {id:'sloth-2',dimension:'sloth',text:'一件事只差简单的收尾时，我也会因为不想动手而搁置。',reverse:false},
  {id:'pride-2',dimension:'pride',text:'别人指出我一个小错误时，我会急着替自己辩解。',reverse:false},
  {id:'gluttony-2',dimension:'gluttony',text:'吃到喜欢的零食时，我常常比自己原先打算的吃得更多。',reverse:false},
  {id:'lust-3',dimension:'lust',text:'即使很心动，我也能按自己原本认可的节奏慢慢了解对方。',reverse:true},
  {id:'greed-3',dimension:'greed',text:'分配共同获得的奖励时，我能接受自己拿到公平的一份。',reverse:true},
  {id:'wrath-2',dimension:'wrath',text:'与人争执结束后，我还会反复想着要怎样回击。',reverse:false},

  {id:'gluttony-4',dimension:'gluttony',text:'情绪不好时，我会靠不断吃东西来延长安慰的感觉。',reverse:false},
  {id:'wrath-3',dimension:'wrath',text:'被一句话惹恼时，我能先停一下再回复。',reverse:true},
  {id:'envy-3',dimension:'envy',text:'朋友得到我也想要的成果时，我仍能真诚地祝贺对方。',reverse:true},
  {id:'pride-1',dimension:'pride',text:'讨论时，我会先认定自己的判断比别人的更可靠。',reverse:false},
  {id:'sloth-1',dimension:'sloth',text:'有时间也有精力时，我仍会把已经能开始的小事拖到最后。',reverse:false},
  {id:'greed-2',dimension:'greed',text:'和别人分配额外好处时，我会优先争取让自己多拿一份。',reverse:false},
  {id:'lust-2',dimension:'lust',text:'一段关系的新鲜感减退后，我容易把注意力转向新的吸引对象。',reverse:false},

  {id:'lust-4',dimension:'lust',text:'暧昧带来的兴奋，会让我把原先要做的事情放到一边。',reverse:false},
  {id:'pride-4',dimension:'pride',text:'听到别人的建议时，我会因为对方不如我有经验而直接略过。',reverse:false},
  {id:'wrath-4',dimension:'wrath',text:'因为一件小事生气时，我容易把火气带进之后的聊天。',reverse:false},
  {id:'greed-4',dimension:'greed',text:'一想到要把闲置却有价值的东西送给别人，我会舍不得。',reverse:false},
  {id:'sloth-4',dimension:'sloth',text:'有余力处理自己的琐事时，我还是会等别人顺手代劳。',reverse:false},
  {id:'envy-4',dimension:'envy',text:'看到别人展示成绩后，我原本觉得不错的生活也会显得逊色。',reverse:false},
  {id:'gluttony-3',dimension:'gluttony',text:'吃到已经舒适饱足时，即使还有喜欢的食物，我也能停下来。',reverse:true}
].map(Object.freeze));

const questionIds = new Set(QUESTIONS.map(question => question.id));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

function checkedAnswers(value, complete) {
  if (!isRecord(value)) throw new Error('答案格式无效，请重新作答。');
  const clean = {};
  for (const id of Reflect.ownKeys(value)) {
    if (typeof id !== 'string' || !questionIds.has(id)) throw new Error('答案包含未知题目，请重新作答。');
    const answer = value[id];
    if (!Number.isInteger(answer) || answer < 0 || answer > 4) throw new Error('请为每题选择一个有效选项。');
    clean[id] = answer;
  }
  if (complete && QUESTIONS.some(question => !hasOwn(clean, question.id))) {
    throw new Error('请完成全部 28 道题后查看结果。');
  }
  return clean;
}

/** Scores are within-questionnaire intensity, not population percentiles. */
export function scoreAnswers(answerMap) {
  const answers = checkedAnswers(answerMap, true);
  const scores = DIMENSIONS.map(dimension => {
    const items = QUESTIONS.filter(question => question.dimension === dimension.id);
    const raw = items.reduce((sum, question) => sum + (question.reverse ? 4 - answers[question.id] : answers[question.id]), 0);
    const max = items.length * 4;
    return {id:dimension.id,name:dimension.name,score:Math.round(raw / max * 100),raw,max};
  });
  const high = Math.max(...scores.map(score => score.raw));
  const low = Math.min(...scores.map(score => score.raw));
  return {
    scores,
    leaders:scores.filter(score => score.raw === high).map(score => score.id),
    spread:Math.round((high - low) / 16 * 100),
    balanced:high === low
  };
}

/** Returns a clean copy, or null for stale/malformed saved progress. */
export function validateProgress(raw) {
  try {
    if (!isRecord(raw) || raw.version !== VERSION || !Number.isInteger(raw.index)
      || raw.index < 0 || raw.index >= QUESTIONS.length) return null;
    const answers = checkedAnswers(raw.answers, false);
    return {version:VERSION,answers,index:raw.index};
  } catch {
    return null;
  }
}
