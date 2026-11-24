(() => {
  'use strict';
  const moduleName = 'zhaoyun-adou';
  const account = window.PetAccount;
  const conflictMessage = '这台设备和云端各有一份进度。请先到账号中心选择要继续使用的版本。';
  const labels = {
    guest: '游客 · 本机存档', checking: '读取云存档…', synced: '云存档已同步',
    pending: '等待云同步', offline: '离线 · 本机存档', conflict: '存档冲突 · 选择版本',
    'storage-error': '本机空间不足', expired: '请重新登录'
  };

  function updateStatus() {
    const link = document.getElementById('zyad-save-status');
    if (link) link.textContent = labels[account.syncState(moduleName)];
  }

  function choose(title, message, actions) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'zyad-save-prompt';
      dialog.setAttribute('aria-label', title);
      const heading = document.createElement('strong');
      heading.textContent = title;
      const text = document.createElement('p');
      text.textContent = message;
      dialog.append(heading, text);
      for (const action of actions) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action;
        button.onclick = () => { dialog.remove(); resolve(action); };
        dialog.append(button);
      }
      dialog.addEventListener('cancel', event => event.preventDefault());
      document.body.append(dialog);
      if (dialog.showModal) dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  }

  async function prepare() {
    const store = await account.open(moduleName);
    account.assertOwner();
    if (!account.session) return store;
    const state = account.read(moduleName);
    if (state.conflict) throw Error(conflictMessage);
    if (Object.keys(state.data).length) return store;
    if (account.syncState(moduleName) !== 'synced') {
      throw Error('本机还没有此账号的游戏进度。请联网读取云存档后再开始。');
    }
    if (Object.keys(account.guestData(moduleName)).length) {
      const name = account.profile?.nickname || account.session.user.username;
      const selected = await choose('继续使用这台设备的存档？',
        '这台设备上有《赵云与阿斗》的游玩记录，账号「' + name + '」还没有云存档。原有记录会保留在本机。',
        ['导入到我的账号', '使用新存档']);
      account.assertOwner();
      if (selected === '导入到我的账号') {
        await account.importGuest(moduleName);
        if (account.read(moduleName).conflict) throw Error(conflictMessage);
      }
    }
    return store;
  }

  async function start() {
    const frame = document.querySelector('iframe[data-src]');
    if (!frame) return;
    if (!account) {
      await choose('读取游戏存档', '账号组件未能加载，请重试。', ['重新加载']);
      location.reload();
      return;
    }
    window.addEventListener('pet-account-status', updateStatus);
    window.addEventListener('pet-account-data', updateStatus);
    window.addEventListener('pet-account-session', () => location.reload());
    window.addEventListener('pagehide', () => account.flush().catch(() => {}));
    updateStatus();
    try {
      const storage = await prepare();
      account.assertOwner();
      window.PetZhaoSave = { storage };
      frame.src = frame.dataset.src;
      updateStatus();
      window.dispatchEvent(new Event('zyad-save-ready'));
    } catch (error) {
      updateStatus();
      const selected = await choose('读取游戏存档', error.message, ['重试', '打开账号中心', '返回游戏大厅']);
      if (selected !== '重试') {
        location.assign(selected === '打开账号中心' ? '../account.html' : '../games.html');
        return;
      }
      // A new session or a resolved conflict may have been written in the meantime.
      location.reload();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
