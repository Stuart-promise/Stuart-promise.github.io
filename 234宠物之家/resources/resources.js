const account = window.PetAccount;
const tags = ['初中', '高中', '数学', '其他学科', '其他资料'];
const byId = id => document.getElementById(id);
const searchInput = byId('resource-q');
const list = byId('resources-list');
const publishDialog = byId('publish-dialog');
const deleteDialog = byId('delete-dialog');
const selected = new Set();
let query = '';
let nextCursor = null;
let listVersion = 0;
let listBusy = false;
let retryAppend = false;
let debounce;
let submission = null;
let publishing = false;
let deleting = false;
let deleteItem = null;

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function paintAccount() {
  byId('resource-new').hidden = !account.session;
  byId('resource-login').hidden = !!account.session;
}

function setupTags() {
  const params = new URLSearchParams(location.search);
  query = (params.get('q') || '').trim().slice(0, searchInput.maxLength);
  searchInput.value = query;
  for (const tag of tags) if (params.getAll('tag').includes(tag)) selected.add(tag);
  for (const tag of ['', ...tags]) {
    const button = make('button', 'tag-filter', tag || '全部');
    button.type = 'button';
    button.dataset.tag = tag;
    button.addEventListener('click', () => {
      if (!tag) selected.clear();
      else if (selected.has(tag)) selected.delete(tag);
      else selected.add(tag);
      applySearch();
    });
    byId('filter-tags').append(button);
  }
  for (const tag of tags) {
    const label = make('label', 'tag-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'tags';
    input.value = tag;
    label.append(input, make('span', '', tag));
    byId('publish-tags').append(label);
  }
}

function filters() {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  for (const tag of tags) if (selected.has(tag)) params.append('tag', tag);
  return params;
}

function paintFilters() {
  for (const button of byId('filter-tags').children) {
    const tag = button.dataset.tag;
    button.setAttribute('aria-pressed', String(tag ? selected.has(tag) : !selected.size));
  }
  byId('filter-note').hidden = selected.size < 2;
  byId('clear-filters').hidden = !query && !selected.size;
  byId('list-title').textContent = query || selected.size ? '筛选结果' : '全部资源';
}

function applySearch() {
  clearTimeout(debounce);
  query = searchInput.value.trim();
  paintFilters();
  const url = new URL(location.href);
  url.search = filters().toString();
  if (url.href !== location.href) history.replaceState(null, '', url);
  void loadList();
}

function resourceCard(resource) {
  const card = make('article', 'resource-card');
  card.dataset.id = resource.id;
  const chips = make('div', 'card-tags');
  for (const tag of resource.tags) chips.append(make('span', '', tag));
  const actions = make('div', 'card-actions');
  const url = parseUrl(resource.url);
  if (url && ['https:', 'http:'].includes(url.protocol)) {
    const open = make('a', 'drive-link', '打开网盘 ↗');
    open.href = url.href;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    open.title = resource.url;
    open.setAttribute('aria-label', '打开网盘：' + resource.title);
    actions.append(open);
  }
  if (resource.canDelete) {
    const button = make('button', 'delete-resource', '删除');
    button.type = 'button';
    button.setAttribute('aria-label', '删除：' + resource.title);
    button.addEventListener('click', () => {
      deleteItem = resource;
      byId('delete-title').textContent = resource.title;
      byId('delete-feedback').textContent = '';
      deleteDialog.showModal();
    });
    actions.append(button);
  }
  const footer = make('div', 'card-footer-row');
  footer.append(chips, actions);
  card.append(make('h3', '', resource.title), make('p', 'description', resource.description), footer);
  return card;
}

function parseUrl(value) {
  try { return new URL(value); } catch { return null; }
}

async function loadList(append = false) {
  if (append && (listBusy || nextCursor === null)) return;
  const version = ++listVersion;
  listBusy = true;
  const params = filters();
  if (append) params.set('before', nextCursor);
  else {
    list.replaceChildren();
    nextCursor = null;
  }
  list.setAttribute('aria-busy', 'true');
  byId('resource-empty').hidden = true;
  byId('resource-retry').hidden = true;
  byId('resource-more').hidden = true;
  byId('list-status').textContent = append ? '正在读取更多资源…' : '正在读取资源…';
  try {
    const data = await account.request('/v1/resources?' + params, {anonymous: !account.session});
    if (version !== listVersion) return;
    const cards = document.createDocumentFragment();
    for (const resource of data.items) cards.append(resourceCard(resource));
    list.append(cards);
    nextCursor = data.nextCursor ?? null;
    byId('resource-more').hidden = nextCursor === null;
    byId('list-status').textContent = list.childElementCount ? '已显示 ' + list.childElementCount + ' 份资源' : '';
    if (!list.childElementCount) {
      const filtered = Boolean(query || selected.size);
      const empty = byId('resource-empty');
      empty.querySelector('h3').textContent = filtered ? '没有找到匹配的资源' : '还没有人分享资源';
      empty.querySelector('p').textContent = filtered ? '试试其他标题关键词，或清除筛选。' : '分享一份学习资料，就会出现在这里。';
      empty.hidden = false;
    }
  } catch (error) {
    if (version !== listVersion) return;
    retryAppend = append;
    byId('list-status').textContent = error.status || error.identityChanged ? error.message : '暂时无法读取资源，请检查网络后重试。';
    byId('resource-retry').hidden = false;
  } finally {
    if (version === listVersion) {
      listBusy = false;
      list.setAttribute('aria-busy', 'false');
    }
  }
}

function clearFilters() {
  searchInput.value = '';
  selected.clear();
  applySearch();
}

function closeForms() {
  if (publishDialog.open) publishDialog.close();
  if (deleteDialog.open) deleteDialog.close();
}

byId('resource-new').addEventListener('click', () => {
  if (!account.session) return;
  byId('publish-feedback').textContent = '';
  publishDialog.showModal();
});
byId('publish-cancel').addEventListener('click', () => publishDialog.close());
byId('delete-cancel').addEventListener('click', () => deleteDialog.close());
publishDialog.addEventListener('cancel', event => { if (publishing) event.preventDefault(); });
deleteDialog.addEventListener('cancel', event => { if (deleting) event.preventDefault(); });

byId('publish-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (publishing || !account.session) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const body = {
    title: data.get('title').trim(),
    description: data.get('description').trim(),
    tags: data.getAll('tags'),
    url: data.get('url').trim()
  };
  const feedback = byId('publish-feedback');
  if (!body.title || !body.description) {
    feedback.textContent = '请填写标题和简介。';
    byId(body.title ? 'resource-description' : 'resource-title').focus();
    return;
  }
  if (!body.tags.length) {
    feedback.textContent = '请至少选择一个标签。';
    byId('publish-tags').querySelector('input').focus();
    return;
  }
  const link = parseUrl(body.url);
  if (!link || !['https:', 'http:'].includes(link.protocol)) {
    feedback.textContent = '请粘贴完整的网盘分享链接。';
    byId('resource-url').focus();
    return;
  }
  const serialized = JSON.stringify(body);
  if (submission?.body !== serialized) submission = {body: serialized, id: crypto.randomUUID()};
  publishing = true;
  byId('publish-fields').disabled = byId('publish-submit').disabled = byId('publish-cancel').disabled = true;
  byId('publish-submit').textContent = '正在发布…';
  feedback.textContent = '';
  try {
    await account.request('/v1/resources?requestId=' + submission.id, {method: 'POST', body: serialized});
    submission = null;
    form.reset();
    publishDialog.close();
    byId('resource-notice').textContent = '已发布《' + body.title + '》。';
    clearFilters();
  } catch (error) {
    feedback.textContent = error.status || error.identityChanged ? error.message : '暂时未能确认发布结果，请联网后重试。';
  } finally {
    publishing = false;
    byId('publish-fields').disabled = byId('publish-submit').disabled = byId('publish-cancel').disabled = false;
    byId('publish-submit').textContent = '发布';
  }
});

