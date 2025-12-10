// ===== 지도 / 마커 / 팝업 =====

let map;
let markerLayer;
let markersById = {};

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
    // addMode는 trees.js에서 관리
    if (!addMode) return;
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
    const color = getSpeciesColor(tree.species || "");
    const ringColor = getRiskRingColor(tree);
    const number = index + 1;
    const hasDisease = tree.disease && tree.disease.has_issue;

    const iconHtml = `
      <div style="
        width:24px;height:24px;
        border-radius:999px;
        background:${color};
        border:2px solid ${ringColor};
        box-shadow:${hasDisease
          ? "0 0 10px rgba(248,113,113,0.9)"
          : "0 0 5px rgba(15,23,42,0.4)"};
        display:flex;align-items:center;justify-content:center;
        font-size:12px;font-weight:600;
        color:#0f172a;
      ">
        ${number}
      </div>
    `;

    const icon = L.divIcon({
      className: "",
      html: iconHtml,
      iconSize: [24,24],
      iconAnchor: [12,24],
      popupAnchor: [0,-22]
    });

    const marker = L.marker([tree.lat, tree.lng], { icon }).addTo(markerLayer);
    markersById[tree.id] = marker;

    const diseaseText = tree.disease?.has_issue ? "있음" : "없음";

    const popupHTML = `
      <div class="lsms-popup">
        <div class="lsms-popup-header">
          <div class="lsms-popup-title">${tree.id} · ${tree.species}</div>
          <div class="lsms-popup-sub">
            ${tree.zone || "-"} · ${tree.type || "-"} · 상태 ${tree.status || "-"}
          </div>
        </div>
        <div class="lsms-popup-body">
          <div class="lsms-tab-nav">
            <button class="lsms-tab-btn active" data-tab="basic">생육 정보</button>
            <button class="lsms-tab-btn" data-tab="risk">전도 위험</button>
            <button class="lsms-tab-btn" data-tab="manage">최근 관리</button>
            <button class="lsms-tab-btn" data-tab="disease">병해충 이력</button>
            <button class="lsms-tab-btn" data-tab="tag">태그·센서</button>
            <button class="lsms-tab-btn" data-tab="photo">사진·메모</button>
          </div>

          <!-- 생육 정보 -->
          <div class="lsms-tab-panel active" data-tab-panel="basic">
            <div class="lsms-section-title">생육 정보</div>
            <div class="lsms-row"><span>수고(H)</span><span>${tree.height ?? "-"} m</span></div>
            <div class="lsms-row"><span>흉고 직경</span><span>${tree.dbh ?? "-"} cm</span></div>
            <div class="lsms-row"><span>수관폭</span><span>${tree.crown ?? "-"} m</span></div>
            <div class="lsms-row"><span>식재연도</span><span>${tree.planted_year ?? "-"}</span></div>
            <div class="lsms-row"><span>건강도 점수</span><span>${tree.health_score ?? "-"}</span></div>
          </div>

          <!-- 전도 위험 -->
          <div class="lsms-tab-panel" data-tab-panel="risk">
            <div class="lsms-section-title">전도 위험</div>
            <div class="lsms-row"><span>위험 등급</span><span>${tree.risk_level || "-"} (점수 ${tree.risk_score ?? "-"})</span></div>
            <div class="lsms-row"><span>경사도</span><span>${tree.slope ?? "-"} %</span></div>
            <div class="lsms-row"><span>수간 기울기</span><span>${tree.tilt ?? "-"} °</span></div>
            <div class="lsms-row"><span>뿌리 들림</span><span>${tree.root_lift ? "있음" : "없음"}</span></div>
            <div class="lsms-row"><span>배수 상태</span><span>${tree.drainage || "-"}</span></div>
            <div class="lsms-row"><span>수간 균열</span><span>${tree.trunk_crack ? "있음" : "없음"}</span></div>
            <div class="lsms-row"><span>수관 편중</span><span>${tree.crown_lean || "-"}</span></div>
          </div>

          <!-- 최근 관리 -->
          <div class="lsms-tab-panel" data-tab-panel="manage">
            <div class="lsms-section-title">최근 관리 이력</div>
            <div class="lsms-row"><span>전정</span><span>${tree.history?.pruning || "-"}</span></div>
            <div class="lsms-row"><span>방제</span><span>${tree.history?.pest || "-"}</span></div>
            <div class="lsms-row"><span>시비</span><span>${tree.history?.fertilize || "-"}</span></div>
            <div class="lsms-row"><span>점검</span><span>${tree.history?.inspection || "-"}</span></div>
            <div class="lsms-note">메모: ${tree.history?.memo || "-"}</div>
          </div>

          <!-- 병해충 이력 -->
          <div class="lsms-tab-panel" data-tab-panel="disease">
            <div class="lsms-section-title">병해충 발생 이력</div>
            <div class="lsms-row"><span>피해 발생 여부</span><span>${diseaseText}</span></div>
            <div class="lsms-row"><span>최근 발생일</span><span>${tree.disease?.last_date || "-"}</span></div>
            <div class="lsms-note">${tree.disease?.detail || "-"}</div>
          </div>

          <!-- 태그·센서 -->
          <div class="lsms-tab-panel" data-tab-panel="tag">
            <div class="lsms-section-title">QR / NFC / RFID · 센서</div>
            <div class="lsms-row"><span>RFID tag</span><span>${tree.tag_id || "-"}</span></div>
            <div class="lsms-row"><span>NFC ID</span><span>${tree.nfc_id || "-"}</span></div>
            <div class="lsms-row"><span>QR 코드 ID</span><span>${tree.qr_id || "-"}</span></div>
            <div class="lsms-row"><span>센서 ID</span><span>${tree.sensor_id || "-"}</span></div>
          </div>

          <!-- 사진·메모 -->
          <div class="lsms-tab-panel" data-tab-panel="photo">
            <div class="lsms-section-title">현장 사진 · 메모</div>
            ${
              tree.photo_url
                ? `<img src="${tree.photo_url}" alt="현장 사진" class="lsms-photo">`
                : `<div class="lsms-note">아직 등록된 사진이 없습니다.</div>`
            }
            <div class="lsms-note">작성: ${tree.created_by || "-"} / 최초등록 ${tree.created_at || "-"} / 최종수정 ${tree.updated_at || "-"}</div>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupHTML, {
      maxWidth: 280,
      className: "lsms-tree-popup",
      autoPan: true,
      autoPanPadding: [40,80]
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

// 팝업 탭 버튼 전역 처리 (기존 document.addEventListener 코드)
document.addEventListener("click", (event) => {
  const btn = event.target.closest(".lsms-tab-btn");
  if (!btn) return;

  const popup = btn.closest(".lsms-popup");
  if (!popup) return;

  const tab = btn.getAttribute("data-tab");
  const allBtns = popup.querySelectorAll(".lsms-tab-btn");
  const panels = popup.querySelectorAll(".lsms-tab-panel");

  allBtns.forEach((b) => b.classList.toggle("active", b === btn));
  panels.forEach((p) => {
    const panelTab = p.getAttribute("data-tab-panel");
    p.classList.toggle("active", panelTab === tab);
  });
});
