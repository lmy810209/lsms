document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    const open = () => { sidebar.classList.add("sidebar-open"); overlay.classList.add("active"); };
    const close = () => { sidebar.classList.remove("sidebar-open"); overlay.classList.remove("active"); };
    menuBtn.addEventListener("click", () => sidebar.classList.contains("sidebar-open") ? close() : open());
    overlay.addEventListener("click", close);
  }

  initPlantsPage();
});

async function loadIndoorData() {
  const res = await fetch("../data/indoor-data.json");// plants.js – 실내 식물 관리 화면

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

  // 상태 값
  const state = {
    building: "all",
    floor: "all",
    zone: "all",
  };

  // 맵 생성
  const buildingMap = Object.fromEntries(
    data.buildings.map(b => [b.id, b])
  );
  const zoneMap = Object.fromEntries(
    data.zones.map(z => [z.id, z])
  );

  // 플랜터에 위치 정보 붙이기
  const planterWithMeta = data.planters.map(p => {
    const zone = zoneMap[p.zone];
    const b = zone ? buildingMap[zone.building] : null;
    return {
      ...p,
      zoneName: zone ? zone.name : "",
      floor: zone ? zone.floor : "",
      buildingId: zone ? zone.building : "",
      buildingName: b ? b.name : ""
    };
  });

  // 플랜터별 식물 정보 묶기
  const plantsByPlanter = {};
  data.plants.forEach(pl => {
    if (!plantsByPlanter[pl.planter]) plantsByPlanter[pl.planter] = [];
    plantsByPlanter[pl.planter].push(pl);
  });

  // 필터 버튼 세팅
  setupBuildingFilter(data, state, buildingMap, planterWithMeta);
  setupFloorFilter(data, state, planterWithMeta);
  setupZoneFilter(data, state, planterWithMeta);

  // 첫 렌더
  renderPlantsView({
    data,
    state,
    planterWithMeta,
    plantsByPlanter,
    buildingMap,
    zoneMap
  });
}

// 건물 필터
function setupBuildingFilter(data, state, buildingMap, planterWithMeta) {
  const container = document.getElementById("buildingFilter");
  if (!container) return;

  container.innerHTML = "";
  const allBtn = createFilterButton("전체", state.building === "all");
  allBtn.dataset.building = "all";
  container.appendChild(allBtn);

  data.buildings.forEach(b => {
    // 실제 플랜터가 있는 건물만
    const hasPlanter = planterWithMeta.some(p => p.buildingId === b.id);
    if (!hasPlanter) return;
    const btn = createFilterButton(b.name, state.building === b.id);
    btn.dataset.building = b.id;
    container.appendChild(btn);
  });

  container.addEventListener("click", e => {
    const btn = e.target.closest("button[data-building]");
    if (!btn) return;
    state.building = btn.dataset.building;
    state.floor = "all";
    state.zone = "all";
    // 버튼 active 처리
    [...container.querySelectorAll("button")].forEach(b =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");
    // 층/존 필터 다시 세팅
    setupFloorFilter(data, state, planterWithMeta);
    setupZoneFilter(data, state, planterWithMeta);
    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter: groupPlantsByPlanter(data),
      buildingMap,
      zoneMap: Object.fromEntries(data.zones.map(z => [z.id, z]))
    });
  });
}

