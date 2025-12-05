// ===== 수목 데이터 및 리스트 관리 =====
//
// ※ 권한 정보는 app.js의 CURRENT_USER_ROLE 사용
//    const CURRENT_USER_ROLE = 'admin' | 'worker' | 'guest'

// 기본 수목 데이터 (기존 코드 그대로)
let treeData = [
  {
    id: "YA-001",
    species: "소나무",
    type: "교목",
    status: "양호",
    zone: "정문 A존",
    lat: 37.46450,
    lng: 127.04285,
    height: 7.2,
    dbh: 28,
    crown: 5.4,
    planted_year: 2012,
    slope: 8,
    tilt: 4,
    root_lift: false,
    drainage: "보통",
    trunk_crack: false,
    crown_lean: "약함",
    risk_score: 37,
    health_score: 82,
    risk_level: "LOW",
    history: {
      pruning: "2024-03-20",
      pest: "2024-07-11",
      fertilize: "2024-05-15",
      inspection: "2024-08-03",
      memo: "사면부 배수 점검 필요"
    },
    disease: {
      has_issue: false,
      last_date: "-",
      detail: "-"
    },
    tag_id: "RFID-A001",
    nfc_id: "NFC-A001",
    qr_id: "QR-A001",
    sensor_id: "sensor_12",
    photo_url: "",
    created_by: "LMY",
    created_at: "2024-01-05",
    updated_at: "2024-09-12"
  },
  {
    id: "YA-002",
    species: "산벚나무",
    type: "교목",
    status: "주의",
    zone: "도로변 B존",
    lat: 37.46463,
    lng: 127.04265,
    height: 6.1,
    dbh: 24,
    crown: 4.1,
    planted_year: 2014,
    slope: 14,
    tilt: 7,
    root_lift: true,
    drainage: "불량",
    trunk_crack: false,
    crown_lean: "중간",
    risk_score: 62,
    health_score: 74,
    risk_level: "MOD",
    history: {
      pruning: "2024-04-15",
      pest: "2024-08-10",
      fertilize: "2024-05-02",
      inspection: "2024-09-01",
      memo: "배수 불량 + 뿌리 들림 관찰됨"
    },
    disease: {
      has_issue: true,
      last_date: "2024-08-10",
      detail: "잎 반점 + 줄기 껍질 갈라짐 관찰, 예방 방제 완료"
    },
    tag_id: "RFID-B021",
    nfc_id: "NFC-B021",
    qr_id: "QR-B021",
    sensor_id: "sensor_19",
    photo_url: "",
    created_by: "LMY",
    created_at: "2024-01-05",
    updated_at: "2024-10-12"
  },
  {
    id: "YA-003",
    species: "회양목",
    type: "관목",
    status: "양호",
    zone: "광장 C존",
    lat: 37.46440,
    lng: 127.04295,
    height: 1.1,
    dbh: 6,
    crown: 1.2,
    planted_year: 2020,
    slope: 2,
    tilt: 1,
    root_lift: false,
    drainage: "양호",
    trunk_crack: false,
    crown_lean: "없음",
    risk_score: 20,
    health_score: 90,
    risk_level: "LOW",
    history: {
      pruning: "2024-04-02",
      pest: "-",
      fertilize: "2024-06-14",
      inspection: "2024-08-21",
      memo: ""
    },
    disease: {
      has_issue: false,
      last_date: "-",
      detail: "-"
    },
    tag_id: "RFID-C102",
    nfc_id: "",
    qr_id: "QR-C102",
    sensor_id: "",
    photo_url: "",
    created_by: "LMY",
    created_at: "2024-01-10",
    updated_at: "2024-07-07"
  }
];

// ★ 그래프 / 다른 JS에서도 쓰게 전역에 연결
window.treeData = treeData;

// 공통 색상 함수 (지도 + 리스트에서 같이 사용)
function getSpeciesColor(species) {
  if (!species) return "#6b7280";
  if (species.includes("소나무")) return "#22c55e";  // 초록
  if (species.includes("벚나무")) return "#38bdf8";  // 하늘
  if (species.includes("회양목")) return "#eab308";  // 노랑
  return "#6b7280";
}

function getRiskRingColor(tree) {
  if (tree.risk_level === "HIGH") return "#ef4444";
  if (tree.risk_level === "MOD")  return "#eab308";
  return "#22c55e";
}

// DOM 참조
let treeListBody = null;
let treeCountEl  = null;
let searchInput  = null;
let addHint      = null;

