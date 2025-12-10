// ===== 수목 데이터 및 리스트 관리 =====
//
// ※ 권한 정보는 app.js의 CURRENT_USER_ROLE 사용
//    const CURRENT_USER_ROLE = 'admin' | 'worker' | 'guest'
//
// ※ 실제 데이터 상태는 js/outdoor-state.js 의 LSMS.outdoor 모듈이 관리

// ----- LSMS.outdoor 상태 모듈 연동 -----
const LSMS_OUTDOOR = (window.LSMS && window.LSMS.outdoor) || null;

/**
 * 현재 수목 배열을 가져온다.
 * - LSMS.outdoor.getTrees()를 우선 사용
 * - window.treeData 도 항상 동기화
 */
function getTreeData() {
  if (LSMS_OUTDOOR && typeof LSMS_OUTDOOR.getTrees === "function") {
    const trees = LSMS_OUTDOOR.getTrees();
    window.treeData = trees;
    return trees;
  }
  return window.treeData || [];
}

/**
 * 수목 배열을 교체한다.
 * - LSMS.outdoor.setTrees(newTrees) 호출
 * - window.treeData 동기화
 * - renderTrees()로 리스트/지도/차트 전체 갱신
 */
function setTreeData(newTrees) {
  let applied = Array.isArray(newTrees) ? newTrees : [];

  if (LSMS_OUTDOOR && typeof LSMS_OUTDOOR.setTrees === "function") {
    LSMS_OUTDOOR.setTrees(applied);
    applied = LSMS_OUTDOOR.getTrees();
  }

  window.treeData = applied;
  renderTrees();
}

// 공통 색상 함수 (지도 + 리스트에서 같이 사용)
function getSpeciesColor(species) {
  if (!species) return "#6b7280";
  if (species.includes("소나무")) return "#22c55e"; // 초록
  if (species.includes("벚나무")) return "#38bdf8"; // 하늘
  if (species.includes("회양목")) return "#eab308"; // 노랑
  return "#6b7280";
}

function getRiskRingColor(tree) {
  if (tree.risk_level === "HIGH") return "#ef4444";
  // 과거 'MOD' 표기와 새 'MID' 표기 모두 중간 위험으로 취급
  if (tree.risk_level === "MOD" || tree.risk_level === "MID") return "#eab308";
  return "#22c55e";
}

// DOM 참조
let treeListBody = null;
let treeCountEl = null;
let searchInput = null;
let addHint = null;

// 추가 모드 플래그
let addMode = false;

// 현재 상세 패널에서 보고/수정 중인 수목 index
let currentTreeIndex = null;

