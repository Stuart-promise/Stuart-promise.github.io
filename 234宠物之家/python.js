import {walkthroughs} from "./python-walkthrough.js";
import {groups, lessons} from "./python-course.js?v=1";

const $ = id => document.getElementById(id);
const prefix = "pet234-python-v1:";
if (!globalThis.PetAccount) await import("./account.js?v=forum1");
const accountStore = await PetAccount.open("python");
const memory = new Map();
function read(key) {
  try { return accountStore.getItem(prefix + key) ?? memory.get(key); }
  catch { return memory.get(key); }
}
function save(key, value) {
  memory.set(key, value);
  try { accountStore.setItem(prefix + key, value); }
  catch { $("store-warning").textContent = "浏览器未能保存进度。本次学习仍可继续，关闭页面后可能丢失。"; }
}
const passed = (level, task) => read("pass:" + level + ":" + task) === "1";
const complete = level => lessons[level].tasks.every((_, i) => passed(level, i));
const unlocked = () => {
  const first = lessons.findIndex((_, i) => !complete(i));
  return first < 0 ? lessons.length - 1 : first;
};
function bounded(value, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}
let level = bounded(read("level") ?? unlocked(), unlocked()) ?? unlocked();
let task = bounded(read("task") ?? 0, 3) ?? 0;
let worker;
let timer;
let busy = false;
const draftKey = kind => [kind, level, task].join(":");
const format = value => typeof value === "string" ? value : JSON.stringify(value);
const exercise = () => lessons[level].tasks[task];

