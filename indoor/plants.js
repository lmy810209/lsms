// plants.js – 실내 식물 관리 화면

document.addEventListener("DOMContentLoaded", () => {
  // 모바일 사이드바 토글
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    const open = () => {
      sidebar.classList.add("sidebar-open");
      overlay.classList.add("active");
    };
    const close = () => {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
    };
    menuBtn.addEventListener("click", () => {
      sidebar.classList.contains("sidebar-open") ? close() : open();
    });
    overlay.addEventListener("click", close);
  }

  initPlantsPage();
});

async function loadIndoorData() {
  const res = await fetch("../data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json load error");
  return await res.json();
}

async function initPlantsPage() {
  const data = await loadIndoorData();

  const state = {
    building: "all",
    floor: "all",
    zone: "all",
  };

  const buildingMap = Object.fromEntries(
    data.buildings.map((b) => [b.id, b])
  );
  const zoneMap = Object.fromEntries(
    data.zones.map((z) => [z.id, z])
  );

  const planterWithMeta = data.planters.map((p) => {
    const zone = zoneMap[p.zone];
    const b = zone ? buildingMap[zone.building] : null;
    return {
      ...p,
      zoneName: zone ? zone.name : "",
      floor: zone ? zone.floor : "",
      buildingId: zone ? zone.building : "",
      buildingName: b ? b.name : "",
    };
  });

  const plantsByPlanter = groupPlantsByPlanter(data);

  setupBuildingFilter(data, state, buildingMap, planterWithMeta, plantsByPlanter, zoneMap);
  setupFloorFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap);
  setupZoneFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap);

  renderPlantsView({
    data,
    state,
    planterWithMeta,
    plantsByPlanter,
    buildingMap,
    zoneMap,
  });
}

function setupBuildingFilter(data, state, buildingMap, planterWithMeta, plantsByPlanter, zoneMap) {
  const container = document.getElementById("buildingFilter");
  if (!container) return;

  container.innerHTML = "";

  const allBtn = createFilterButton("전체", state.building === "all");
  allBtn.dataset.building = "all";
  container.appendChild(allBtn);

  data.buildings.forEach((b) => {
    const hasPlanter = planterWithMeta.some((p) => p.buildingId === b.id);
    if (!hasPlanter) return;
    const btn = createFilterButton(b.name, state.building === b.id);
    btn.dataset.building = b.id;
    container.appendChild(btn);
  });

  container.onclick = (e) => {
    const btn = e.target.closest("button[data-building]");
    if (!btn) return;
    state.building = btn.dataset.building;
    state.floor = "all";
    state.zone = "all";

    [...container.querySelectorAll("button")].forEach((b) =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");

    setupFloorFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap);
    setupZoneFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap);
    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter,
      buildingMap,
      zoneMap,
    });
  };
}

function setupFloorFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap) {
  const container = document.getElementById("floorFilter");
  if (!container) return;

  container.innerHTML = "";

  const targetPlanters = planterWithMeta.filter((p) =>
    state.building === "all" ? true : p.buildingId === state.building
  );
  const floors = [...new Set(targetPlanters.map((p) => p.floor))].sort((a, b) => a - b);

  const allBtn = createFilterButton("전체", state.floor === "all");
  allBtn.dataset.floor = "all";
  container.appendChild(allBtn);

  floors.forEach((f) => {
    const label = f ? `${f}F` : "-";
    const btn = createFilterButton(label, state.floor === String(f));
    btn.dataset.floor = String(f);
    container.appendChild(btn);
  });

  container.onclick = (e) => {
    const btn = e.target.closest("button[data-floor]");
    if (!btn) return;
    state.floor = btn.dataset.floor;
    state.zone = "all";

    [...container.querySelectorAll("button")].forEach((b) =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");

    setupZoneFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap);
    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter,
      buildingMap,
      zoneMap,
    });
  };
}

function setupZoneFilter(data, state, planterWithMeta, plantsByPlanter, buildingMap, zoneMap) {
  const container = document.getElementById("zoneFilter");
  if (!container) return;

  container.innerHTML = "";

  const filteredPlanters = planterWithMeta.filter((p) => {
    if (state.building !== "all" && p.buildingId !== state.building) return false;
    if (state.floor !== "all" && String(p.floor) !== state.floor) return false;
    return true;
  });

  const zones = [...new Set(filteredPlanters.map((p) => p.zoneName))];

  const allBtn = createFilterButton("전체", state.zone === "all");
  allBtn.dataset.zone = "all";
  container.appendChild(allBtn);

  zones.forEach((zName) => {
    const btn = createFilterButton(zName, state.zone === zName);
    btn.dataset.zone = zName;
    container.appendChild(btn);
  });

  container.onclick = (e) => {
    const btn = e.target.closest("button[data-zone]");
    if (!btn) return;
    state.zone = btn.dataset.zone;

    [...container.querySelectorAll("button")].forEach((b) =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");

    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter,
      buildingMap,
      zoneMap,
    });
  };
}

function createFilterButton(label, selected) {
  const btn = document.createElement("button");
  btn.className = "metric-badge-ok";
  if (selected) btn.classList.add("metric-badge-selected");
  btn.textContent = label;
  return btn;
}

function groupPlantsByPlanter(data) {
  const map = {};
  data.plants.forEach((pl) => {
    if (!map[pl.planter]) map[pl.planter] = [];
    map[pl.planter].push(pl);
  });
  return map;
}

