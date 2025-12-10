// ===== 지도 / 마커 / 팝업 =====

let map;
let markerLayer;
let markersById = {};
let MAP_LAYER_MODE = "all"; // 'all' | 'risk' | 'pest'
const RISK_FILTER = { HIGH: true, MID: true, LOW: true };

// 마커 드래그 상태 저장용
const MARKER_DRAG_STATE = {}; // treeId -> { originalLatLng, editedLatLng }

function handleMarkerDragEnd(e) {
  const marker = e.target;
  const treeId = marker && marker._lsmsTreeId;
  if (!treeId) return;

  if (!MARKER_DRAG_STATE[treeId]) {
    MARKER_DRAG_STATE[treeId] = {
      originalLatLng: marker.getLatLng(),
      editedLatLng: null,
    };
  }
  MARKER_DRAG_STATE[treeId].editedLatLng = marker.getLatLng();

  const hint = document.getElementById("detailLocationHint");
  if (hint) {
    hint.classList.remove("hidden");
  }
}

// 현재 사용 가능한 수목 배열을 안전하게 가져오는 헬퍼
function getAllTreesForMap() {
  if (typeof getTreeData === "function") {
    return getTreeData() || [];
  }
  if (
    window.LSMS &&
    window.LSMS.outdoor &&
    typeof window.LSMS.outdoor.getTrees === "function"
  ) {
    return window.LSMS.outdoor.getTrees() || [];
  }
  if (Array.isArray(window.treeData)) {
    return window.treeData;
  }
  return [];
}

// 지도 초기화
function mapInit() {
  const mapboxToken =
    "pk.eyJ1IjoibG15ODEyOSIsImEiOiJjbWh3dnlyOTgwMHE1Mmpvb2JuMTlhOGJmIn0.JaECwKXnoTknVOnlrMerFA";

  map = L.map("map", {
    zoomControl: true,
    attributionControl: false
  }).setView([37.4643, 127.0428], 18);

  L.tileLayer(
    "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=" + mapboxToken,
    {
      id: "mapbox/light-v11",
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 22
    }
  ).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  // 지도 클릭 → 추가 모드일 때 새 수목 생성
  map.on("click", (e) => {
    // addMode / addTree 는 trees.js에서 관리
    if (typeof addMode === "undefined" || !addMode) return;
    if (typeof addTree !== "function") return;
    addTree(e.latlng.lat, e.latlng.lng);
  });

  // 초기 렌더
  if (typeof renderTrees === "function") {
    renderTrees();
  } else {
    renderTreesOnMap();
  }
}

// 지도에 수목 마커 전체 다시 그리기
function renderTreesOnMap() {
  if (!markerLayer) return;

  markerLayer.clearLayers();
  markersById = {};

  const trees = getAllTreesForMap();

  trees.forEach((tree, index) => {
    const number = index + 1;
    const riskLevelRaw = (tree.risk_level || "LOW").toUpperCase();
    let riskKey = "LOW";
    if (riskLevelRaw === "HIGH") riskKey = "HIGH";
    else if (riskLevelRaw === "MOD" || riskLevelRaw === "MID") riskKey = "MID";

    // 위험도 필터 체크박스 상태 적용
    if (!RISK_FILTER[riskKey]) return;

    // 레이어 모드별 필터
    if (MAP_LAYER_MODE === "pest") {
      if (!(tree.disease && tree.disease.has_issue)) return;
    }
    // 'all' 또는 'risk' 모드는 현재 동일하게 전체 노출 (위험 지수는 색상/필터로만 표시)

    let markerClass = "low";
    if (riskKey === "HIGH") markerClass = "high";
    else if (riskKey === "MID") markerClass = "mid";

    const iconHtml = `
      <div class="lsms-marker lsms-marker--${markerClass}">
        <span>${number}</span>
      </div>
    `;

    const icon = L.divIcon({
      className: "lsms-marker-wrapper",
      html: iconHtml,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
      popupAnchor: [0, -24]
    });

    const marker = L.marker([tree.lat, tree.lng], { icon }).addTo(markerLayer);
    marker._lsmsTreeId = tree.id;
    markersById[tree.id] = marker;

    // tree 객체에도 마커 참조 저장 (위험도 스타일링 등에서 활용 가능)
    try {
      tree.marker = marker;
    } catch (e) {
      // 읽기 전용일 수 있으므로 실패해도 무시
    }

    marker.on("click", () => {
      map.setView([tree.lat, tree.lng], 18, { animate: true });
      if (typeof openTreeDetailPanel === "function") {
        openTreeDetailPanel(tree, "view");
      }
    });
  });
}

