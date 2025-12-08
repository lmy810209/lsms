document.addEventListener("DOMContentLoaded", () => {
  // 모바일 사이드바
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    const open = () => { sidebar.classList.add("sidebar-open"); overlay.classList.add("active"); };
    const close = () => { sidebar.classList.remove("sidebar-open"); overlay.classList.remove("active"); };
    menuBtn.addEventListener("click", () => sidebar.classList.contains("sidebar-open") ? close() : open());
    overlay.addEventListener("click", close);
  }

  initSchedulePage();
});

async function loadIndoorData() {
  const res = await fetch("../data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json load error");
  return await res.json();
}

async function initSchedulePage() {
  const data = await loadIndoorData();
  const state = {
    range: "week",
    type: "all",
    worker: "all"
  };

  // 필터 버튼 세팅
  document.querySelectorAll("[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      state.range = btn.getAttribute("data-range");
      renderTaskList(data, state);
    });
  });

  // 작업 유형 필터
  const typeFilter = document.getElementById("taskTypeFilter");
  const uniqueTypes = [...new Set(data.tasks.map(t => t.type))];
  typeFilter.innerHTML = `<button class="metric-badge-ok" data-type="all">전체</button>`;
  uniqueTypes.forEach(type => {
    const b = document.createElement("button");
    b.className = "metric-badge-ok";
    b.dataset.type = type;
    b.textContent = type;
    typeFilter.appendChild(b);
  });
  typeFilter.addEventListener("click", e => {
    const t = e.target.closest("button[data-type]");
    if (!t) return;
    state.type = t.dataset.type;
    renderTaskList(data, state);
  });

  // 작업자 필터
  const workerFilter = document.getElementById("workerFilter");
  workerFilter.innerHTML = `<button class="metric-badge-ok" data-worker="all">전체</button>`;
  data.workers.forEach(w => {
    const b = document.createElement("button");
    b.className = "metric-badge-ok";
    b.dataset.worker = w.name;
    b.textContent = w.name;
    workerFilter.appendChild(b);
  });
  workerFilter.addEventListener("click", e => {
    const t = e.target.closest("button[data-worker]");
    if (!t) return;
    state.worker = t.dataset.worker;
    renderTaskList(data, state);
  });

  renderTaskList(data, state);
}

function renderTaskList(data, state) {
  const listEl = document.getElementById("taskList");
  const summaryEl = document.getElementById("taskListSummary");
  const detailTitle = document.getElementById("taskDetailTitle");
  const detailSub = document.getElementById("taskDetailSub");
  const detailBody = document.getElementById("taskDetailBody");

  const today = "2025-12-08"; // 샘플 기준
  const oneWeekAgo = "2025-12-01";

  let tasks = [...data.tasks];

  // 기간 필터
  if (state.range === "today") {
    tasks = tasks.filter(t => t.date === today);
  } else if (state.range === "week") {
    tasks = tasks.filter(t => t.date >= oneWeekAgo && t.date <= today);
  }

  // 유형 필터
  if (state.type !== "all") {
    tasks = tasks.filter(t => t.type === state.type);
  }

  // 작업자 필터
  if (state.worker !== "all") {
    tasks = tasks.filter(t => t.worker === state.worker);
  }

  // 날짜, 상태 정렬
  tasks.sort((a, b) => (a.date < b.date ? 1 : -1));

  listEl.innerHTML = "";
  summaryEl.textContent = `필터 결과: ${tasks.length}건의 작업이 있습니다.`;

  if (tasks.length === 0) {
    listEl.innerHTML = `<div class="forecast-row"><div class="forecast-meta">조건에 맞는 작업이 없습니다.</div></div>`;
    detailTitle.textContent = "작업 상세";
    detailSub.textContent = "왼쪽 목록에서 작업을 클릭하면 상세 정보가 표시됩니다.";
    detailBody.textContent = "· 작업 유형\n· 대상 플랜터/구역\n· 담당자\n· 예정일/완료일\n· 상태(완료/미완료)";
    return;
  }

  const planterMap = Object.fromEntries(data.planters.map(p => [p.id, p]));
  const zoneMap = Object.fromEntries(data.zones.map(z => [z.id, z]));

  tasks.forEach(t => {
    const row = document.createElement("div");
    row.className = "forecast-row";

    const planter = planterMap[t.planter];
    const zone = planter ? zoneMap[planter.zone] : null;
    const zoneLabel = zone ? `${zone.floor}F ${zone.name}` : "구역 정보 없음";

    row.innerHTML = `
      <div class="forecast-day">${t.date}</div>
      <div class="forecast-meta">${t.type} · ${zoneLabel}</div>
      <div class="forecast-temp">${t.worker} · ${t.status === "completed" ? "완료" : "미완료"}</div>
    `;

    row.addEventListener("click", () => {
      detailTitle.textContent = `${t.type} 작업 상세`;
      detailSub.textContent = `${t.date} · ${t.worker}`;
      const statusText = t.status === "completed" ? "완료" : "미완료";

      detailBody.innerHTML =
        `· 작업 유형: ${t.type}<br>` +
        `· 대상 플랜터: ${planter ? planter.name : t.planter}<br>` +
        `· 구역: ${zoneLabel}<br>` +
        `· 담당자: ${t.worker}<br>` +
        `· 예정일: ${t.date}<br>` +
        `· 상태: ${statusText}`;
    });

    listEl.appendChild(row);
  });
}
