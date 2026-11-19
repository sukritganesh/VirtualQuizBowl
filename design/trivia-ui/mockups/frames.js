// Frozen design frames. Switching frames simulates navigation without using a microphone or models.
const frames = {
  home: "Home · choose set", selected: "Home · ready to play", reading: "Host reading",
  buzz: "Buzz window", answering: "Answer window", judging: "Judging",
  correct: "Correct", incorrect: "Incorrect", missed: "Never buzzed",
  paused: "Pause menu", final: "Last question", summary: "Session summary"
};
const screen = document.querySelector("#screen");
const picker = document.querySelector("#frame");
const dialog = document.querySelector("#pauseDialog");
const frameKeys = Object.keys(frames);
let current;
let resumeFrame = "answering";
document.body.classList.toggle("canvas", new URLSearchParams(location.search).has("canvas"));

for (const [key, name] of Object.entries(frames)) picker.add(new Option(name, key));
const brand = '<span class="brand" aria-label="Virtual Quiz Bowl"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>VQB</span>';
const arrow = '<span class="arrow" aria-hidden="true">→</span>';
const homeRail = '<header class="rail">' + brand + '<span class="tag micro">Single-player trivia</span></header>';

function homeFrame(selected) {
  const title = selected ? "The Night Sky" : "Choose a JSON file";
  const detail = selected ? "Astronomy · 8 questions" : "Trivia question set";
  return homeRail + `<main class="home-main">
    <div class="home-copy"><h1 class="home-title">Virtual<span>Quiz Bowl</span></h1>
      <div class="form"><span class="eyebrow">Question set</span>
        <button class="picker" data-go="selected"><span aria-hidden="true" class="file-icon"></span>
          <span class="details"><strong>${title}</strong><small>${detail}</small></span>${arrow}</button>
        <button class="primary play" data-go="reading" ${selected ? "" : "disabled"}>Play ${arrow}</button>
      </div>
    </div>
    <div class="art" aria-hidden="true"><canvas width="800" height="700"></canvas></div>
  </main>`;
}