// 추가 모드 플래그
let addMode = false;

// 현재 상세 패널에서 보고/수정 중인 수목 index
let currentTreeIndex = null;

// ===== 리스트 초기화 =====
function treesInit() {
  treeListBody = document.getElementById("treeListBody");
  treeCountEl  = document.getElementById("treeCount");
  searchInput  = document.getElementById("treeSearchInput");
  addHint      = document.getElementById("addModeHint");

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
      if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") {
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
      if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") {
        alert("저장은 관리자만 가능합니다.");
        return;
      }
      saveTreesToServer();
    });
  }

  // 상세 패널 버튼들
  const btnDetailEdit   = document.getElementById("btnTreeEdit");
  const btnDetailSave   = document.getElementById("btnTreeSaveDetail");
  const btnDetailCancel = document.getElementById("btnTreeCancel");

  if (btnDetailEdit && btnDetailSave && btnDetailCancel) {
    // 처음엔 읽기 전용 모드
    setTreeFormEditable(false);

    btnDetailEdit.addEventListener("click", () => {
      if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") {
        alert("수정 권한이 없습니다.");
        return;
      }
      if (currentTreeIndex == null) return;
      openTreeDetailPanel(treeData[currentTreeIndex], "edit");
    });

    btnDetailSave.addEventListener("click", () => {
      if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") return;
      if (currentTreeIndex == null) return;

      const t = treeData[currentTreeIndex];

      const speciesEl = document.getElementById("treeSpecies");
      const zoneEl    = document.getElementById("treeZone");
      const typeEl    = document.getElementById("treeType");
      const statusSel = document.getElementById("treeStatusSelect");
      const heightEl  = document.getElementById("treeHeight");
      const dbhEl     = document.getElementById("treeDbh");
      const crownEl   = document.getElementById("treeCrown");
      const memoEl    = document.getElementById("treeMemo");

      t.species = speciesEl.value;
      t.zone    = zoneEl.value;
      t.type    = typeEl.value;
      t.status  = statusSel.value;
      t.height  = heightEl.value ? Number(heightEl.value) : null;
      t.dbh     = dbhEl.value ? Number(dbhEl.value) : null;
      t.crown   = crownEl.value ? Number(crownEl.value) : null;

      if (!t.history) t.history = {};
      t.history.memo = memoEl.value;

      t.updated_at = new Date().toISOString().slice(0, 10);

      renderTrees();                    // 지도·리스트·그래프 갱신
      openTreeDetailPanel(t, "view");   // 다시 보기 모드로
    });

    btnDetailCancel.addEventListener("click", () => {
      if (currentTreeIndex == null) return;
      openTreeDetailPanel(treeData[currentTreeIndex], "view");
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

  const keyword = filterText.trim().toLowerCase();
  const filtered = treeData.filter((t) => {
    if (!keyword) return true;
    return (
      (t.id || "").toLowerCase().includes(keyword) ||
      (t.species || "").toLowerCase().includes(keyword) ||
      (t.zone || "").toLowerCase().includes(keyword)
    );
  });

  treeCountEl.textContent = treeData.length.toString();
  treeListBody.innerHTML  = "";

  filtered.forEach((tree) => {
    const fullIndex = treeData.findIndex((t) => t.id === tree.id);

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
      <div class="tree-row-sub">${tree.zone || "-"} · ${tree.type || "-"}</div>
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
      if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") {
        alert("삭제는 관리자만 가능합니다.");
        return;
      }
      if (!confirm(`${tree.id} 삭제할까요?`)) return;
      treeData = treeData.filter((t) => t.id !== tree.id);
      window.treeData = treeData;          // 전역 데이터도 같이 갱신
      currentTreeIndex = null;
      renderTrees();
    });

    row.appendChild(badge);
    row.appendChild(main);
    row.appendChild(chips);
    row.appendChild(del);

    // 행 클릭 → 지도 포커스 + 상세 패널 보기 모드
    row.addEventListener("click", () => {
      if (fullIndex === -1) return;
      currentTreeIndex = fullIndex;

      if (typeof focusTree === "function") {
        focusTree(tree.id);
      }
      openTreeDetailPanel(treeData[fullIndex], "view");
    });

    treeListBody.appendChild(row);
  });
}