function renderPlantsView(ctx) {
  const {
    data,
    state,
    planterWithMeta,
    plantsByPlanter,
    buildingMap,
    zoneMap,
  } = ctx;

  const planterListEl = document.getElementById("planterList");
  const planterListSummaryEl = document.getElementById("planterListSummary");
  const speciesListEl = document.getElementById("speciesList");
  const speciesSummaryEl = document.getElementById("speciesSummary");
  const detailTitle = document.getElementById("planterDetailTitle");
  const detailSub = document.getElementById("planterDetailSub");
  const detailBody = document.getElementById("planterDetailBody");

  if (!planterListEl) return;

  let list = planterWithMeta.filter((p) => {
    if (state.building !== "all" && p.buildingId !== state.building) return false;
    if (state.floor !== "all" && String(p.floor) !== state.floor) return false;
    if (state.zone !== "all" && p.zoneName !== state.zone) return false;
    return true;
  });

  list.sort((a, b) => {
    if (a.buildingName !== b.buildingName) return a.buildingName.localeCompare(b.buildingName);
    if (a.floor !== b.floor) return a.floor - b.floor;
    if (a.zoneName !== b.zoneName) return a.zoneName.localeCompare(b.zoneName);
    return a.name.localeCompare(b.name);
  });

  planterListEl.innerHTML = "";

  if (list.length === 0) {
    planterListSummaryEl.textContent = "해당 조건에 맞는 플랜터가 없습니다.";
    planterListEl.innerHTML = `
      <div class="forecast-row">
        <div class="forecast-meta">조건을 변경해서 다시 조회해 주세요.</div>
      </div>`;
    detailTitle.textContent = "플랜터 상세";
    detailSub.textContent = "왼쪽 목록에서 플랜터를 클릭하면 상세 정보가 표시됩니다.";
    detailBody.innerHTML =
      "· 위치(건물/층/구역)<br>· 식재 종/개체수<br>· 건강도 상태<br>· 최근 작업/급수 이력(추가 예정)";
    speciesListEl.innerHTML = "";
    speciesSummaryEl.textContent = "현재 필터 조건에 해당하는 식물이 없습니다.";
    return;
  }

  planterListSummaryEl.textContent = `필터 결과: ${list.length}개 플랜터가 있습니다.`;

  const speciesAgg = {};
  list.forEach((p) => {
    const plants = plantsByPlanter[p.id] || [];
    const totalCount = plants.reduce((sum, pl) => sum + (pl.count || 0), 0);
    const speciesNames = [...new Set(plants.map((pl) => pl.species))];
    const warnHealth = plants.some((pl) => pl.health && pl.health !== "good");

    plants.forEach((pl) => {
      if (!speciesAgg[pl.species]) {
        speciesAgg[pl.species] = { count: 0 };
      }
      speciesAgg[pl.species].count += pl.count || 0;
    });

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <div class="forecast-day">${p.name}</div>
      <div class="forecast-meta">
        ${p.buildingName} · ${p.floor ? p.floor + "F" : ""} · ${p.zoneName}
      </div>
      <div class="forecast-temp">
        ${speciesNames.length}종 / ${totalCount}주
        ${warnHealth ? " · 상태: 주의" : ""}
      </div>
    `;

    row.addEventListener("click", () => {
      renderPlanterDetail(p, plants);
    });

    planterListEl.appendChild(row);
  });

  speciesListEl.innerHTML = "";
  const speciesEntries = Object.entries(speciesAgg).sort((a, b) => b[1].count - a[1].count);

  speciesSummaryEl.textContent = `현재 조건에 해당하는 식물 종: ${speciesEntries.length}종, 총 ${speciesEntries.reduce(
    (s, [, v]) => s + v.count,
    0
  )}주`;

  speciesEntries.forEach(([name, info]) => {
    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <div class="forecast-day">${name}</div>
      <div class="forecast-meta">총 개체 수</div>
      <div class="forecast-temp">${info.count}주</div>
    `;
    speciesListEl.appendChild(row);
  });

  const first = list[0];
  const firstPlants = plantsByPlanter[first.id] || [];
  renderPlanterDetail(first, firstPlants);
}

function renderPlanterDetail(planter, plants) {
  const titleEl = document.getElementById("planterDetailTitle");
  const subEl = document.getElementById("planterDetailSub");
  const bodyEl = document.getElementById("planterDetailBody");

  const speciesLines = plants.map((pl) => {
    const healthLabel =
      pl.health === "good"
        ? "양호"
        : pl.health === "warn"
        ? "주의"
        : pl.health === "bad"
        ? "불량"
        : pl.health || "-";
    return `· ${pl.species} ${pl.count || 0}주 (상태: ${healthLabel})`;
  });

  const total = plants.reduce((s, pl) => s + (pl.count || 0), 0);

  titleEl.textContent = planter.name;
  subEl.textContent = `${planter.buildingName} · ${planter.floor ? planter.floor + "F" : ""} · ${planter.zoneName}`;
  bodyEl.innerHTML =
    `위치<br>` +
    `- 건물: ${planter.buildingName}<br>` +
    `- 층: ${planter.floor ? planter.floor + "F" : "-"}<br>` +
    `- 구역: ${planter.zoneName}<br><br>` +
    `식재 현황<br>` +
    `${speciesLines.length ? speciesLines.join("<br>") : "· 등록된 식물 정보 없음"}<br><br>` +
    `총 ${total}주 식재 (데모 데이터 기준)<br><br>` +
    `※ 추후 이력 연동<br>` +
    `- 최근 급수 및 방제 이력<br>` +
    `- 사진 전/후 기록과 연결 예정`;
}