byId('delete-confirm').addEventListener('click', async () => {
  if (deleting || !deleteItem) return;
  deleting = true;
  byId('delete-confirm').disabled = byId('delete-cancel').disabled = true;
  byId('delete-feedback').textContent = '';
  try {
    await account.request('/v1/resources/' + encodeURIComponent(deleteItem.id) + '/delete', {method: 'POST'});
    byId('resource-notice').textContent = '已删除《' + deleteItem.title + '》。';
    deleteItem = null;
    deleteDialog.close();
    void loadList();
  } catch (error) {
    byId('delete-feedback').textContent = error.status || error.identityChanged ? error.message : '暂时未能确认删除结果，请联网后重试。';
  } finally {
    deleting = false;
    byId('delete-confirm').disabled = byId('delete-cancel').disabled = false;
  }
});

byId('search-form').addEventListener('submit', event => { event.preventDefault(); applySearch(); });
function queueSearch() {
  clearTimeout(debounce);
  debounce = setTimeout(applySearch, 320);
}
searchInput.addEventListener('input', event => { if (!event.isComposing) queueSearch(); });
searchInput.addEventListener('compositionstart', () => clearTimeout(debounce));
searchInput.addEventListener('compositionend', queueSearch);
byId('clear-filters').addEventListener('click', clearFilters);
byId('resource-more').addEventListener('click', () => loadList(true));
byId('resource-retry').addEventListener('click', () => loadList(retryAppend));
window.addEventListener('pet-account-session', () => {
  closeForms();
  byId('publish-form').reset();
  submission = deleteItem = null;
  byId('resource-notice').textContent = '';
  paintAccount();
  void loadList();
});
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    try { account.assertOwner(); paintAccount(); void loadList(); }
    catch { location.reload(); }
  }
});
setupTags();
paintAccount();
paintFilters();
void loadList();
if (location.hash === '#publish' && account.session) {
  history.replaceState(null, '', location.pathname + location.search);
  byId('resource-new').click();
}