// 특정 수목 아이디로 포커스
function focusTree(treeId) {
  const trees = getAllTreesForMap();
  const tree = trees.find((t) => t.id === treeId);
  const marker = markersById[treeId];
  if (!tree || !marker || !map) return;
  map.setView([tree.lat, tree.lng], 18, { animate: true });
  if (typeof openTreeDetailPanel === "function") {
    openTreeDetailPanel(tree, "view");
  }
}

// 수목 마커 드래그 제어 API (trees.js에서 사용)
window.LSMS_MAP_DRAG = {
  enable(treeId) {
    const marker = markersById[treeId];
    if (!marker || !marker.dragging) return;
    const latLng = marker.getLatLng();
    MARKER_DRAG_STATE[treeId] = {
      originalLatLng: latLng,
      editedLatLng: null,
    };
    marker.dragging.enable();
    marker.on("dragend", handleMarkerDragEnd);
  },
  apply(treeId) {
    const marker = markersById[treeId];
    const state = MARKER_DRAG_STATE[treeId];
    if (marker && marker.dragging) {
      marker.dragging.disable();
      marker.off("dragend", handleMarkerDragEnd);
    }
    if (!state) return null;
    const finalLatLng = state.editedLatLng || state.originalLatLng;
    delete MARKER_DRAG_STATE[treeId];
    const hint = document.getElementById("detailLocationHint");
    if (hint) hint.classList.add("hidden");
    return finalLatLng;
  },
  cancel(treeId) {
    const marker = markersById[treeId];
    const state = MARKER_DRAG_STATE[treeId];
    if (marker && marker.dragging) {
      if (state && state.originalLatLng) {
        marker.setLatLng(state.originalLatLng);
      }
      marker.dragging.disable();
      marker.off("dragend", handleMarkerDragEnd);
    }
    delete MARKER_DRAG_STATE[treeId];
    const hint = document.getElementById("detailLocationHint");
    if (hint) hint.classList.add("hidden");
  },
};

// 위험도 수준에 따른 마커 강조 (HIGH 수목 등)
window.updateTreeMarkersByRisk = function (treeData) {
  const all = Array.isArray(treeData) ? treeData : getAllTreesForMap();
  all.forEach((t) => {
    const marker = t.marker || markersById[t.id];
    if (!marker || !marker._icon) return;
    marker._icon.classList.remove("blink");
    if ((t.risk_level || "").toUpperCase() === "HIGH") {
      marker._icon.classList.add("blink");
    }
  });
};

// 팝업 탭 버튼 전역 처리
document.addEventListener("click", (event) => {
  const tabEl = event.target.closest(".tree-popup-tab");
  if (!tabEl) return;

  const popup = tabEl.closest(".tree-popup");
  if (!popup) return;

  const tab = tabEl.getAttribute("data-tab");
  const allTabs = popup.querySelectorAll(".tree-popup-tab");
  const panels = popup.querySelectorAll(".tree-popup-section");

  allTabs.forEach((t) => {
    t.classList.toggle("is-active", t === tabEl);
  });
  panels.forEach((p) => {
    const panelTab = p.getAttribute("data-tab-panel");
    p.style.display = panelTab === tab ? "" : "none";
  });
});

// 레이어/위험도 필터 버튼 이벤트
document.addEventListener("DOMContentLoaded", () => {
  const layerButtons = document.querySelectorAll(".pill-toggle[data-layer]");
  layerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      layerButtons.forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );
      MAP_LAYER_MODE = btn.getAttribute("data-layer") || "risk";
      renderTreesOnMap();
    });
  });

  const legendCheckboxes = document.querySelectorAll(
    ".legend-checkbox[data-risk]"
  );
  legendCheckboxes.forEach((chk) => {
    chk.addEventListener("change", () => {
      const key = (chk.getAttribute("data-risk") || "").toUpperCase();
      let norm = key;
      if (norm === "MOD") norm = "MID";
      if (!RISK_FILTER.hasOwnProperty(norm)) return;
      RISK_FILTER[norm] = chk.checked;
      renderTreesOnMap();
    });
  });
});