// 층 필터
function setupFloorFilter(data, state, planterWithMeta) {
  const container = document.getElementById("floorFilter");
  if (!container) return;

  container.innerHTML = "";
  const targetPlanters = planterWithMeta.filter(p =>
    state.building === "all" ? true : p.buildingId === state.building
  );
  const floors = [...new Set(targetPlanters.map(p => p.floor))].sort((a, b) => a - b);

  const allBtn = createFilterButton("전체", state.floor === "all");
  allBtn.dataset.floor = "all";
  container.appendChild(allBtn);

  floors.forEach(f => {
    const label = f ? `${f}F` : "-";
    const btn = createFilterButton(label, state.floor === String(f));
    btn.dataset.floor = String(f);
    container.appendChild(btn);
  });

  container.onclick = e => {
    const btn = e.target.closest("button[data-floor]");
    if (!btn) return;
    state.floor = btn.dataset.floor;
    state.zone = "all";
    [...container.querySelectorAll("button")].forEach(b =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");
    setupZoneFilter(data, state, planterWithMeta);
    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter: groupPlantsByPlanter(data),
      buildingMap: Object.fromEntries(data.buildings.map(b => [b.id, b])),
      zoneMap: Object.fromEntries(data.zones.map(z => [z.id, z]))
    });
  };
}