// ===== 지도에서 클릭했을 때 새 수목 추가 =====
// map.js에서 addMode === true일 때 addTree(lat, lng) 호출하는 구조라고 가정
function addTree(lat, lng) {
  // 관리자만 가능
  if (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE !== "admin") {
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
    root_lift: false,
    drainage: "",
    trunk_crack: false,
    crown_lean: "",
    risk_score: null,
    health_score: null,
    risk_level: "LOW",
    history: { memo: "" },
    disease: { has_issue:false, last_date:"-", detail:"-" },
    tag_id: "",
    nfc_id: "",
    qr_id: "",
    sensor_id: "",
    photo_url: "",
    created_by: "LMY",
    created_at: today,
    updated_at: today
  };

  treeData.push(newTree);
  window.treeData = treeData;      // 전역 데이터 갱신

  currentTreeIndex = treeData.length - 1;   // 방금 추가된 수목 index

  setAddMode(false);
  renderTrees();

  // 추가 직후, 바로 상세 패널을 "새 수목 편집 모드"로 열기
  openTreeDetailPanel(newTree, "new");
}

// 전체 렌더(리스트 + 지도 + 그래프)
function renderTrees() {
  updateTreeList(searchInput ? searchInput.value : "");
  if (typeof renderTreesOnMap === "function") {
    renderTreesOnMap();
  }
  // 차트도 같이 갱신
  if (typeof window.updateRiskChart === "function") {
    window.updateRiskChart();
  }
}

// ===== 상세 패널 열기/편집 모드 제어 =====
function openTreeDetailPanel(tree, mode = "view") {
  const titleEl   = document.getElementById("treeTitle");
  const statusEl  = document.getElementById("treeStatus");

  const idEl      = document.getElementById("treeId");
  const speciesEl = document.getElementById("treeSpecies");
  const zoneEl    = document.getElementById("treeZone");
  const typeEl    = document.getElementById("treeType");
  const statusSel = document.getElementById("treeStatusSelect");

  const heightEl  = document.getElementById("treeHeight");
  const dbhEl     = document.getElementById("treeDbh");
  const crownEl   = document.getElementById("treeCrown");
  const memoEl    = document.getElementById("treeMemo");

  if (!idEl) return;  // 패널이 없으면 아무 것도 안 함

  idEl.value      = tree.id || "";
  speciesEl.value = tree.species || "";
  zoneEl.value    = tree.zone || "";
  typeEl.value    = tree.type || "교목";
  statusSel.value = tree.status || "양호";

  heightEl.value  = tree.height ?? "";
  dbhEl.value     = tree.dbh ?? "";
  crownEl.value   = tree.crown ?? "";
  memoEl.value    = (tree.history && tree.history.memo) || "";

  titleEl.textContent  = (tree.id || "-") + (tree.species ? " · " + tree.species : "");
  statusEl.textContent = (tree.type || "-") + " · " + (tree.status || "-");

  const editable =
    (mode === "edit" || mode === "new") &&
    typeof CURRENT_USER_ROLE !== "undefined" &&
    CURRENT_USER_ROLE === "admin";

  setTreeFormEditable(editable);

  const btnEdit   = document.getElementById("btnTreeEdit");
  const btnSave   = document.getElementById("btnTreeSaveDetail");
  const btnCancel = document.getElementById("btnTreeCancel");

  if (btnEdit && btnSave && btnCancel) {
    if (editable) {
      btnEdit.style.display   = "none";
      btnSave.style.display   = "inline-flex";
      btnCancel.style.display = "inline-flex";
    } else {
      btnEdit.style.display =
        (typeof CURRENT_USER_ROLE !== "undefined" && CURRENT_USER_ROLE === "admin")
          ? "inline-flex" : "none";
      btnSave.style.display   = "none";
      btnCancel.style.display = "none";
    }
  }

  const panel = document.querySelector(".tree-detail-panel");
  if (panel) {
    panel.classList.add("open");   // CSS에서 필요하면 .open 활용
  }
}

function setTreeFormEditable(editable) {
  const inputs = document.querySelectorAll(".tree-detail-panel .field-input, .tree-detail-panel textarea");
  inputs.forEach((el) => {
    if (el.id === "treeId") {
      el.readOnly = true;   // ID는 항상 읽기 전용
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
      cache: "no-store"
    });
    if (!res.ok) throw new Error("load fail");
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      treeData = data;
      window.treeData = treeData;      // 서버 데이터 로드 시 전역도 교체
    }
  } catch (err) {
    console.warn("서버에서 수목 데이터 로드 실패, 기본값 사용", err);
  }
  renderTrees();
}

async function saveTreesToServer() {
  try {
    const res = await fetch("/api/trees-save.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(treeData)
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