function paintMap() {
  const done = lessons.reduce((total, _, i) => total + Number(complete(i)), 0);
  const solved = lessons.reduce((total, l, i) => total + l.tasks.filter((_, j) => passed(i, j)).length, 0);
  $("progress").textContent = "已通关 " + done + " / 24 · 已解题 " + solved + " / 72";
  $("meter").value = solved;
  const chapters = $("chapters");
  chapters.replaceChildren();
  groups.forEach(([title], g) => {
    const detail = document.createElement("details");
    detail.open = Math.floor(level / 4) === g;
    const summary = document.createElement("summary");
    summary.textContent = title;
    detail.append(summary);
    for (let i = g * 4; i < g * 4 + 4; i++) {
      const button = document.createElement("button");
      button.textContent = (i + 1) + ". " + lessons[i].title + (complete(i) ? " ✓" : i > unlocked() ? " · 未解锁" : "");
      button.disabled = i > unlocked();
      button.setAttribute("aria-current", String(i === level));
      button.onclick = () => selectLevel(i);
      detail.append(button);
    }
    chapters.append(detail);
  });
}
function selectLevel(i) {
  if (i > unlocked()) return;
  cancelRun();
  level = i;
  task = Math.max(0, lessons[i].tasks.findIndex((_, j) => !passed(i, j)));
  $("roadmap").classList.remove("visible");
  $("map-button").setAttribute("aria-expanded", "false");
  render();
  $("title").focus();
}
function render() {
  save("level", String(level));
  save("task", String(task));
  const lesson = lessons[level];
  const [group, minutes] = groups[Math.floor(level / 4)];
  $("stage").textContent = group + " · 第 " + (level + 1) + " / 24 关";
  $("title").textContent = lesson.title;
  $("summary").textContent = lesson.text;
  $("example").textContent = lesson.example;
  $("trace").textContent = walkthroughs[level][0];
  $("pitfall").textContent = walkthroughs[level][1];
  const labMinutes = Math.floor(minutes * 0.3);
  $("plan").textContent = "预计 " + minutes + " 分钟：读例与推演 8 分钟，三道闯关题 " +
    (minutes - labMinutes - 8) + " 分钟，自由实践 " + labMinutes + " 分钟。";
  $("tasks").replaceChildren();
  ["练习一","练习二","关卡挑战","自由实践"].forEach((name, i) => {
    const button = document.createElement("button");
    button.textContent = name + (i < 3 && passed(level, i) ? " ✓" : "");
    button.setAttribute("aria-pressed", String(i === task));
    button.onclick = () => { cancelRun(); task = i; render(); };
    $("tasks").append(button);
  });
  const ex = exercise();
  const given = ex?.cases[0][0] ?? "";
  $("task-title").textContent = ex?.name ?? "实践工作台";
  $("goal").textContent = ex?.goal ?? lesson.lab;
  $("sample").hidden = !ex;
  if (ex) {
    $("sample").textContent = "示例输入：" + (format(given) || "（空）") + "\n预期" +
      (ex.call ? "返回值：" : "输出：") + (format(ex.cases[0][1]) || "（空）");
  }
  $("source").value = read(draftKey("code")) ?? (ex ? ex.starter : lesson.example);
  $("given").value = read(draftKey("given")) ?? format(given);
  $("input-label").textContent = ex?.call ? "试跑参数（JSON 数组，按参数顺序填写）" :
    typeof given === "object" ? "试跑变量（JSON 对象，键名就是代码中的变量名）" : "试跑输入（每次 input() 读取一行）";
  $("submit").hidden = !ex;
  $("output").textContent = ex && passed(level, task) ? "这道题已通过，可以继续修改并试跑。" : "运行结果会显示在这里。";
  updateNext();
  paintMap();
}
function updateNext() {
  const done = complete(level);
  const step = lessons[level].tasks.findIndex((_, j) => !passed(level, j));
  $("next").hidden = !(done || passed(level, task));
  $("next").textContent = done ? level === lessons.length - 1 ? "全课程已通关 · 查看进度" : "进入下一关 →" : "继续下一道练习 →";
  $("next").onclick = () => {
    if (done && level < lessons.length - 1) selectLevel(level + 1);
    else if (done) {
      $("roadmap").classList.add("visible");
      $("roadmap").scrollIntoView({block:"start"});
    } else { cancelRun(); task = step; render(); }
  };
}
function setBusy(value) {
  busy = value;
  $("submit").disabled = $("try").disabled = value;
  $("source").readOnly = $("given").readOnly = value;
  $("stop").hidden = !value;
}
function cancelRun() {
  clearTimeout(timer);
  if (busy && worker) { worker.terminate(); worker = undefined; }
  setBusy(false);
}
function failure(message) {
  cancelRun();
  $("output").textContent = message;
}
function feedback(results, cases, grade) {
  const failAt = results.findIndex(result => !result.ok);
  const index = grade && failAt >= 0 ? failAt : 0;
  const result = results[index];
  if (grade && failAt === -1) {
    save("pass:" + level + ":" + task, "1");
    render();
    $("output").textContent = "通过全部 " + cases.length + " 组检验。" + (complete(level) ?
      level === 23 ? "恭喜完成全部 24 关！" : "本关已完成，下一关已解锁。" : "继续完成本关的其他练习。");
    return;
  }
  const lines = [];
  if (grade) lines.push("第 " + (index + 1) + " 组未通过", "输入：" + (format(cases[index][0]) || "（空）"),
    "预期：" + (format(cases[index][1]) || "（空）"));
  if (result.log) lines.push("调试输出：\n" + result.log);
  lines.push(result.error || ((exercise()?.call ? "返回值：" : "实际输出：") + (result.actual || "（空）")));
  $("output").textContent = lines.join("\n");
}
function run(grade) {
  if (busy) return;
  const ex = exercise();
  let cases;
  try {
    if (grade) cases = ex.cases;
    else {
      let given = $("given").value;
      if (ex && typeof ex.cases[0][0] === "object") {
        given = JSON.parse(given);
        if (ex.call ? !Array.isArray(given) : !given || typeof given !== "object" || Array.isArray(given)) throw Error();
      }
      cases = [[given, null]];
    }
  } catch { $("output").textContent = "试跑输入格式有误，请参照示例填写 JSON，文字使用英文双引号。"; return; }
  setBusy(true);
  $("output").textContent = "正在准备 Python 环境…";
  try {
    worker ||= new Worker("./python-worker.js?v=1");
    worker.onerror = () => failure("Python 环境加载失败，请检查网络后重新试跑。");
    worker.onmessage = ({data}) => {
      clearTimeout(timer);
      if (data.running) {
        $("output").textContent = "代码运行中…";
        timer = setTimeout(() => failure("运行超过 8 秒，已停止。请检查循环能否结束，再试一次。"), 8000);
      } else if (data.error) {
        failure("运行失败，可修改代码或重试。\n" + data.error);
      } else {
        setBusy(false);
        feedback(data.results, cases, grade);
      }
    };
    timer = setTimeout(() => failure("Python 环境加载超时，请检查网络后重试。"), 120000);
    worker.postMessage({source:$("source").value, call:ex?.call ?? null, cases, grade});
  } catch { failure("当前浏览器无法启动 Python，请使用支持 WebAssembly 的浏览器。"); }
}
$("try").onclick = () => run(false);
$("submit").onclick = () => run(true);
$("stop").onclick = () => failure("本次运行已停止，可以继续编辑。");
$("source").oninput = () => save(draftKey("code"), $("source").value);
$("given").oninput = () => save(draftKey("given"), $("given").value);
$("source").onkeydown = event => {
  if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !busy) {
    event.preventDefault();
    const box = $("source");
    box.setRangeText("    ", box.selectionStart, box.selectionEnd, "end");
    box.oninput();
  }
};
$("map-button").onclick = () => {
  const open = $("roadmap").classList.toggle("visible");
  $("map-button").setAttribute("aria-expanded", String(open));
};
render();
$("source").disabled = false;
$("given").disabled = false;