// ===== 리스트 초기화 =====
function treesInit() {
  treeListBody = document.getElementById("treeListBody");
  treeCountEl = document.getElementById("treeCount");
  searchInput = document.getElementById("treeSearchInput");
  addHint = document.getElementById("addModeHint");

  // 검색
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      updateTreeList(e.target.value);
    });
  }

  const btnClear = document.getElementById("btnTreeClear");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      updateTreeList("");
    });
  }

  // 수목 추가 버튼
  const btnAdd = document.getElementById("btnTreeAdd");
  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      ) {
        alert("수목 추가는 관리자만 가능합니다.");
        return;
      }
      setAddMode(!addMode);
    });
  }

  // 서버 저장 버튼
  const btnSave = document.getElementById("btnTreeSave");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      ) {
        alert("저장은 관리자만 가능합니다.");
        return;
      }
      saveTreesToServer();
    });
  }

  // 상세 패널 버튼들
  const btnDetailEdit = document.getElementById("btnTreeEdit");
  const btnDetailSave = document.getElementById("btnTreeSaveDetail");
  const btnDetailCancel = document.getElementById("btnTreeCancel");

  if (btnDetailEdit && btnDetailSave && btnDetailCancel) {
    // 처음엔 읽기 전용 모드
    setTreeFormEditable(false);

    btnDetailEdit.addEventListener("click", () => {
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      ) {
        alert("수정 권한이 없습니다.");
        return;
      }
      if (currentTreeIndex == null) return;

      const data = getTreeData();
      if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;
      openTreeDetailPanel(data[currentTreeIndex], "edit");
    });

    btnDetailSave.addEventListener("click", () => {
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      )
        return;
      if (currentTreeIndex == null) return;

      const data = getTreeData();
      if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;

      const t = data[currentTreeIndex];

      const speciesEl = document.getElementById("treeSpecies");
      const zoneEl = document.getElementById("treeZone");
      const typeEl = document.getElementById("treeType");
      const statusSel = document.getElementById("treeStatusSelect");
      const heightEl = document.getElementById("treeHeight");
      const dbhEl = document.getElementById("treeDbh");
      const crownEl = document.getElementById("treeCrown");
      const slopeEl = document.getElementById("treeSlope");
      const tiltEl = document.getElementById("treeTilt");
      const soilEl = document.getElementById("treeSoilStability");
      const rootIssueEl = document.getElementById("treeRootIssue");
      const memoEl = document.getElementById("treeMemo");

      t.species = speciesEl.value;
      t.zone = zoneEl.value;
      t.type = typeEl.value;
      t.status = statusSel.value;
      t.height = heightEl.value ? Number(heightEl.value) : null;
      t.dbh = dbhEl.value ? Number(dbhEl.value) : null;
      t.crown = crownEl.value ? Number(crownEl.value) : null;
      t.slope = slopeEl.value ? Number(slopeEl.value) : null;
      t.tilt = tiltEl.value ? Number(tiltEl.value) : null;
      t.soil_stability = soilEl.value || "";
      t.root_issue = rootIssueEl.value || "없음";

      if (!t.history) t.history = {};
      t.history.memo = memoEl.value;

      t.updated_at = new Date().toISOString().slice(0, 10);

      // 수정된 데이터로 전체 갱신
      setTreeData(data);
      openTreeDetailPanel(t, "view");
    });

    btnDetailCancel.addEventListener("click", () => {
      if (currentTreeIndex == null) return;
      const data = getTreeData();
      if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;
      openTreeDetailPanel(data[currentTreeIndex], "view");
    });
  }

  updateTreeList("");
}

// 추가 모드 온/오프
function setAddMode(on) {
  addMode = on;
  if (addHint) {
    addHint.textContent = on
      ? "추가 모드: 지도에서 위치를 클릭하면 새 수목을 등록합니다."
      : "";
  }
}

// 리스트 렌더링
function updateTreeList(filterText = "") {
  if (!treeListBody || !treeCountEl) return;

  const all = getTreeData();
  const keyword = filterText.trim().toLowerCase();

  const filtered = all.filter((t) => {
    if (!keyword) return true;
    return (
      (t.id || "").toLowerCase().includes(keyword) ||
      (t.species || "").toLowerCase().includes(keyword) ||
      (t.zone || "").toLowerCase().includes(keyword)
    );
  });

  treeCountEl.textContent = all.length.toString();
  treeListBody.innerHTML = "";

  filtered.forEach((tree) => {
    const fullIndex = all.findIndex((t) => t.id === tree.id);

    const row = document.createElement("div");
    row.className = "tree-row";
    row.dataset.treeId = tree.id;

    const badge = document.createElement("div");
    badge.className = "tree-row-badge";
    badge.style.background = getSpeciesColor(tree.species || "");
    badge.textContent = String(fullIndex + 1);

    const main = document.createElement("div");
    main.className = "tree-row-main";
    main.innerHTML = `
      <div class="tree-row-id">${tree.id} · ${tree.species}</div>
      <div class="tree-row-sub">${tree.zone || "-"} · ${
        tree.type || "-"
      }</div>
    `;

    const chips = document.createElement("div");
    const chip = document.createElement("span");
    chip.className = "tree-row-chip";
    chip.textContent = `위험 ${tree.risk_level || "-"}`;
    chips.appendChild(chip);

    const del = document.createElement("div");
    del.className = "tree-row-delete";
    del.textContent = "×";

    // 삭제 버튼 (관리자만)
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      ) {
        alert("삭제는 관리자만 가능합니다.");
        return;
      }
      if (!confirm(`${tree.id} 삭제할까요?`)) return;

      const before = getTreeData();
      const next = before.filter((t) => t.id !== tree.id);
      currentTreeIndex = null;
      setTreeData(next);
    });

    row.appendChild(badge);
    row.appendChild(main);
    row.appendChild(chips);
    row.appendChild(del);

    // 행 클릭 → 지도 포커스 + 상세 패널 보기 모드
    row.addEventListener("click", () => {
      if (fullIndex === -1) return;

      const data = getTreeData();
      if (fullIndex < 0 || fullIndex >= data.length) return;

      currentTreeIndex = fullIndex;

      if (typeof focusTree === "function") {
        focusTree(tree.id);
      }
      openTreeDetailPanel(data[fullIndex], "view");
    });

    treeListBody.appendChild(row);
  });
}

