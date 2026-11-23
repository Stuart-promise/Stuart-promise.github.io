const el = id => document.getElementById(id);
const stage = el("game-stage");
const pad = el("room-pad");
const entry = el("room-entry");
const input = el("room-input");
let digits = "";

export function isHandheld() {
  return getComputedStyle(document.documentElement).getPropertyValue("--mine-handheld").trim() === "1";
}

export function refreshRoomEntry() {
  if (entry) entry.textContent = input.value || "6 位房间号";
}

function drawDigits() {
  el("pad-value").textContent = (digits + "------").slice(0, 6).split("").join(" ");
  el("pad-join").disabled = digits.length !== 6;
  el("pad-delete").disabled = !digits.length;
}

function setPadOpen(open) {
  pad.hidden = !open;
  entry.setAttribute("aria-expanded", String(open));
  for (const node of stage.children) {
    if (node !== pad) node.inert = open;
  }
  if (open) {
    pad.querySelector("[data-digit]").focus({preventScroll:true});
  } else if (isHandheld() && entry.getClientRects().length) {
    entry.focus({preventScroll:true});
  }
}

export function openRoomPad() {
  digits = input.value.normalize("NFKC").replace(/\D/g, "").slice(0, 6);
  drawDigits();
  setPadOpen(true);
}

function addDigit(digit) {
  if (digits.length < 6) digits += digit;
  drawDigits();
}

function joinFromPad() {
  if (digits.length !== 6) return;
  input.value = digits;
  refreshRoomEntry();
  setPadOpen(false);
  el("join-room").click();
}

function wirePad() {
  entry.addEventListener("click", openRoomPad);
  input.addEventListener("input", refreshRoomEntry);
  pad.addEventListener("click", event => {
    const digit = event.target.closest("[data-digit]");
    if (digit) addDigit(digit.dataset.digit);
  });
  el("pad-cancel").addEventListener("click", () => setPadOpen(false));
  el("pad-delete").addEventListener("click", () => { digits = digits.slice(0, -1); drawDigits(); });
  el("pad-join").addEventListener("click", joinFromPad);
  pad.addEventListener("keydown", event => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === "Escape") setPadOpen(false);
    else if (event.key === "Backspace") el("pad-delete").click();
    else if (/^\d$/.test(event.key)) addDigit(event.key);
    else return;
    event.preventDefault();
    event.stopPropagation();
  });
}

function wireScreenButton() {
  const button = el("screen-mode");
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const active = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  let locked = false;
  function update() {
    const phone = isHandheld();
    if (!phone && !pad.hidden) setPadOpen(false);
    button.hidden = !phone || !request || !exit ||
      !(document.fullscreenEnabled ?? document.webkitFullscreenEnabled);
    button.textContent = active() ? "退出全屏" : "全屏";
    button.setAttribute("aria-pressed", String(active()));
    if (locked && !active()) { screen.orientation?.unlock?.(); locked = false; }
  }
  button.addEventListener("click", async () => {
    try {
      if (active()) await exit.call(document);
      else {
        await request.call(root);
        if (active() && screen.orientation?.lock) {
          try { await screen.orientation.lock("landscape"); locked = true; } catch {}
        }
      }
    } catch {
      el("announcement").textContent = "浏览器未进入全屏，仍可在当前横屏界面游玩。";
    }
    update();
  });
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("webkitfullscreenchange", update);
  window.addEventListener("resize", update);
  update();
}

if (stage) {
  wirePad();
  wireScreenButton();
  for (const type of ["contextmenu", "selectstart", "dragstart"]) {
    stage.addEventListener(type, event => {
      if (isHandheld() || event.target.closest("button, canvas")) event.preventDefault();
    }, {capture:true});
  }
}
