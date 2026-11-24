/* Save the current curriculum alongside older records in the Spanish account module. */
(() => {
  'use strict';
  const account = window.PetAccount;
  const base = new URL('.', document.currentScript.src);
  const prefix = 'pet234:spanish:v1:vamos-courses:';
  const moduleName = 'spanish';
  const keys = new Set(['progress', 'settings', 'review']);
  const labels = {
    guest: '游客 · 仅存本机', checking: '正在读取学习记录', synced: '云端已同步',
    pending: '已存本机 · 等待同步', offline: '离线 · 已存本机',
    conflict: '存档冲突 · 去账号中心', 'storage-error': '本机空间不足 · 请备份',
    'too-large': '学习记录过大 · 请导出备份', expired: '请重新登录'
  };
  const documentReady = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
    : Promise.resolve();
  let store;
  const observed = new Map();
  let staleWarning = false;

  function key(name) {
    if (!keys.has(name)) throw Error('未知的西语学习记录');
    if (!store) throw Error('学习存档还未就绪');
    return prefix + name;
  }
  function status() {
    return account ? labels[account.syncState(moduleName)] : '账号组件未载入';
  }
  function paint() {
    const message = status();
    for (const node of document.querySelectorAll('[data-spanish-save-status]')) node.textContent = message;
  }
  async function promptChoice(title, text, options) {
    await documentReady;
    if (!document.querySelector('link[data-spanish-dialog-style]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = new URL('storage.css?v=1', base); css.dataset.spanishDialogStyle = '';
      document.head.append(css);
    }
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'spanish-storage-dialog'; dialog.setAttribute('aria-label', title);
      const h = document.createElement('h2'); h.textContent = title;
      const p = document.createElement('p'); p.textContent = text;
      dialog.append(h, p);
      for (const name of options) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = name;
        btn.onclick = () => { dialog.remove(); resolve(name); };
        dialog.append(btn);
      }
      dialog.addEventListener('cancel', e => e.preventDefault());
      document.body.append(dialog);
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  }
  function checkConflict() {
    if (account.session && account.read(moduleName).conflict) {
      throw Error('本机和云端都有新的西语学习记录。请在账号中心选择要继续使用的版本。');
    }
  }
  function checkPrevious(name, scoped, next) {
    const current = store.getItem(scoped);
    if (!observed.has(name) || observed.get(name) === current || current === next) return;
    const message = '这项学习记录已在另一页更新，请重新载入最新进度。';
    if (!staleWarning) {
      staleWarning = true;
      promptChoice('学习进度已更新', message, ['重新载入']).then(() => location.reload());
    }
    throw Error(message);
  }
  function changed() {
    if (!store) return;
    const names = [];
    for (const [name, value] of observed) {
      if (value !== store.getItem(prefix + name)) names.push(name);
    }
    if (names.length) window.dispatchEvent(new CustomEvent('spanish-progress-changed', {detail: names}));
    paint();
  }
  async function start() {
    if (!account) throw Error('未能加载网站账号组件。请联网后重试。');
    const opened = await account.open(moduleName);
    account.assertOwner();
    if (account.session) {
      checkConflict();
      const data = account.read(moduleName).data;
      if (!Object.keys(data).length && account.syncState(moduleName) !== 'synced') {
        throw Error('此设备还没有当前账号的西语学习记录，请联网读取后再开始。');
      }
      const currentKeys = Array.from(keys, name => prefix + name);
      const hasCurrentRecords = () => currentKeys.some(key => opened.getItem(key) !== null);
      if (!hasCurrentRecords() && account.syncState(moduleName) === 'synced') {
        const guestKeys = currentKeys.filter(key => localStorage.getItem(key) !== null);
        const optionKey = prefix + 'guest-choice:' + account.owner;
        if (guestKeys.length && sessionStorage.getItem(optionKey) !== 'new') {
          const name = account.profile?.nickname || account.session.user.username;
          const choice = await promptChoice('继续使用游客学习记录？', '这台设备上有新版西语课程的游客记录。可以导入到账号「' + name + '」，游客原记录会保留在这台设备。', ['导入到我的账号', '从头开始']);
          account.assertOwner();
          if (choice === '导入到我的账号') {
            checkConflict();
            if (!hasCurrentRecords()) {
              for (const key of guestKeys) {
                const value = localStorage.getItem(key);
                if (value !== null) opened.setItem(key, value);
              }
              await account.flush();
              checkConflict();
            }
          } else sessionStorage.setItem(optionKey, 'new');
        }
      }
    }
    store = opened;
    paint();
    return api;
  }
  const api = {
    get owner() { return account?.owner ?? 'guest'; },
    get status() { return status(); },
    getItem(name) {
      const value = store.getItem(key(name));
      observed.set(name, value);
      return value;
    },
    setItem(name, value) {
      const scoped = key(name);
      if (typeof value !== 'string') throw Error('西语学习记录必须是字符串');
      checkConflict();
      checkPrevious(name, scoped, value);
      try {
        store.setItem(scoped, value);
        observed.set(name, value);
      } catch (error) {
        if (account.syncState(moduleName) === 'storage-error') observed.set(name, store.getItem(scoped));
        throw error;
      }
    },
    removeItem(name) {
      const scoped = key(name);
      checkConflict();
      checkPrevious(name, scoped, null);
      store.removeItem(scoped);
      observed.set(name, null);
    },
    flush() { return account.flush(); },
    paint
  };
  window.PetSpanish = api;
  window.addEventListener('pet-account-status', paint);
  window.addEventListener('pet-account-data', event => {
    if (event.detail === 'pet234:account:v1:' + api.owner + ':' + moduleName) changed();
  });
  window.addEventListener('storage', event => {
    if (api.owner === 'guest' && event.key?.startsWith(prefix)) changed();
  });
  window.addEventListener('pet-account-session', () => location.reload());
  window.addEventListener('pagehide', () => account?.flushBeforeExit(moduleName));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) account?.flushBeforeExit(moduleName);
  });
  documentReady.then(paint);
  api.ready = start();
  api.ready.catch(async error => {
    const choice = await promptChoice('读取西语学习记录', error.message, ['重试', '账号中心', '返回学习页面']);
    if (choice === '重试') location.reload();
    else location.assign(new URL(choice === '账号中心' ? '../account.html' : '../study.html', base));
  });
})();
