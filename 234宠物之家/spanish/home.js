(() => {
  'use strict';
  const id = name => document.getElementById(name);
  function read(key) {
    const raw = window.PetSpanish.getItem(key);
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  }
  function update() {
    const progress = read('course.progress').state || {};
    const course = read('course.resume');
    const speaking = read('speaking.progress');
    const lessons = Object.values(progress.lessons || {}).filter(row => row?.count > 0).length;
    const dialogs = Object.values(speaking.completed || {}).filter(value => value === true).length;
    id('lessons').textContent = lessons;
    id('dialogs').textContent = dialogs + ' / 67';
    id('xp').textContent = Number(progress.totalXp) || 0;
    const resume = id('resume');
    const last = speaking.last;
    const coursePath = /^\/unit\/[a-z0-9-]+$/i.test(course.path || '') ? course.path : '';
    if (last?.sceneTitle && (!coursePath || Number(last.updatedAt) >= Number(course.updatedAt || 0))) {
      resume.href = './speaking/?resume=1';
      resume.textContent = '继续练口语 →';
      id('resume-caption').textContent = '上次练到「' + [last.sceneTitle, last.dialogueTitle].filter(Boolean).join(' · ') + '」。';
    } else if (coursePath) {
      resume.href = './course/#' + coursePath;
      resume.textContent = '继续学课程 →';
      id('resume-caption').textContent = '上次学到「' + (course.title || '系统课程') + '」。';
    } else {
      resume.href = './course/';
      resume.textContent = lessons ? '继续学课程 →' : '开始系统课程 →';
      id('resume-caption').textContent = '从字母发音学起，把学到的句子用在点餐、问路和日常对话里。';
    }
  }
  function refresh() {
    if (window.PetSpanish) window.PetSpanish.ready.then(update).catch(() => {});
  }
  refresh();
  window.addEventListener('pageshow', refresh);
  window.addEventListener('pet-account-data', refresh);
  window.addEventListener('spanish-progress-changed', refresh);
})();
