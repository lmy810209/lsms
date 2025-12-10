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
  if (tree.risk_level === "MOD") return "#eab308";
  return "#22c55e";
}

// DOM 참조
let treeListBody = null;
let treeCountEl = null;
let searchInput = null;
let addHint = null;

// 새 수목 등록 모달 관련
let treeAddModal = null;
let treeAddIdEl = null;
let treeAddSpeciesEl = null;
let treeAddZoneEl = null;
let treeAddYearEl = null;
let treeAddHeightEl = null;
let treeAddDbhEl = null;
let treeAddCrownEl = null;
let pendingAddLat = null;
let pendingAddLng = null;

// 추가 모드 플래그
let addMode = false;

// 현재 상세 패널에서 보고/수정 중인 수목 index
let currentTreeIndex = null;

// 수목 상세 패널 관련
let detailPanel = null;
let detailSpans = {};
let detailInputs = {};
let detailEditBtn = null;
let detailSaveBtn = null;
let detailCancelBtn = null;
let detailDeleteBtn = null;
let detailCloseBtn = null;
let detailEditMode = false;
let originalTreeDataSnapshot = null;

// ===== 리스트 초기화 =====
function treesInit() {
  treeListBody = document.getElementById("treeListBody");
  treeCountEl = document.getElementById("treeCount");
  searchInput = document.getElementById("treeSearchInput");
  addHint = document.getElementById("addModeHint");

  // 새 수목 등록 모달 요소
  treeAddModal = document.getElementById("treeAddModal");
  treeAddIdEl = document.getElementById("treeAddId");
  treeAddSpeciesEl = document.getElementById("treeAddSpecies");
  treeAddZoneEl = document.getElementById("treeAddZone");
  treeAddYearEl = document.getElementById("treeAddYear");
  treeAddHeightEl = document.getElementById("treeAddHeight");
  treeAddDbhEl = document.getElementById("treeAddDbh");
  treeAddCrownEl = document.getElementById("treeAddCrown");

  // 수목 상세 패널 요소
  detailPanel = document.getElementById("treeDetailsPanel");
  if (detailPanel) {
    detailSpans = {
      id: document.getElementById("detailTreeId"),
      species: document.getElementById("detailSpecies"),
      zone: document.getElementById("detailZone"),
      height: document.getElementById("detailHeight"),
      dbh: document.getElementById("detailDbh"),
      crown: document.getElementById("detailCrown"),
      year: document.getElementById("detailYear"),
      health: document.getElementById("detailHealth"),
      memo: document.getElementById("detailMemo"),
    };
    detailInputs = {
      id: document.getElementById("detailTreeIdInput"),
      species: document.getElementById("detailSpeciesInput"),
      zone: document.getElementById("detailZoneInput"),
      height: document.getElementById("detailHeightInput"),
      dbh: document.getElementById("detailDbhInput"),
      crown: document.getElementById("detailCrownInput"),
      year: document.getElementById("detailYearInput"),
      health: document.getElementById("detailHealthInput"),
      memo: document.getElementById("detailMemoInput"),
    };

    detailEditBtn = document.getElementById("btnEditTree");
    detailSaveBtn = document.getElementById("btnSaveTree");
    detailCancelBtn = document.getElementById("btnCancelEdit");
    detailDeleteBtn = document.getElementById("btnDeleteTree");
    detailCloseBtn = document.getElementById("btnCloseTreeDetails");

    const setDetailMode = (edit) => {
      detailEditMode = edit;
      if (!detailPanel) return;

      if (detailEditBtn) {
        detailEditBtn.classList.toggle("hidden", edit);
        // 작업자/게스트는 편집 버튼 숨김
        if (
          typeof CURRENT_USER_ROLE !== "undefined" &&
          CURRENT_USER_ROLE !== "admin"
        ) {
          detailEditBtn.style.display = "none";
        }
      }
      if (detailSaveBtn) {
        detailSaveBtn.classList.toggle("hidden", !edit);
      }
      if (detailCancelBtn) {
        detailCancelBtn.classList.toggle("hidden", !edit);
      }

      Object.keys(detailSpans).forEach((key) => {
        const span = detailSpans[key];
        const input = detailInputs[key];
        if (!span || !input) return;
        if (edit && key !== "id") {
          // ID는 읽기 전용 유지
          span.classList.add("hidden");
          input.classList.remove("hidden");
        } else {
          span.classList.remove("hidden");
          input.classList.add("hidden");
        }
      });
    };

    const closeDetails = () => {
      if (detailPanel) {
        detailPanel.classList.add("hidden");
      }
      detailEditMode = false;
      pendingAddLat = null;
      pendingAddLng = null;
    };

    if (detailCloseBtn) {
      detailCloseBtn.addEventListener("click", closeDetails);
    }

    if (detailEditBtn) {
      detailEditBtn.addEventListener("click", () => {
        if (
          typeof CURRENT_USER_ROLE !== "undefined" &&
          CURRENT_USER_ROLE !== "admin"
        ) {
          alert("편집 권한이 없습니다.");
          return;
        }
        if (currentTreeIndex == null) return;
        const data = getTreeData();
        if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;
        const t = data[currentTreeIndex];

        // 원본 값 백업 (취소용)
        originalTreeDataSnapshot = {
          id: t.id,
          species: t.species,
          zone: t.zone,
          height: t.height,
          dbh: t.dbh,
          crown: t.crown,
          crown_width: t.crown_width,
          crown_height: t.crown_height,
          planted_year: t.planted_year,
          health_score: t.health_score,
          memo: (t.history && t.history.memo) || "",
          lat: t.lat,
          lng: t.lng,
        };

        // 입력 값에 현재 값을 채워 넣기
        if (detailInputs.id) detailInputs.id.value = t.id || "";
        if (detailInputs.species) detailInputs.species.value = t.species || "";
        if (detailInputs.zone) detailInputs.zone.value = t.zone || "";
        if (detailInputs.height)
          detailInputs.height.value = t.height ?? "";
        if (detailInputs.dbh) detailInputs.dbh.value = t.dbh ?? "";
        if (detailInputs.crown) detailInputs.crown.value = t.crown ?? "";
        if (detailInputs.year)
          detailInputs.year.value = t.planted_year ?? "";
        if (detailInputs.health)
          detailInputs.health.value = t.health_score ?? "";
        if (detailInputs.memo)
          detailInputs.memo.value =
            (t.history && t.history.memo) || "";

        setDetailMode(true);

        // 편집 모드에서만 마커 드래그 활성화
        if (window.LSMS_MAP_DRAG && typeof window.LSMS_MAP_DRAG.enable === "function") {
          window.LSMS_MAP_DRAG.enable(t.id);
        }
      });
    }

    if (detailCancelBtn) {
      detailCancelBtn.addEventListener("click", () => {
        // 위치 되돌리기
        if (
          window.LSMS_MAP_DRAG &&
          typeof window.LSMS_MAP_DRAG.cancel === "function" &&
          originalTreeDataSnapshot
        ) {
          window.LSMS_MAP_DRAG.cancel(originalTreeDataSnapshot.id);
        }

        // 데이터 되돌리기
        if (originalTreeDataSnapshot && currentTreeIndex != null) {
          const data = getTreeData();
          if (currentTreeIndex >= 0 && currentTreeIndex < data.length) {
            const t = data[currentTreeIndex];
            t.species = originalTreeDataSnapshot.species;
            t.zone = originalTreeDataSnapshot.zone;
            t.height = originalTreeDataSnapshot.height;
            t.dbh = originalTreeDataSnapshot.dbh;
            t.crown = originalTreeDataSnapshot.crown;
            t.crown_width = originalTreeDataSnapshot.crown_width;
            t.crown_height = originalTreeDataSnapshot.crown_height;
            t.planted_year = originalTreeDataSnapshot.planted_year;
            t.health_score = originalTreeDataSnapshot.health_score;
            if (!t.history) t.history = {};
            t.history.memo = originalTreeDataSnapshot.memo;
            t.lat = originalTreeDataSnapshot.lat;
            t.lng = originalTreeDataSnapshot.lng;
            setTreeData(data);
            openTreeDetailPanel(t, "view");
          }
        }

        originalTreeDataSnapshot = null;
        setDetailMode(false);
      });
    }

    if (detailSaveBtn) {
      detailSaveBtn.addEventListener("click", () => {
        if (
          typeof CURRENT_USER_ROLE !== "undefined" &&
          CURRENT_USER_ROLE !== "admin"
        ) {
          alert("편집 권한이 없습니다.");
          return;
        }
        if (currentTreeIndex == null) return;
        const data = getTreeData();
        if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;
        const t = data[currentTreeIndex];

        if (detailInputs.species)
          t.species = detailInputs.species.value;
        if (detailInputs.zone) t.zone = detailInputs.zone.value;
        if (detailInputs.height) {
          const v = detailInputs.height.value;
          t.height = v ? Number(v) : null;
        }
        if (detailInputs.dbh) {
          const v = detailInputs.dbh.value;
          t.dbh = v ? Number(v) : null;
        }
        if (detailInputs.crown) {
          const v = detailInputs.crown.value;
          const num = v ? Number(v) : null;
          t.crown = num;
          t.crown_width = num;
        }
        if (detailInputs.year) {
          const v = detailInputs.year.value;
          t.planted_year = v ? Number(v) : null;
        }
        if (detailInputs.health) {
          const v = detailInputs.health.value;
          t.health_score = v ? Number(v) : null;
        }
        if (!t.history) t.history = {};
        if (detailInputs.memo) {
          t.history.memo = detailInputs.memo.value;
        }
        t.updated_at = new Date().toISOString().slice(0, 10);

        // 위치 변경 반영
        if (
          window.LSMS_MAP_DRAG &&
          typeof window.LSMS_MAP_DRAG.apply === "function"
        ) {
          const finalLatLng = window.LSMS_MAP_DRAG.apply(t.id);
          if (finalLatLng) {
            t.lat = finalLatLng.lat;
            t.lng = finalLatLng.lng;
          }
        }

        setTreeData(data);
        openTreeDetailPanel(t, "view");
        originalTreeDataSnapshot = null;
      });
    }

    if (detailDeleteBtn) {
      detailDeleteBtn.addEventListener("click", () => {
        if (
          typeof CURRENT_USER_ROLE !== "undefined" &&
          CURRENT_USER_ROLE !== "admin"
        ) {
          alert("삭제는 관리자만 가능합니다.");
          return;
        }
        if (currentTreeIndex == null) return;
        const data = getTreeData();
        if (currentTreeIndex < 0 || currentTreeIndex >= data.length) return;
        const target = data[currentTreeIndex];
        if (!confirm(`${target.id} 수목을 삭제할까요?`)) return;
        const next = data.filter((t) => t.id !== target.id);
        currentTreeIndex = null;
        setTreeData(next);
        closeDetails();
      });
    }
  }

  // 초기에는 항상 추가 모드/모달을 완전히 끈 상태로 시작
  addMode = false;
  if (treeAddModal) {
    treeAddModal.hidden = true;
  }

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
      // 버튼을 누르면 "지도에서 위치 선택" 모드로 전환
      // → 지도에서 위치를 찍은 뒤 모달이 뜨도록 함
      if (addMode) {
        setAddMode(false);
        pendingAddLat = null;
        pendingAddLng = null;
        if (treeAddModal) {
          treeAddModal.hidden = true;
        }
      } else {
        pendingAddLat = null;
        pendingAddLng = null;
        setAddMode(true);
      }
    });
  }

  // 새 수목 등록 모달 이벤트
  const modalClose = document.getElementById("treeAddModalClose");
  const modalCancel = document.getElementById("treeAddCancel");
  const modalSubmit = document.getElementById("treeAddSubmit");

  const closeTreeAddModal = () => {
    if (treeAddModal) {
      treeAddModal.hidden = true;
    }
    pendingAddLat = null;
    pendingAddLng = null;
    setAddMode(false);
  };

  if (treeAddModal) {
    treeAddModal.addEventListener("click", (e) => {
      if (e.target === treeAddModal) {
        closeTreeAddModal();
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", closeTreeAddModal);
  }
  if (modalCancel) {
    modalCancel.addEventListener("click", closeTreeAddModal);
  }
  if (modalSubmit) {
    modalSubmit.addEventListener("click", () => {
      if (
        typeof CURRENT_USER_ROLE !== "undefined" &&
        CURRENT_USER_ROLE !== "admin"
      ) {
        alert("수목 등록은 관리자만 가능합니다.");
        return;
      }

      if (pendingAddLat == null || pendingAddLng == null) {
        alert("지도에서 수목 위치를 먼저 선택해 주세요.");
        return;
      }
      const id = (treeAddIdEl?.value || "").trim();
      if (!id) {
        alert("수목 ID를 입력해 주세요.");
        if (treeAddIdEl) treeAddIdEl.focus();
        return;
      }

      const base = getTreeData();
      if (base.some((t) => t.id === id)) {
        alert("이미 존재하는 수목 ID입니다.");
        return;
      }

      const species = (treeAddSpeciesEl?.value || "").trim();
      const zone = (treeAddZoneEl?.value || "").trim();
      const yearStr = (treeAddYearEl?.value || "").trim();
      const heightStr = (treeAddHeightEl?.value || "").trim();
      const dbhStr = (treeAddDbhEl?.value || "").trim();
      const crownStr = (treeAddCrownEl?.value || "").trim();

      const plantedYear = yearStr ? Number(yearStr) : null;
      const height = heightStr ? Number(heightStr) : null;
      const dbh = dbhStr ? Number(dbhStr) : null;
      const crown = crownStr ? Number(crownStr) : null;

      const today = new Date().toISOString().slice(0, 10);

      // 지도에서 선택한 위치를 그대로 사용
      const lat = pendingAddLat;
      const lng = pendingAddLng;

      const newTree = {
        id,
        species,
        type: "교목",
        status: "양호",
        zone,
        lat,
        lng,
        height,
        dbh,
        crown: crown,
        crown_width: crown,
        crown_height: null,
        planted_year: plantedYear,
        slope: null,
        tilt: null,
        root_lift: false,
        drainage: "",
        trunk_crack: false,
        crown_lean: "",
        risk_base: 0,
        risk_instant: 0,
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

      setTreeData(next);
      closeTreeAddModal();
      openTreeDetailPanel(newTree, "new");
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
      const memoEl = document.getElementById("treeMemo");

      t.species = speciesEl.value;
      t.zone = zoneEl.value;
      t.type = typeEl.value;
      t.status = statusSel.value;
      t.height = heightEl.value ? Number(heightEl.value) : null;
      t.dbh = dbhEl.value ? Number(dbhEl.value) : null;
      t.crown = crownEl.value ? Number(crownEl.value) : null;

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

  // 지도에서 선택한 좌표를 저장하고 모달을 연다.
  pendingAddLat = lat;
  pendingAddLng = lng;

  if (!treeAddModal) {
    alert("수목 등록 모달을 찾을 수 없습니다.");
    setAddMode(false);
    return;
  }

  if (treeAddIdEl) treeAddIdEl.value = "";
  if (treeAddSpeciesEl) treeAddSpeciesEl.value = "";
  if (treeAddZoneEl) treeAddZoneEl.value = "";
  if (treeAddYearEl) treeAddYearEl.value = "";
  if (treeAddHeightEl) treeAddHeightEl.value = "";
  if (treeAddDbhEl) treeAddDbhEl.value = "";
  if (treeAddCrownEl) treeAddCrownEl.value = "";

  treeAddModal.hidden = false;
  setAddMode(false);
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

function openTreeDetailPanel(tree, mode = "view") {
  if (!detailPanel || !detailSpans) return;

  const all = getTreeData();
  const index = all.findIndex((t) => t.id === tree.id);
  currentTreeIndex = index >= 0 ? index : null;

  // 보기 모드로 전환
  detailEditMode = false;
  detailPanel.classList.remove("hidden");

  if (detailSpans.id) detailSpans.id.textContent = tree.id || "-";
  if (detailSpans.species)
    detailSpans.species.textContent = tree.species || "-";
  if (detailSpans.zone) detailSpans.zone.textContent = tree.zone || "-";
  if (detailSpans.height)
    detailSpans.height.textContent =
      (tree.height != null ? tree.height + " m" : "-");
  if (detailSpans.dbh)
    detailSpans.dbh.textContent =
      (tree.dbh != null ? tree.dbh + " cm" : "-");
  if (detailSpans.crown) {
    const cw =
      tree.crown_width != null
        ? tree.crown_width
        : tree.crown != null
        ? tree.crown
        : null;
    detailSpans.crown.textContent = cw != null ? cw + " m" : "-";
  }
  if (detailSpans.year)
    detailSpans.year.textContent =
      tree.planted_year != null ? tree.planted_year : "-";
  if (detailSpans.health)
    detailSpans.health.textContent =
      tree.health_score != null ? tree.health_score : "-";
  if (detailSpans.memo)
    detailSpans.memo.textContent =
      (tree.history && tree.history.memo) || "-";

  // 보기 모드에서 입력 필드는 숨김
  Object.keys(detailSpans).forEach((key) => {
    const span = detailSpans[key];
    const input = detailInputs[key];
    if (!span || !input) return;
    span.classList.remove("hidden");
    input.classList.add("hidden");
  });

  if (detailEditBtn) {
    detailEditBtn.classList.remove("hidden");
    if (
      typeof CURRENT_USER_ROLE !== "undefined" &&
      CURRENT_USER_ROLE !== "admin"
    ) {
      detailEditBtn.style.display = "none";
    } else {
      detailEditBtn.style.display = "";
    }
  }
  if (detailSaveBtn) detailSaveBtn.classList.add("hidden");
  if (detailCancelBtn) detailCancelBtn.classList.add("hidden");
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