(() => {
  "use strict";
  const config = {
    supply: { title: "보급선을 배치해 전초기지 지키기 / 우주 전략 / 물류 디펜스", detail: "공격 예고를 보고 보급선 2척을 배정하세요. 5번의 공격 뒤 기지 2곳 이상을 지키면 성공입니다.", type: "보급 배정" },
    orbit: { title: "궤도 창에 함대를 보내 항로 확보하기 / 우주 전략 / 타이밍 퍼즐", detail: "궤도 창이 열릴 때 이동하거나 연료를 더 써서 우회하세요. 7턴 안에 귀환 항구에 도착하세요.", type: "출발 시점" },
    formation: { title: "함대 대형을 바꿔 포격 돌파하기 / 우주 전술 / 진형 퍼즐", detail: "적 포격 예고에 맞춰 대형을 정하세요. 5라운드 안에 전진 6 이상으로 요새를 돌파하세요.", type: "진형 선택" },
  };
  const app = document.querySelector("#app");
  const query = new URLSearchParams(location.search).get("game");
  let current = Object.hasOwn(config, query) ? query : "supply";
  let state = null;
  const bases = ["청명", "파도", "여울"];
  const waves = [[3, 2, 0], [0, 4, 1], [2, 0, 3], [4, 1, 0], [1, 3, 3]];
  const checkpoints = ["궤도 중계기", "자료 기지", "귀환 항구"];
  const windows = [2, 4, 6];
  const patterns = ["집중 포격", "확산 미사일", "측면 기습", "교란 파동", "총공세"];
  const formations = ["전열", "산개", "엄호"];
  const damage = [[1, 3, 0], [3, 0, 1], [2, 1, 1], [2, 2, 0], [3, 2, 1]];
  const advance = [2, 1, 0];
  function start() {
    if (current === "supply") state = { phase: "playing", wave: 0, hp: [4, 4, 4], slots: [null, null], capacity: 2, pendingUpgrade: false, message: "두 보급선의 목적지를 정하세요." };
    if (current === "orbit") state = { phase: "playing", stage: 0, turn: 1, fuel: 8, hull: 3, engine: false, pendingUpgrade: false, message: "첫 궤도 창은 2턴에 열립니다. 대기와 우회 중 선택하세요." };
    if (current === "formation") state = { phase: "playing", round: 0, hp: 10, progress: 0, selected: null, thrust: false, pendingUpgrade: false, message: "첫 공격은 집중 포격입니다. 대형을 고르세요." };
    render();
  }
  function stat(label, value) { return `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`; }
  function button(label, action, extra = "", cls = "choice") { return `<button class="${cls}" type="button" data-action="${action}" ${extra}>${label}</button>`; }
  function supplyView() {
    const s = state;
    const forecast = waves[s.wave];
    const status = s.hp.map((hp, i) => `<div class="card"><h3>${bases[i]} 기지</h3><p>내구 <strong>${Math.max(0, hp)}</strong> / 4</p>${s.phase === "playing" ? `<p class="danger">예고 피해 ${forecast[i]}</p>` : ""}</div>`).join("");
    const slots = s.slots.map((picked, slot) => `<div class="slot"><span class="slot-label">보급선 ${slot + 1} · 방어막 ${s.capacity}</span><div class="choice-grid">${bases.map((base, i) => button(base, "supply-select", `data-slot="${slot}" data-base="${i}" aria-pressed="${picked === i}"`)).join("")}</div></div>`).join("");
    return `<div class="summary">${stat("공격 차례", `${s.phase === "won" || s.phase === "lost" ? s.wave : Math.min(s.wave + 1, 5)} / 5`)}${stat("살아 있는 기지", `${s.hp.filter(n => n > 0).length} / 3`)}${stat("보급선", "2척")}${stat("수송 방어막", s.capacity)}</div><div class="cards">${status}</div>${s.phase === "playing" ? `<h2 class="section-title">보급선 배정</h2><p class="help">각 보급선은 목적지 한 곳에 방어막을 보냅니다. 같은 기지에 두 척을 보낼 수 있습니다. 방어막은 이번 공격에만 적용됩니다.</p>${slots}<div class="actions">${button("보급선 출발 · 공격 처리", "supply-resolve", s.slots.some(x => x === null) ? "disabled" : "", "primary")}</div>` : s.phase === "upgrade" ? `<h2 class="section-title">방어 성공 보상</h2><p class="help">다음 공격 전 강화 하나를 선택하세요.</p><div class="choices">${button("수송 용량 강화 · 방어막 +1", "supply-upgrade", 'data-choice="capacity"')}${button("기지 긴급 수리 · 생존 기지 +1", "supply-upgrade", 'data-choice="repair"')}</div>` : s.phase === "between" ? `<div class="actions">${button("다음 공격 준비", "supply-next", "", "primary")}</div>` : outcomeView(s.phase === "won", "기지 방어 완료", "전초기지 방어 실패", `${s.wave}번의 공격 뒤 ${s.hp.filter(n => n > 0).length}곳이 살아남았습니다.`)}<p class="message${s.phase === "lost" ? " warn" : ""}" role="status">${s.message}</p>`;
  }
  function orbitView() {
    const s = state;
    const isOpen = s.turn === windows[s.stage];
    const currentTarget = checkpoints[Math.min(s.stage, 2)];
    return `<div class="summary">${stat("현재 턴", `${s.turn} / 7`)}${stat("남은 연료", s.fuel)}${stat("선체", s.hull)}${stat("도착 지점", `${s.stage} / 3`)}</div><div class="cards">${checkpoints.map((name, i) => `<div class="card"><h3>${i + 1}. ${name}</h3><p>궤도 창: ${windows[i]}턴</p><p class="${i < s.stage ? "good" : i === s.stage && isOpen ? "good" : ""}">${i < s.stage ? "도착 완료" : i === s.stage ? isOpen ? "지금 열림" : "대기 중" : "예정"}</p></div>`).join("")}</div>${s.phase === "playing" ? `<h2 class="section-title">다음 목표: ${currentTarget}</h2><p class="help">이번 턴의 궤도 창은 <strong>${isOpen ? "열려 있습니다" : "닫혀 있습니다"}</strong>. 대기는 연료 1, 열린 창 이동은 연료 1, 안전 우회는 연료 ${s.engine ? 2 : 3}, 고속 돌파는 연료 2와 닫힌 창에서 선체 2를 소모합니다.</p><div class="choices">${button("1턴 대기 · 연료 −1", "orbit-wait")}${button("열린 창 이동 · 연료 −1", "orbit-move", `data-mode="window" ${isOpen ? "" : "disabled"}`)}${button(`안전 우회 · 연료 −${s.engine ? 2 : 3}`, "orbit-move", 'data-mode="safe"')}${button("고속 돌파 · 연료 −2", "orbit-move", 'data-mode="rush"')}</div>` : s.phase === "upgrade" ? `<h2 class="section-title">중계기 보급 보상</h2><p class="help">다음 항로를 위해 개선 하나를 고르세요.</p><div class="choices">${button("엔진 개선 · 안전 우회 연료 −1", "orbit-upgrade", 'data-choice="engine"')}${button("선체 보강 · 내구 +2", "orbit-upgrade", 'data-choice="hull"')}</div>` : outcomeView(s.phase === "won", "항로 확보 완료", "귀환 항로 실패", `도착 지점 ${s.stage}/3 · 연료 ${s.fuel} · 선체 ${s.hull}`)}<p class="message${s.phase === "lost" ? " warn" : ""}" role="status">${s.message}</p>`;
  }
  function formationView() {
    const s = state;
    return `<div class="summary">${stat("라운드", `${s.phase === "won" || s.phase === "lost" ? s.round : Math.min(s.round + 1, 5)} / 5`)}${stat("함대 내구", s.hp)}${stat("전진 거리", `${s.progress} / 6`)}${stat("엔진 강화", s.thrust ? "적용" : "없음")}</div><div class="cards">${formations.map((name, i) => `<div class="card"><h3>${name}</h3><p>기본 전진 +${advance[i]}${s.thrust && i !== 2 ? " · 엔진 +1" : ""}</p>${s.phase === "playing" ? `<p>이번 예고 피해: ${damage[s.round][i]}</p>` : ""}</div>`).join("")}</div>${s.phase === "playing" ? `<h2 class="section-title">적 예고: ${patterns[s.round]}</h2><p class="help">이번 예고 피해는 위 선택지마다 다릅니다. 전열은 빠른 전진, 산개는 느린 전진, 엄호는 전진 없이 방어합니다. 피해와 전진량을 함께 비교하세요.</p><div class="choice-grid">${formations.map((name, i) => button(name, "formation-select", `data-formation="${i}" aria-pressed="${s.selected === i}"`)).join("")}</div><div class="actions">${button("대형 확정 · 포격 처리", "formation-resolve", s.selected === null ? "disabled" : "", "primary")}</div>` : s.phase === "upgrade" ? `<h2 class="section-title">2라운드 보상</h2><p class="help">남은 전투를 위한 강화 하나를 선택하세요.</p><div class="choices">${button("장갑 보강 · 내구 +3", "formation-upgrade", 'data-choice="armor"')}${button("엔진 개선 · 전열·산개 전진 +1", "formation-upgrade", 'data-choice="thrust"')}</div>` : s.phase === "between" ? `<div class="actions">${button("다음 포격 예고", "formation-next", "", "primary")}</div>` : outcomeView(s.phase === "won", "요새 돌파 성공", "함대 돌파 실패", `전진 ${s.progress}/6 · 함대 내구 ${s.hp}`)}<p class="message${s.phase === "lost" ? " warn" : ""}" role="status">${s.message}</p>`;
  }
  function outcomeView(win, winTitle, failTitle, detail) { return `<div class="outcome${win ? "" : " fail"}"><h2>${win ? winTitle : failTitle}</h2><p>${detail}</p><div class="actions">${button("같은 게임 다시 시작", "restart", "", "primary")}</div></div>`; }
  function render() {
    const info = config[current];
    const body = state ? current === "supply" ? supplyView() : current === "orbit" ? orbitView() : formationView() : `<div class="outcome"><h2>출발 준비</h2><p>${info.detail}</p><div class="actions">${button("게임 시작", "start", "", "primary")}</div></div>`;
    app.innerHTML = `<main class="shell"><div class="top"><span class="brand">SIMDA · DAILY GAMES</span><span class="date">2026.10.04 · 웹 프로토타입</span></div><nav class="tabs" aria-label="게임 선택">${Object.entries(config).map(([key, game]) => `<button type="button" class="tab" data-action="switch" data-game="${key}" ${key === current ? 'aria-current="page"' : ""}>${game.title}</button>`).join("")}</nav><section class="panel"><header class="hero"><p class="eyebrow">${info.type.toUpperCase()} · 검증용 빌드</p><h1>${info.title}</h1><p>${info.detail}</p></header><div class="content">${body}</div></section><p class="footer">오늘의 제작 검증용 빌드입니다. 모든 평가 항목 90점 통과 및 최종 출시 검수 전이며, 다른 게임의 설정을 사용하지 않았습니다.</p></main>`;
  }
  function resolveSupply() {
    if (state.phase !== "playing" || state.slots.some(x => x === null)) return;
    const attack = waves[state.wave];
    const shield = bases.map((_, i) => state.slots.filter(slot => slot === i).length * state.capacity);
    const losses = attack.map((value, i) => Math.max(0, value - shield[i]));
    state.hp = state.hp.map((hp, i) => Math.max(0, hp - losses[i]));
    state.message = `공격 ${state.wave + 1}: 방어막 ${shield.join("/")} · 기지 손상 ${losses.join("/")}.`;
    state.wave++;
    if (state.hp.filter(hp => hp > 0).length < 2) { state.phase = "lost"; state.message += " 살아남은 기지가 2곳 미만입니다."; }
    else if (state.wave === 5) { state.phase = "won"; state.message += " 5번의 공격을 버텼습니다."; }
    else if (state.wave === 2) state.phase = "upgrade";
    else state.phase = "between";
    state.slots = [null, null];
  }
  function orbitAction(action, mode) {
    if (state.phase !== "playing") return;
    const target = checkpoints[state.stage];
    if (action === "orbit-wait") { if (state.fuel === 0) { state.phase = "lost"; state.message = "연료가 없어 더 기다릴 수 없습니다."; return; } state.fuel--; state.turn++; state.message = `1턴 기다렸습니다. ${target}의 궤도 창은 ${windows[state.stage]}턴입니다.`; }
    else {
      const open = state.turn === windows[state.stage];
      if (mode === "window" && !open) return;
      const fuelCost = mode === "window" ? 1 : mode === "safe" ? state.engine ? 2 : 3 : 2;
      const hullCost = mode === "rush" && !open ? 2 : 0;
      if (fuelCost > state.fuel || hullCost >= state.hull) {
        state.fuel = Math.max(0, state.fuel - fuelCost);
        state.hull = Math.max(0, state.hull - hullCost);
        state.phase = "lost";
        state.message = `${target} 이동 실패. ${state.hull === 0 ? "선체가 파괴됐습니다." : "연료가 부족합니다."}`;
        return;
      }
      state.fuel -= fuelCost; state.hull -= hullCost; state.turn++; state.stage++;
      state.message = `${target} 도착. 연료 ${fuelCost} 소모${hullCost ? `, 선체 ${hullCost} 손상` : ""}.`;
    }
    if (state.fuel < 0 || state.hull <= 0) { state.phase = "lost"; state.message += state.fuel < 0 ? " 연료가 부족합니다." : " 선체가 파괴됐습니다."; }
    else if (state.stage === 3) { state.phase = "won"; state.message += " 자료를 싣고 귀환 항구까지 도착했습니다."; }
    else if (state.turn > 7) { state.phase = "lost"; state.message += " 7턴 제한을 넘겼습니다."; }
    else if (state.stage === 1 && action === "orbit-move") state.phase = "upgrade";
  }
  function resolveFormation() {
    if (state.phase !== "playing" || state.selected === null) return;
    const picked = state.selected;
    const harm = damage[state.round][picked];
    const moved = advance[picked] + (state.thrust && picked !== 2 ? 1 : 0);
    state.hp -= harm; state.progress += moved;
    state.message = `${patterns[state.round]}에 ${formations[picked]}로 대응: 피해 ${harm}, 전진 ${moved}.`;
    state.round++; state.selected = null;
    if (state.hp <= 0) { state.phase = "lost"; state.message += " 함대가 파괴됐습니다."; }
    else if (state.progress >= 6) { state.phase = "won"; state.message += " 요새에 도달했습니다."; }
    else if (state.round === 5) { state.phase = "lost"; state.message += " 5라운드 안에 전진 6을 달성하지 못했습니다."; }
    else if (state.round === 2) state.phase = "upgrade";
    else state.phase = "between";
  }
  app.addEventListener("click", event => {
    const target = event.target.closest("button[data-action]");
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    if (action === "switch") { current = target.dataset.game; history.replaceState(null, "", `?game=${current}`); state = null; render(); return; }
    if (action === "start" || action === "restart") { start(); return; }
    if (!state) return;
    if (action === "supply-select" && state.phase === "playing") state.slots[Number(target.dataset.slot)] = Number(target.dataset.base);
    else if (action === "supply-resolve") resolveSupply();
    else if (action === "supply-next" && state.phase === "between") state.phase = "playing";
    else if (action === "supply-upgrade" && state.phase === "upgrade") { if (target.dataset.choice === "capacity") state.capacity++; else state.hp = state.hp.map(hp => hp > 0 ? Math.min(4, hp + 1) : 0); state.phase = "between"; state.message = "강화를 적용했습니다. 다음 공격을 준비하세요."; }
    else if (action === "orbit-wait" || action === "orbit-move") orbitAction(action, target.dataset.mode);
    else if (action === "orbit-upgrade" && state.phase === "upgrade") { if (target.dataset.choice === "engine") state.engine = true; else state.hull += 2; state.phase = "playing"; state.message = "개선을 적용했습니다. 다음 항로를 선택하세요."; }
    else if (action === "formation-select" && state.phase === "playing") state.selected = Number(target.dataset.formation);
    else if (action === "formation-resolve") resolveFormation();
    else if (action === "formation-next" && state.phase === "between") state.phase = "playing";
    else if (action === "formation-upgrade" && state.phase === "upgrade") { if (target.dataset.choice === "thrust") state.thrust = true; else state.hp += 3; state.phase = "between"; state.message = "강화를 적용했습니다. 다음 포격에 대비하세요."; }
    render();
  });
  window.addEventListener("popstate", () => { const next = new URLSearchParams(location.search).get("game"); current = Object.hasOwn(config, next) ? next : "supply"; state = null; render(); });
  render();
})();
