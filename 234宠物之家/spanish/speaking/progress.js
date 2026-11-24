'use strict';

const speakingKey = 'speaking.progress';
const relatedUnits = {
  social: ['a1-u01', '你好！'], restaurant: ['a1-u06', '吃饭啦！'],
  shopping: ['a1-u07', '去购物'], directions: ['a1-u04', '我的家和街区'],
  entertainment: ['a1-u08', '空闲时间'], medical: ['a1-u09', '你感觉怎么样？'],
  airport: ['a2-u03', '旅行故事'], hotel: ['a2-u03', '旅行故事'],
  food: ['a2-u06', '下厨房'], campus: ['b1-u08', '留学与办手续']
};
function showRelatedCourse(sceneId) {
  const link = document.getElementById('related-course');
  const unit = relatedUnits[sceneId];
  link.hidden = !unit;
  if (unit) {
    link.href = '../course/#/unit/' + unit[0];
    link.textContent = '配套课程 · ' + unit[0].split('-')[0].toUpperCase() + ' ' + unit[1];
  }
}
function speakingRead() {
  const raw = PetSpanish.getItem(speakingKey);
  if (!raw) return {version: 1, completed: {}, drills: {}, roleplays: {}, last: null};
  const state = JSON.parse(raw);
  if (state?.version !== 1 || !state.completed || !state.drills || !state.roleplays) {
    throw Error('这份口语学习记录无法读取，请到账号中心检查存档。');
  }
  return state;
}

function writeSpeakingPosition(scene, dialogue, position, change) {
  const state = speakingRead();
  if (change) change(state);
  state.updatedAt = Date.now();
  state.last = {sceneId: scene.id, sceneTitle: scene.title, dialogue,
    dialogueTitle: scene.dialogues[dialogue].title, updatedAt: state.updatedAt, ...position};
  PetSpanish.setItem(speakingKey, JSON.stringify(state));
}

function saveReadingPosition(dialogue, line, change) {
  const scene = scenarios.find(s => s.id === currentScenarioId);
  writeSpeakingPosition(scene, dialogue, {mode: 'lesson', line}, change);
}

function markDialogue(dialogue) {
  saveReadingPosition(dialogue, null, state => { state.completed[currentScenarioId + ':' + dialogue] = true; });
  const btn = document.getElementById('mark-' + dialogue);
  btn.textContent = '已学完';
  btn.disabled = true;
  showBanner('已记录这组对话。');
}

function saveRoleStep() {
  const scene = scenarios[currentRpScenario];
  const d = scene.dialogues[currentRpDialogue];
  const remaining = d.lines.slice(rpStep);
  const finished = rpStep > 0 && !remaining.some(line => line.speaker === 'A');
  writeSpeakingPosition(scene, currentRpDialogue, {mode: 'roleplay', step: rpStep, score: rpScore}, state => {
    if (!finished) return;
    const key = scene.id + ':' + currentRpDialogue;
    state.completed[key] = true;
    const best = state.roleplays[key]?.score ?? 0;
    state.roleplays[key] = {score: Math.max(best, rpScore), total: rpScorableCount(d)};
  });
}

function startRoleplay(sceneId, dialogue, checkpoint = null) {
  currentRpScenario = scenarios.findIndex(s => s.id === sceneId);
  currentRpDialogue = dialogue;
  const d = scenarios[currentRpScenario].dialogues[dialogue];
  rpStep = Math.min(d.lines.length, Math.max(0, Number(checkpoint?.step) || 0));
  rpScore = Math.min(rpScorableCount(d), Math.max(0, Number(checkpoint?.score) || 0));
  renderRpScenarioSelect();
  renderRpDialogueSelect();
  renderRpChat();
  switchTab('roleplay', !checkpoint);
}

function updateSpeakingOverview() {
  const state = speakingRead();
  let total = 0, done = 0;
  for (const scene of scenarios) {
    const count = scene.dialogues.filter((_, i) => state.completed[scene.id + ':' + i]).length;
    total += scene.dialogues.length;
    done += count;
    const badge = document.querySelector('[data-scene-count="' + scene.id + '"]');
    if (badge) badge.textContent = count ? count + '/' + scene.dialogues.length + ' 已学完' : scene.dialogues.length + ' 组对话';
  }
  document.getElementById('progress-total').textContent = scenarios.length + ' 个场景 · 已学完 ' + done + ' / ' + total + ' 组对话';
  const btn = document.getElementById('resume-dialogue');
  btn.hidden = !state.last;
  if (state.last) btn.textContent = '继续学习 · ' + state.last.sceneTitle + ' / ' + state.last.dialogueTitle;
}

window.addEventListener('spanish-progress-changed', event => {
  if (!event.detail?.includes(speakingKey) || document.querySelector('main').inert) return;
  updateSpeakingOverview();
  const scene = scenarios.find(s => s.id === currentScenarioId);
  if (!scene || currentTab !== 'detail') return;
  const progress = speakingRead();
  scene.dialogues.forEach((dialogue, i) => {
    const button = document.getElementById('mark-' + i);
    if (!button) return;
    button.disabled = !!progress.completed[scene.id + ':' + i];
    button.textContent = button.disabled ? '已学完' : '标记学完';
    dialogue.lines.forEach((line, j) => {
      const feedback = document.getElementById('practice-fb-' + i + '-' + j);
      if (feedback && !feedback.textContent && progress.drills[scene.id + ':' + i + ':' + j]) {
        feedback.textContent = '已答对过这道练习。';
        feedback.classList.add('show', 'correct');
      }
    });
  });
});

function resumeSpeaking() {
  const saved = speakingRead().last;
  const scene = scenarios.find(s => s.id === saved?.sceneId);
  if (!scene?.dialogues[saved.dialogue]) return;
  if (saved.mode === 'roleplay') startRoleplay(scene.id, saved.dialogue, saved);
  else openScenario(scene.id, saved.dialogue, saved.line, false);
}

async function enterSpeaking() {
  const notice = document.getElementById('speaking-load');
  try {
    await PetSpanish.ready;
    init();
    updateSpeakingOverview();
    document.getElementById('section-tabs').inert = false;
    document.querySelector('main').inert = false;
    notice.hidden = true;
    const query = new URLSearchParams(location.search);
    const scene = scenarios.find(s => s.id === query.get('scene'));
    if (scene) {
      const dialogue = Number(query.get('dialogue'));
      openScenario(scene.id, Number.isInteger(dialogue) && scene.dialogues[dialogue] ? dialogue : 0);
    } else if (query.get('resume') === '1') {
      resumeSpeaking();
    }
  } catch (error) {
    notice.hidden = false;
    notice.textContent = error.message || '读取进度失败，请刷新后再试。';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = '重新读取';
    retry.className = 'resume-dialogue';
    retry.onclick = () => location.reload();
    notice.append(' ', retry);
  }
}
enterSpeaking();