// 존 필터
function setupZoneFilter(data, state, planterWithMeta) {
  const container = document.getElementById("zoneFilter");
  if (!container) return;

  container.innerHTML = "";

  const filteredPlanters = planterWithMeta.filter(p => {
    if (state.building !== "all" && p.buildingId !== state.building) return false;
    if (state.floor !== "all" && String(p.floor) !== state.floor) return false;
    return true;
  });

  const zones = [...new Set(filteredPlanters.map(p => p.zoneName))];

  const allBtn = createFilterButton("전체", state.zone === "all");
  allBtn.dataset.zone = "all";
  container.appendChild(allBtn);

  zones.forEach(zName => {
    const btn = createFilterButton(zName, state.zone === zName);
    btn.dataset.zone = zName;
    container.appendChild(btn);
  });

  container.onclick = e => {
    const btn = e.target.closest("button[data-zone]");
    if (!btn) return;
    state.zone = btn.dataset.zone;
    [...container.querySelectorAll("button")].forEach(b =>
      b.classList.remove("metric-badge-selected")
    );
    btn.classList.add("metric-badge-selected");
    renderPlantsView({
      data,
      state,
      planterWithMeta,
      plantsByPlanter: groupPlantsByPlanter(data),
      buildingMap: Object.fromEntries(data.buildings.map(b => [b.id, b])),
      zoneMap: Object.fromEntries(data.zones.map(z => [z.id, z]))
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
  data.plants.forEach(pl => {
    if (!map[pl.planter]) map[pl.planter] = [];
    map[pl.planter].push(pl);
  });
  return map;
}

// 메인 렌더
function renderPlantsView(ctx) {
  const {
    data,
    state,
    planterWithMeta,
    plantsByPlanter,
    buildingMap,
    zoneMap
  } = ctx;

  const planterListEl = document.getElementById("planterList");
  const planterListSummaryEl = document.getElementById("planterListSummary");
  const speciesListEl = document.getElementById("speciesList");
  const speciesSummaryEl = document.getElementById("speciesSummary");
  const detailTitle = document.getElementById("planterDetailTitle");
  const detailSub = document.getElementById("planterDetailSub");
  const detailBody = document.getElementById("planterDetailBody");

  if (!planterListEl) return;

  // 필터 적용
  let list = planterWithMeta.filter(p => {
    if (state.building !== "all" && p.buildingId !== state.building) return false;
    if (state.floor !== "all" && String(p.floor) !== state.floor) return false;
    if (state.zone !== "all" && p.zoneName !== state.zone) return false;
    return true;
  });

  // 정렬: 건물 > 층 > 존 > 플랜터명
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

  // 종 요약용 집계
  const speciesAgg = {};

  list.forEach(p => {
    const plants = plantsByPlanter[p.id] || [];
    const totalCount = plants.reduce((sum, pl) => sum + (pl.count || 0), 0);
    const speciesNames = [...new Set(plants.map(pl => pl.species))];
    const warnHealth = plants.some(pl => pl.health && pl.health !== "good");

    // 종 집계
    plants.forEach(pl => {
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

  // 종 요약 리스트
  speciesListEl.innerHTML = "";
  const speciesEntries = Object.entries(speciesAgg).sort((a, b) =>
    b[1].count - a[1].count
  );

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

  // 기본 상세 = 첫 번째 플랜터
  const first = list[0];
  const firstPlants = plantsByPlanter[first.id] || [];
  renderPlanterDetail(first, firstPlants);
}

function renderPlanterDetail(planter, plants) {
  const titleEl = document.getElementById("planterDetailTitle");
  const subEl = document.getElementById("planterDetailSub");
  const bodyEl = document.getElementById("planterDetailBody");

  const speciesLines = plants.map(pl => {
    const healthLabel =
      pl.health === "good" ? "양호" :
      pl.health === "warn" ? "주의" :
      pl.health === "bad" ? "불량" :
      (pl.health || "-");
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

  if (!res.ok) throw new Error("indoor-data.json load error");
  return await res.json();
}

async function initPlantsPage() {
  const data = await loadIndoorData();

  const planterMap = Object.fromEntries(data.planters.map(p => [p.id, p]));
  const zoneMap = Object.fromEntries(data.zones.map(z => [z.id, z]));
  const buildingLabel = id =>
    id === "west" ? "서관" : id === "east" ? "동관" : "아트리움";

  // 구역별 집계
  const zoneStats = {};
  data.plants.forEach(p => {
    const planter = planterMap[p.planter];
    if (!planter) return;
    const zone = zoneMap[planter.zone];
    if (!zone) return;

    if (!zoneStats[zone.id]) {
      zoneStats[zone.id] = {
        zone,
        planters: new Set(),
        plantCount: 0
      };
    }
    zoneStats[zone.id].planters.add(planter.id);
    zoneStats[zone.id].plantCount += (p.count || 0);
  });

  const listEl = document.getElementById("plantZoneList");
  const summaryEl = document.getElementById("plantSummary");
  const detailTitle = document.getElementById("plantDetailTitle");
  const detailSub = document.getElementById("plantDetailSub");
  const detailBody = document.getElementById("plantDetailBody");

  const totalPlants = data.plants.reduce((s, p) => s + (p.count || 0), 0);
  summaryEl.textContent = `전체 식물 ${totalPlants}개체 · 관리 구역 ${Object.keys(zoneStats).length}곳`;

  listEl.innerHTML = "";

  Object.values(zoneStats)
    .sort((a, b) => a.zone.floor - b.zone.floor)
    .forEach(zs => {
      const z = zs.zone;
      const row = document.createElement("div");
      row.className = "forecast-row";
      row.innerHTML = `
        <div class="forecast-day">${buildingLabel(z.building)} ${z.floor}F</div>
        <div class="forecast-meta">${z.name} · 플랜터 ${zs.planters.size}개</div>
        <div class="forecast-temp">식물 ${zs.plantCount}개체</div>
      `;

      row.addEventListener("click", () => {
        detailTitle.textContent = `${buildingLabel(z.building)} ${z.floor}F · ${z.name}`;
        detailSub.textContent = `플랜터 ${zs.planters.size}개 · 식물 ${zs.plantCount}개체`;

        const plantersInZone = data.planters.filter(p => p.zone === z.id);
        let html = "";

        plantersInZone.forEach(pl => {
          const plantsInPlanter = data.plants.filter(p => p.planter === pl.id);
          const total = plantsInPlanter.reduce((s, p) => s + (p.count || 0), 0);
          html += `<strong>${pl.name}</strong> (${total}개체)<br>`;
          plantsInPlanter.forEach(p => {
            const healthLabel =
              p.health === "good" ? "양호" :
              p.health === "warn" ? "주의" : "불량";
            html += `- ${p.species} ${p.count}개체 (${healthLabel})<br>`;
          });
          html += `<br>`;
        });

        detailBody.innerHTML = html || "등록된 플랜터/식물이 없습니다.";
      });

      listEl.appendChild(row);
    });
}
