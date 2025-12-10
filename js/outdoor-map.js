// ===== 지도 / 마커 / 팝업 =====

let map;
let markerLayer;
let markersById = {};
let MAP_LAYER_MODE = "all"; // 'all' | 'risk' | 'pest'
const RISK_FILTER = { HIGH: true, MID: true, LOW: true };

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

  // 초기 렌더 (기본 treeData 사용)
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

  treeData.forEach((tree, index) => {
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
    markersById[tree.id] = marker;

    const diseaseText = tree.disease?.has_issue ? "있음" : "없음";

    let badgeClass = "good";
    let healthLabel = "건강 양호";
    const score = typeof tree.health_score === "number" ? tree.health_score : null;
    if (score !== null) {
      if (score < 60) {
        badgeClass = "bad";
        healthLabel = "주의 필요";
      } else if (score < 80) {
        badgeClass = "warn";
        healthLabel = "경계";
      }
    }

    const popupHTML = `
      <div class="tree-popup">
        <div class="tree-popup-header">
          <div>
            <div class="tree-popup-id">${tree.id}</div>
            <div class="tree-popup-name">${tree.species || "-"}</div>
            <div class="tree-popup-meta">
              ${tree.zone || "-"} · ${tree.type || "-"} · 상태 ${tree.status || "-"}
            </div>
          </div>
          <div class="tree-popup-badge tree-popup-badge--${badgeClass}">
            ${healthLabel}
          </div>
        </div>

        <div class="tree-popup-tabs">
          <div class="tree-popup-tab is-active" data-tab="basic">생육 정보</div>
          <div class="tree-popup-tab" data-tab="risk">전도 위험</div>
          <div class="tree-popup-tab" data-tab="disease">병해충 이력</div>
          <div class="tree-popup-tab" data-tab="tag">태그·센서</div>
          <div class="tree-popup-tab" data-tab="manage">최근 관리</div>
          <div class="tree-popup-tab" data-tab="photo">사진·메모</div>
        </div>

        <div class="tree-popup-section" data-tab-panel="basic">
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">수고(H)</span>
            <span class="tree-popup-row-value">${tree.height ?? "-"} m</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">흉고 직경</span>
            <span class="tree-popup-row-value">${tree.dbh ?? "-"} cm</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">수관폭</span>
            <span class="tree-popup-row-value">${tree.crown ?? "-"} m</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">식재연도</span>
            <span class="tree-popup-row-value">${tree.planted_year ?? "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">건강도 점수</span>
            <span class="tree-popup-row-value">${tree.health_score ?? "-"}</span>
          </div>
        </div>

        <div class="tree-popup-section" data-tab-panel="risk" style="display:none;">
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">위험 등급</span>
            <span class="tree-popup-row-value">${tree.risk_level || "-"} (점수 ${tree.risk_score ?? "-"})</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">경사도</span>
            <span class="tree-popup-row-value">${tree.slope ?? "-"} %</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">수간 기울기</span>
            <span class="tree-popup-row-value">${tree.tilt ?? "-"} °</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">뿌리 들림</span>
            <span class="tree-popup-row-value">${tree.root_lift ? "있음" : "없음"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">배수 상태</span>
            <span class="tree-popup-row-value">${tree.drainage || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">수간 균열</span>
            <span class="tree-popup-row-value">${tree.trunk_crack ? "있음" : "없음"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">수관 편중</span>
            <span class="tree-popup-row-value">${tree.crown_lean || "-"}</span>
          </div>
        </div>

        <div class="tree-popup-section" data-tab-panel="disease" style="display:none;">
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">피해 발생 여부</span>
            <span class="tree-popup-row-value">${diseaseText}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">최근 발생일</span>
            <span class="tree-popup-row-value">${tree.disease?.last_date || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">상세</span>
            <span class="tree-popup-row-value">${tree.disease?.detail || "-"}</span>
          </div>
        </div>

        <div class="tree-popup-section" data-tab-panel="tag" style="display:none;">
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">RFID tag</span>
            <span class="tree-popup-row-value">${tree.tag_id || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">NFC ID</span>
            <span class="tree-popup-row-value">${tree.nfc_id || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">QR 코드 ID</span>
            <span class="tree-popup-row-value">${tree.qr_id || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">센서 ID</span>
            <span class="tree-popup-row-value">${tree.sensor_id || "-"}</span>
          </div>
        </div>

        <div class="tree-popup-section" data-tab-panel="manage" style="display:none;">
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">전정</span>
            <span class="tree-popup-row-value">${tree.history?.pruning || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">방제</span>
            <span class="tree-popup-row-value">${tree.history?.pest || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">시비</span>
            <span class="tree-popup-row-value">${tree.history?.fertilize || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">점검</span>
            <span class="tree-popup-row-value">${tree.history?.inspection || "-"}</span>
          </div>
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">메모</span>
            <span class="tree-popup-row-value">${tree.history?.memo || "-"}</span>
          </div>
        </div>

        <div class="tree-popup-section" data-tab-panel="photo" style="display:none;">
          ${
            tree.photo_url
              ? `<img src="${tree.photo_url}" alt="현장 사진" style="width:100%;border-radius:8px;margin-bottom:4px;">`
              : `<div class="tree-popup-row"><span class="tree-popup-row-label">사진</span><span class="tree-popup-row-value">등록된 사진이 없습니다.</span></div>`
          }
          <div class="tree-popup-row">
            <span class="tree-popup-row-label">작성</span>
            <span class="tree-popup-row-value">${tree.created_by || "-"} / 최초등록 ${tree.created_at || "-"} / 최종수정 ${tree.updated_at || "-"}</span>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHTML, {
      maxWidth: 320,
      className: "tree-popup-wrapper",
      autoPan: true,
      autoPanPadding: [40, 80]
    });

    marker.on("click", () => {
      map.setView([tree.lat, tree.lng], 18, { animate: true });
      marker.openPopup();
    });
  });
}

// 특정 수목 아이디로 포커스
function focusTree(treeId) {
  const tree = treeData.find((t) => t.id === treeId);
  const marker = markersById[treeId];
  if (!tree || !marker || !map) return;
  map.setView([tree.lat, tree.lng], 18, { animate: true });
  marker.openPopup();
}

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