// ===== 지도에서 클릭했을 때 새 수목 추가 =====
// map.js에서 addMode === true일 때 addTree(lat, lng) 호출하는 구조라고 가정
function addTree(lat, lng) {
  // 관리자만 가능
  if (
    typeof CURRENT_USER_ROLE !== "undefined" &&
    CURRENT_USER_ROLE !== "admin"
  ) {
    alert("수목 등록은 관리자만 가능합니다.");
    setAddMode(false);
    return;
  }

  // ID만 받고, 나머지는 상세 패널에서 입력
  const id = prompt("새 수목 ID (예: YA-010)", "");
  if (!id) {
    setAddMode(false);
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const base = getTreeData();

  const newTree = {
    id,
    species: "",
    type: "교목",
    status: "양호",
    zone: "",
    lat,
    lng,
    height: null,
    dbh: null,
    crown: null,
    planted_year: null,
    slope: null,
    tilt: null,
    soil_stability: "",
    root_issue: "없음",
    root_lift: false,
    drainage: "",
    trunk_crack: false,
    crown_lean: "",
    deciduous: null,
    risk_base: 0,
    risk_weather: 0,
    risk_instant: 0,
    risk_score: null,
    health_score: null,
    risk_level: "LOW",
    history: { memo: "" },
    disease: { has_issue: false, last_date: "-", detail: "-" },
    tag_id: "",
    nfc_id: "",
    qr_id: "",
    sensor_id: "",
    photo_url: "",
    created_by: "LMY",
    created_at: today,
    updated_at: today,
  };

  const next = base.concat(newTree);
  currentTreeIndex = next.length - 1;

  setAddMode(false);
  setTreeData(next);

  // 추가 직후, 바로 상세 패널을 "새 수목 편집 모드"로 열기
  openTreeDetailPanel(newTree, "new");
}

// 전체 렌더(리스트 + 지도 + 그래프)
function renderTrees() {
  // 전도 위험도 재계산 (기상·구조 조건 반영)
  if (typeof window.recalcAllTreeRisks === "function") {
    window.recalcAllTreeRisks();
  }

  updateTreeList(searchInput ? searchInput.value : "");
  if (typeof renderTreesOnMap === "function") {
    renderTreesOnMap();
  }
  // 차트도 같이 갱신
  if (typeof window.updateRiskChart === "function") {
    window.updateRiskChart();
  }
  // 전도 위험 TOP5 경보판 갱신
  if (typeof window.renderRiskTop5 === "function") {
    window.renderRiskTop5();
  }
}

// ===== 상세 패널 열기/편집 모드 제어 =====
function openTreeDetailPanel(tree, mode = "view") {
  const titleEl = document.getElementById("treeTitle");
  const statusEl = document.getElementById("treeStatus");

  const idEl = document.getElementById("treeId");
  const speciesEl = document.getElementById("treeSpecies");
  const zoneEl = document.getElementById("treeZone");
  const typeEl = document.getElementById("treeType");
  const statusSel = document.getElementById("treeStatusSelect");

  const heightEl = document.getElementById("treeHeight");
  const dbhEl = document.getElementById("treeDbh");
  const crownEl = document.getElementById("treeCrown");
  const slopeEl = document.getElementById("treeSlope");
  const tiltEl = document.getElementById("treeTilt");
  const soilEl = document.getElementById("treeSoilStability");
  const rootIssueEl = document.getElementById("treeRootIssue");
  const memoEl = document.getElementById("treeMemo");

  if (!idEl) return; // 패널이 없으면 아무 것도 안 함

  idEl.value = tree.id || "";
  speciesEl.value = tree.species || "";
  zoneEl.value = tree.zone || "";
  typeEl.value = tree.type || "교목";
  statusSel.value = tree.status || "양호";

  heightEl.value = tree.height ?? "";
  dbhEl.value = tree.dbh ?? "";
  crownEl.value = tree.crown ?? "";
  slopeEl.value = tree.slope ?? "";
  tiltEl.value = tree.tilt ?? "";
  soilEl.value = tree.soil_stability || "";
  rootIssueEl.value = tree.root_issue || "없음";
  memoEl.value = (tree.history && tree.history.memo) || "";

  titleEl.textContent =
    (tree.id || "-") + (tree.species ? " · " + tree.species : "");
  statusEl.textContent = (tree.type || "-") + " · " + (tree.status || "-");

  const editable =
    (mode === "edit" || mode === "new") &&
    typeof CURRENT_USER_ROLE !== "undefined" &&
    CURRENT_USER_ROLE === "admin";

  setTreeFormEditable(editable);

  const btnEdit = document.getElementById("btnTreeEdit");
  const btnSave = document.getElementById("btnTreeSaveDetail");
  const btnCancel = document.getElementById("btnTreeCancel");

  if (btnEdit && btnSave && btnCancel) {
    if (editable) {
      btnEdit.style.display = "none";
      btnSave.style.display = "inline-flex";
      btnCancel.style.display = "inline-flex";
    } else {
      btnEdit.style.display =
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE === "admin"
          ? "inline-flex"
          : "none";
      btnSave.style.display = "none";
      btnCancel.style.display = "none";
    }
  }

  const panel = document.querySelector(".tree-detail-panel");
  if (panel) {
    panel.classList.add("open"); // CSS에서 필요하면 .open 활용
  }
}

function setTreeFormEditable(editable) {
  const inputs = document.querySelectorAll(
    ".tree-detail-panel .field-input, .tree-detail-panel textarea"
  );
  inputs.forEach((el) => {
    if (el.id === "treeId") {
      el.readOnly = true; // ID는 항상 읽기 전용
      return;
    }

    if (el.tagName === "SELECT") {
      el.disabled = !editable;
    } else {
      el.readOnly = !editable;
    }
    el.classList.toggle("field-readonly", !editable);
  });
}

// ===== 서버 연동 (원하면 사용) =====
async function loadTreesFromServer() {
  try {
    const res = await fetch("/api/trees-load.php?ts=" + Date.now(), {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("load fail");
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      setTreeData(data);
      return;
    }
  } catch (err) {
    console.warn("서버에서 수목 데이터 로드 실패, 기본값 사용", err);
  }
  // 서버 데이터가 없거나 실패한 경우, 현재 상태 모듈의 기본값으로 렌더
  renderTrees();
}

async function saveTreesToServer() {
  try {
    const res = await fetch("/api/trees-save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getTreeData()),
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("HTTP 오류", res.status, text);
      alert("서버 오류(" + res.status + "): " + text);
      return;
    }

    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", e, text);
      alert("JSON 파싱 오류: " + text);
      return;
    }

    if (!json.ok) {
      console.error("저장 실패", json);
      alert("저장 실패: " + (json.error || "원인 불명"));
      return;
    }

    alert("수목 데이터 저장 완료 (" + json.count + "개)");
  } catch (err) {
    console.error("fetch 자체 에러", err);
    alert("통신 에러: " + err.message);
  }
}