// Draw a machined blue buzzer in profile, using the same silver, ink and gold as the UI.
function drawBuzzer(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.scale(canvas.width / 500, canvas.height / 438);
  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  function gradient(x1, y1, x2, y2, stops) {
    const fill = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const [position, color] of stops) fill.addColorStop(position, color);
    return fill;
  }
  function disk(y, rx, ry, depth, wall, top, rim) {
    const x = 250;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, Math.PI, 2 * Math.PI);
    ctx.ellipse(x, y + depth, rx, ry, 0, 0, Math.PI);
    ctx.closePath(); ctx.fillStyle = wall; ctx.fill();
    ellipse(x, y, rx, ry); ctx.fillStyle = top; ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 1; ctx.stroke();
  }
  const silver = gradient(80,0,420,0,[[0,"#233750"],[.08,"#7193b7"],[.22,"#273f5d"],[.55,"#17273c"],[.8,"#364b61"],[.93,"#98a4a2"],[1,"#27364a"]]);
  const steel = gradient(130,95,345,320,[[0,"#69839c"],[.24,"#40546d"],[.72,"#14263c"],[1,"#0b172a"]]);
  const base = gradient(100,0,400,0,[[0,"#1e3049"],[.18,"#2f496b"],[.55,"#112239"],[1,"#142639"]]);
  const blueWall = gradient(120,0,381,0,[[0,"#346ada"],[.12,"#508dfa"],[.53,"#254eaa"],[.85,"#193876"],[1,"#37569b"]]);
  const blueFace = gradient(137,117,346,240,[[0,"#aacfff"],[.17,"#8cb6ff"],[.48,"#5c8ff2"],[.8,"#3269d1"],[1,"#2757b7"]]);
  ctx.strokeStyle = "#7e9ecc25"; ctx.lineWidth = .8;
  for (const radius of [198,218]) { ellipse(250,285,radius,radius*.34); ctx.stroke(); }
  ctx.setLineDash([3,6]); ellipse(250,285,231,78.5); ctx.stroke(); ctx.setLineDash([]);
  for (let i=0; i<48; i++) {
    const t = i * Math.PI / 24;
    const outer = i % 4 === 0 ? 228 : 222;
    ctx.beginPath(); ctx.moveTo(250+218*Math.cos(t),285+74*Math.sin(t));
    ctx.lineTo(250+outer*Math.cos(t),285+outer*.34*Math.sin(t)); ctx.stroke();
  }
  ctx.save(); ctx.translate(252,284); ctx.scale(1,.32);
  const shadow = ctx.createRadialGradient(0,0,30,0,0,175);
  shadow.addColorStop(0,"#000c"); shadow.addColorStop(1,"#0000");
  ctx.fillStyle = shadow; ctx.fillRect(-180,-180,360,360); ctx.restore();
  disk(250,160,53,15,base,steel,"#526c8755");
  disk(237,166,56,17,silver,steel,"#8ea9c69c");
  disk(231,163,54,5,base,steel,"#627e9c");
  disk(222,150,50,8,silver,steel,"#92aac0");
  disk(219,136,46,3,"#111f32","#16253c","#91a4b3");
  disk(197,125,45,19,blueWall,blueFace,"#a0c8ff");
  disk(187,121,44,8,blueWall,blueFace,"#b4d5ff");
  ctx.save(); ellipse(250,187,116,41); ctx.clip();
  ctx.strokeStyle="#dbedff28"; ctx.lineWidth=.5;
  for (let x=110;x<410;x+=4) {ctx.beginPath();ctx.moveTo(x,135);ctx.lineTo(x-42,235);ctx.stroke();}
  ctx.restore();
  // A narrow gold index and a matching reflection on the near edge of the base.
  ctx.strokeStyle = "#edcb88"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(250,237,165,56,0,1.03,1.2); ctx.stroke();
  ctx.strokeStyle = "#9f7945"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(250,240,165,56,0,1.03,1.2); ctx.stroke();
}

const words = "Which planet is famous for its bright rings of ice and rock?".split(" ");
const states = {
  reading:   { label: "Host is reading", action: "Buzz in", symbol: "wave" },
  buzz:      { label: "Buzz window open", action: "Buzz in", to: "answering", symbol: "◎" },
  answering: { label: "Buzzed in", detail: "Say your answer.", symbol: "wave" },
  judging:   { label: "Checking answer", symbol: "···" },
  correct:   { label: "Correct", detail: 'Heard “Saturn” · Answer: Saturn', delta: "+5", action: "Next question", to: "reading" },
  incorrect: { label: "Incorrect", detail: 'Heard “Jupiter” · Answer: Saturn', delta: "+0", action: "Next question", to: "reading" },
  missed:    { label: "Never buzzed", detail: "Answer: Saturn", delta: "+0", action: "Next question", to: "reading" },
  final:     { label: "Correct", detail: 'Heard “Saturn” · Answer: Saturn', delta: "+5", action: "View results", to: "summary" }
};

function soundMark(state) {
  if (state.symbol === "wave") {
    const bars = [8,14,22,12,17,8].map(h => `<i style="--h:${h}px"></i>`).join("");
    return `<span class="signal" aria-hidden="true">${bars}</span>`;
  }
  return `<span class="signal symbol ${state.delta === "+5" ? "earned" : ""}">${state.delta || state.symbol}</span>`;
}

