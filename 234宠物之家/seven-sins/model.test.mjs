import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION,DIMENSIONS,QUESTIONS,OPTIONS,scoreAnswers,validateProgress} from './model.mjs';

const answerAll = value => Object.fromEntries(QUESTIONS.map(question => [question.id,typeof value === 'function' ? value(question) : value]));
const intensity = value => answerAll(question => question.reverse ? 4 - value : value);

test('all seven dimensions have four unique, interleaved questions and a reverse item', () => {
  assert.equal(DIMENSIONS.length,7);
  assert.equal(QUESTIONS.length,28);
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size,28);
  assert.deepEqual(OPTIONS.map(option => option.value),[0,1,2,3,4]);
  for (const dimension of DIMENSIONS) {
    const items = QUESTIONS.filter(question => question.dimension === dimension.id);
    assert.equal(items.length,4);
    assert.equal(items.filter(question => question.reverse).length,1);
    for (const field of ['name','en','color','tagline','description','reflection','action']) assert.equal(typeof dimension[field],'string');
  }
  for (let offset=0; offset<28; offset+=7) {
    assert.equal(new Set(QUESTIONS.slice(offset,offset+7).map(question => question.dimension)).size,7);
  }
});

test('all-low, all-high, and midpoint responses are correctly reverse-scored without a global sin score', () => {
  for (const [level,expected] of [[0,0],[2,50],[4,100]]) {
    const result = scoreAnswers(intensity(level));
    assert(result.scores.every(score => score.score === expected && score.raw === level*4 && score.max === 16));
    assert.deepEqual(result.leaders,DIMENSIONS.map(dimension => dimension.id));
    assert.equal(result.balanced,true);
    assert.equal(result.spread,0);
    assert.equal('total' in result,false);
  }
  assert(scoreAnswers(answerAll(0)).scores.every(score => score.raw === 4 && score.score === 25));
  assert(scoreAnswers(answerAll(4)).scores.every(score => score.raw === 12 && score.score === 75));
});

test('a single elevated dimension and exact leader ties are reported without arbitrary tie breaking', () => {
  const answers = intensity(0);
  for (const question of QUESTIONS.filter(question => ['envy','wrath'].includes(question.dimension))) {
    answers[question.id] = question.reverse ? 0 : 4;
  }
  const tied = scoreAnswers(answers);
  assert.deepEqual(tied.leaders,['envy','wrath']);
  assert.equal(tied.balanced,false);
  assert.equal(tied.spread,100);
  answers['wrath-1']=3;
  const single = scoreAnswers(answers);
  assert.deepEqual(single.leaders,['envy']);
  assert.equal(single.scores.find(score => score.id === 'wrath').score,94);
});

test('missing answers and malformed or extra input cannot silently produce a result', () => {
  const missing = intensity(2);delete missing['pride-1'];
  assert.throws(() => scoreAnswers(missing),/全部 28/);
  for (const value of [null,undefined,[],new Date(),'answers']) assert.throws(() => scoreAnswers(value));
  for (const value of [-1,5,1.1,'2',null,true,NaN,Infinity,undefined]) {
    assert.throws(() => scoreAnswers({...intensity(2),'pride-1':value}),/有效选项/);
  }
  assert.throws(() => scoreAnswers({...intensity(2),'unknown':0}),/未知题目/);
  assert.throws(() => scoreAnswers({...intensity(2),[Symbol('hidden')]:0}),/未知题目/);
  assert.throws(() => scoreAnswers(Object.create(intensity(2))));
});

test('scoring neither mutates the answers nor leaks shared mutable result objects', () => {
  const answers = Object.freeze(intensity(2));
  const first = scoreAnswers(answers);
  first.scores[0].score=100;first.leaders.length=0;
  const second = scoreAnswers(answers);
  assert.equal(second.scores[0].score,50);
  assert.equal(second.leaders.length,7);
  assert(Object.isFrozen(QUESTIONS) && Object.isFrozen(QUESTIONS[0]));
});

test('saved progress is versioned, bounded, copied and limited to recognized answer ids', () => {
  const input={version:VERSION,answers:{'pride-1':0,'greed-1':3},index:2,untrusted:'discard'};
  const progress=validateProgress(input);
  assert.deepEqual(progress,{version:VERSION,answers:{'pride-1':0,'greed-1':3},index:2});
  input.answers['pride-1']=4;
  assert.equal(progress.answers['pride-1'],0);
  assert.deepEqual(validateProgress({version:VERSION,answers:{},index:0}),{version:VERSION,answers:{},index:0});
  assert(validateProgress({version:VERSION,answers:intensity(2),index:27}));
  for (const raw of [null,[],{},
    {version:'old',answers:{},index:0},
    {version:VERSION,answers:{},index:-1},
    {version:VERSION,answers:{},index:28},
    {version:VERSION,answers:{},index:1.5},
    {version:VERSION,answers:{},index:'1'},
    {version:VERSION,answers:{unknown:1},index:0},
    {version:VERSION,answers:{'pride-1':5},index:0},
    {version:VERSION,answers:[],index:0}
  ]) assert.equal(validateProgress(raw),null);
});
