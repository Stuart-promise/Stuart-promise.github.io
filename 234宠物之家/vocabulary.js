const $ = id => document.getElementById(id);
const book = new URLSearchParams(location.search).get("book") === "cet6" ? "cet6" : "cet4";
const title = book === "cet6" ? "大学六级" : "大学四级";
const prefix = "pet234:vocab:v1:" + book + ":";
const goalKey = prefix + "daily-goal";
if (!globalThis.PetAccount) await import("./account.js?v=rank1");
const accountStore = await PetAccount.open("vocab-" + book);
const intervals = [1, 2, 4, 7, 15, 30];
const records = new Map();
const fmt = (date, options) => date.toLocaleDateString("zh-CN", options);
const dayKey = date => [date.getFullYear(), date.getMonth()+1, date.getDate()].join("-");
function midnightAfter(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()+days).getTime();
}
const nextStage = entry => Math.min((entry?.stage ?? -1)+1, intervals.length-1);
let words, active, revealed = false, goal = 20, wake;
document.querySelector('[data-book="'+book+'"]').setAttribute("aria-current","page");
$("card-book").textContent = title;
function storageWarning() {
  $("warning").textContent = "浏览器未能读写学习进度，本次仍可学习。请允许网站存储后再试。";
}
function read(key) {
  try { return accountStore.getItem(key); } catch { storageWarning(); return null; }
}
function write(key, value) {
  try { accountStore.setItem(key, value); } catch { storageWarning(); }
}
function parseRecord(raw) {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    if (typeof entry?.first === "string" && Number.isFinite(entry.due) && Number.isInteger(entry.stage) &&
        entry.stage >= -1 && entry.stage < intervals.length) return entry;
  } catch {}
  return null;
}
function loadGoal() {
  const saved = Number(read(goalKey));
  goal = [5,10,20,30,50].includes(saved) ? saved : 20;
  $("goal").value = goal;
}
function render() {
  if (!words) return;
  const now = new Date(), today = dayKey(now);
  const future = Array.from({length:7}, (_,i) => midnightAfter(now,i+1));
  const week = Array(7).fill(0);
  let learned = 0, reviewed = 0, due = 0, oldest = Infinity, earliest = Infinity, reviewWord, newWord;
  for (const row of words) {
    const entry = records.get(row[0]);
    if (!entry) { newWord ??= row; continue; }
    if (entry.first === today) learned++;
    if (entry.lastReview === today) reviewed++;
    if (entry.due <= now.getTime()) {
      due++;
      if (entry.due < oldest) { oldest = entry.due; reviewWord = row; }
    } else {
      earliest = Math.min(earliest,entry.due);
      const day = future.indexOf(midnightAfter(new Date(entry.due),0));
      if (day >= 0) week[day]++;
    }
  }
  const remaining = Math.min(Math.max(0, goal-learned), words.length-records.size);
  const next = reviewWord || (remaining > 0 ? newWord : null);
  if (active !== next) revealed = false;
  active = next;
  $("date").textContent = fmt(now,{month:"long",day:"numeric",weekday:"long"});
  $("learned").textContent = learned;
  $("reviewed").textContent = reviewed;
  $("due").textContent = due;
  $("remaining").textContent = remaining;
  $("progress").textContent = "已学 " + records.size + " / " + words.length + " 词";
  $("week").replaceChildren(...future.map((start,i) => {
    const cell = document.createElement("span"), count = document.createElement("b");
    cell.textContent = fmt(new Date(start),{month:"numeric",day:"numeric"});
    count.textContent = week[i];
    cell.append(count);
    return cell;
  }));
  $("reveal").hidden = !active || revealed;
  $("grades").hidden = !active || !revealed;
  $("meaning").hidden = !active || !revealed;
  if (active) {
    const [word, phonetic, definition] = active, entry = records.get(word);
    $("kind").textContent = entry ? "到期复习" : "今日新词";
    $("word").textContent = word;
    $("phonetic").textContent = phonetic ? "/" + phonetic + "/" : "";
    $("meaning").textContent = revealed ? definition : "";
    $("cue").textContent = revealed ? "" : "先回想中文意思，再翻开核对。";
    $("later").textContent = intervals[nextStage(entry)] + " 天后";
  } else {
    $("kind").textContent = "今日计划";
    $("word").textContent = "本轮已完成";
    $("phonetic").textContent = "";
    $("cue").textContent = Number.isFinite(earliest) ? "下次复习：" + new Date(earliest).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
  }
  clearTimeout(wake);
  wake = setTimeout(render, Math.max(30, Math.min(earliest,future[0])-Date.now()+20));
}
$("reveal").onclick = () => { revealed = true; render(); $("remember").focus(); };
function grade(remembered) {
  if (!revealed || !active) return;
  const word = active[0], key = prefix+"word:"+word, previous = records.get(word);
  const stored = parseRecord(read(key));
  if (stored && JSON.stringify(stored)!==JSON.stringify(previous)) {
    records.set(word,stored);
    revealed=false; render(); $("feedback").textContent="已同步另一个页面的学习进度。"; return;
  }
  const now = new Date(), today = dayKey(now);
  const stage = remembered ? nextStage(previous) : -1;
  const due = remembered ? midnightAfter(now,intervals[stage]) : now.getTime()+600000;
  const entry = {first:previous?.first ?? today, lastReview:previous ? today : "", stage, due};
  records.set(word,entry); write(key,JSON.stringify(entry));
  $("feedback").textContent = word + " · " + (remembered ? intervals[stage]+" 天后复习" : "10 分钟后重练");
  revealed = false; render();
  if (active) $("reveal").focus();
}
$("remember").onclick = () => grade(true);
$("forgot").onclick = () => grade(false);
$("goal").onchange = () => { goal=Number($("goal").value); write(goalKey,String(goal)); render(); };
window.addEventListener("storage", event => {
  if (!event.key) { location.reload(); return; }
  if (event.key === goalKey) loadGoal();
  else if (event.key.startsWith(prefix+"word:")) {
    const word=event.key.slice((prefix+"word:").length), entry=parseRecord(event.newValue);
    if (entry) records.set(word,entry); else records.delete(word);
  } else return;
  render();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
try {
  const response = await fetch("./"+book+".json?v=1");
  if (!response.ok) throw Error();
  words = await response.json();
  loadGoal();
  for (const [word] of words) {
    const entry = parseRecord(read(prefix+"word:"+word));
    if (entry) records.set(word,entry);
  }
  $("book-summary").textContent = title+" · "+words.length.toLocaleString("zh-CN")+" 词";
  $("goal").disabled = false; render();
} catch {
  $("word").textContent = "词库加载失败";
  $("book-summary").textContent = "请检查网络后刷新页面重试。";
}

window.addEventListener("pet-account-data", () => {
  if (!words) return;
  loadGoal(); records.clear();
  for (const [word] of words) { const entry = parseRecord(read(prefix+"word:"+word)); if (entry) records.set(word,entry); }
  render();
});