function roundFrame(key) {
  const state = states[key];
  const clock = key === "buzz" ? ["Buzz","05 s"] : key === "answering" ? ["Answer","03 s"] : ["Timer","—"];
  const score = key === "final" ? 25 : key === "correct" ? 10 : 5;
  const prompt = words.map((word,i) => {
    const style = key !== "reading" || i < 6 ? "spoken" : "";
    return `<span class="${style}${key === "reading" && i === 5 ? " active-word" : ""}">${word}</span>`;
  }).join(" ");
  const shortcut = key === "buzz" || key === "reading" ? "Space" : "Enter";
  const action = state.action ? `<button class="${state.to ? "primary" : "quiet"}" ${state.to ? 'data-go="'+state.to+'"' : "disabled"}>
    ${state.action} <kbd>${shortcut}</kbd></button>` : "";
  return `<header class="rail"><div class="rail-group"><button class="icon" data-menu aria-label="Open pause menu"><span class="hamburger"></span></button>
    <div class="clock"><span class="micro">${clock[0]}</span><b>${clock[1]}</b></div></div>
    <div class="metric"><span class="micro">Score</span><b>${score}</b></div></header>
    <main class="question-area"><div class="kicker"><span class="eyebrow">Question ${key === "final" ? "08" : "03"} / 08</span>
    <span class="category micro">Astronomy</span></div>
    <h1 class="question" aria-label="${words.join(" ")}"><span aria-hidden="true">${prompt}</span></h1></main>
    <footer class="dock"><div class="state">${soundMark(state)}<div><h2>${state.label}</h2>${state.detail ? "<p>"+state.detail+"</p>" : ""}</div></div>
    <div class="actions">${action}</div></footer>`;
}

function summaryFrame() {
  return homeRail + `<main class="summary"><span class="eyebrow">Set complete</span><h1>The Night Sky</h1>
    <div class="total"><strong>25</strong><span>points</span></div>
    <dl class="stats"><div><dt>Correct</dt><dd>5</dd></div><div><dt>Wrong</dt><dd>2</dd></div><div><dt>Never buzzed</dt><dd>1</dd></div></dl>
    <button class="quiet" data-go="home">Back to home ${arrow}</button></main>`;
}

function render() {
  const hash = location.hash.slice(1);
  const key = Object.hasOwn(frames, hash) ? hash : "home";
  const restored = current === "paused" && key === resumeFrame;
  if (key === "paused" && Object.hasOwn(states, current)) resumeFrame = current;
  if (dialog.open && key !== "paused") dialog.close();
  current = key;
  const scene = key === "paused" ? resumeFrame : key;
  const home = scene === "home" || scene === "selected";
  const content = home ? homeFrame(scene === "selected") : scene === "summary" ? summaryFrame() : roundFrame(scene);
  screen.innerHTML = '<div class="stage">' + content + "</div>";
  if (home) drawBuzzer(screen.querySelector("canvas"));
  picker.value = key;
  if (key === "paused" && !dialog.open) dialog.showModal();
  if (restored) screen.querySelector("[data-menu]").focus();
  document.title = frames[key] + " · Virtual Quiz Bowl UI";
}

function go(key) { location.hash = key; }
function step(direction) { go(frameKeys[(frameKeys.indexOf(current) + direction + frameKeys.length) % frameKeys.length]); }
picker.addEventListener("change", () => go(picker.value));
document.querySelector("#previous").addEventListener("click", () => step(-1));
document.querySelector("#next").addEventListener("click", () => step(1));
screen.addEventListener("click", e => {
  const button = e.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-menu")) go("paused");
  else if (button.dataset.go) go(button.dataset.go);
});
dialog.querySelector(".close").addEventListener("click", () => go(resumeFrame));
dialog.querySelector(".quit").addEventListener("click", () => go("home"));
dialog.addEventListener("cancel", e => { e.preventDefault(); go(resumeFrame); });
window.addEventListener("keydown", e => {
  if (dialog.open || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest(".viewer, button")) return;
  if (e.code === "Space" && current === "buzz") { e.preventDefault(); go("answering"); }
  if (e.key === "Enter" && states[current]?.delta) { e.preventDefault(); go(states[current].to); }
});
window.addEventListener("hashchange", render);
render();
