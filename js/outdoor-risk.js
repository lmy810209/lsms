// ===== 전도 위험도 계산 및 TOP5 리스트 =====

// 1) 기본 전도 위험도 (수목 자체 특성 기반)
function computeBaseRisk(tree) {
  const h = Number.isFinite(tree.height) ? Number(tree.height) : 0;
  const dbh = Number.isFinite(tree.dbh) ? Number(tree.dbh) : 0.0001;
  const crown = Number.isFinite(tree.crown_width)
    ? Number(tree.crown_width)
    : Number.isFinite(tree.crown)
    ? Number(tree.crown)
    : 0;
  const tilt = Number.isFinite(tree.tilt) ? Number(tree.tilt) : 0;
  const soilSlope = Number.isFinite(tree.slope) ? Number(tree.slope) : 0;
  const health =
    Number.isFinite(tree.health_score) && tree.health_score != null
      ? Math.max(0, Math.min(100, Number(tree.health_score)))
      : 80;

  // 1) 수고 점수
  const heightScore = Math.min(h / 20, 1);

  // 2) 세장비 (높이/직경)
  const slender = h / (dbh / 100);
  const slenderScore = Math.min(slender / 80, 1);

  // 3) 수관 크기
  const crownScore = Math.min(crown / 10, 1);

  // 4) 나무 기울기
  const tiltScore = Math.min(tilt / 45, 1);

  // 5) 토양 경사
  const slopeScore = Math.min(soilSlope / 30, 1);

  // 6) 수종 계수
  const speciesFactor =
    {
      "소나무": 1.1,
      "은행나무": 0.8,
      "느티나무": 1.0,
    }[tree.species] || 1.0;

  // 7) 토양 안정도 / 뿌리 이상 여부 계수
  const soilLabel = tree.soil_stability || tree.drainage || "보통";
  let soilFactor = 1.0;
  if (soilLabel === "단단함") soilFactor = 0.9;
  else if (soilLabel === "연약함") soilFactor = 1.2;

  const rootLabel =
    tree.root_condition || (tree.root_lift ? "약간" : "없음");
  let rootFactor = 1.0;
  if (rootLabel === "약간") rootFactor = 1.15;
  else if (rootLabel === "심함") rootFactor = 1.3;

  // 8) 건강 점수 계수 (건강이 나쁠수록 위험도 ↑)
  const healthFactor = 1.0 + ((100 - health) / 100) * 0.3; // 최대 +30%

  // 9) 기울기/경사 가중치 포함한 기본 점수
  const weighted =
    0.22 * heightScore +
    0.18 * slenderScore +
    0.18 * crownScore +
    0.22 * tiltScore +
    0.20 * slopeScore;

  const factor = speciesFactor * soilFactor * rootFactor * healthFactor;

  return Math.min(100, Math.round(weighted * 100 * factor));
}

// 2) 실시간 날씨 계수
function computeWeatherFactor(weather) {
  const wind = weather?.wind_max ?? weather?.wind_avg ?? 0;
  const rain = weather?.rain_mm ?? 0;
  const snow = weather?.snow_cm ?? 0;

  let f_wind = 1.0;
  if (wind > 5) f_wind = 1.1;
  if (wind > 8) f_wind = 1.25;
  if (wind > 12) f_wind = 1.5;
  if (wind > 15) f_wind = 1.8;

  let f_rain = 1.0 + Math.min(rain / 50, 0.3);
  let f_snow = 1.0 + Math.min(snow / 20, 0.3);

  return f_wind * f_snow * f_rain;
}

// 3) 개별 수목의 실시간 전도 위험도 계산
function computeInstantRisk(tree, weather) {
  const base = computeBaseRisk(tree);
  const w = computeWeatherFactor(weather || {});
  const instant = Math.min(100, Math.round(base * w));

  let level = "LOW";
  if (instant >= 40) level = "MID";
  if (instant >= 70) level = "HIGH";

  return { base, instant, level };
}

// 4) 전체 트리에 위험도 필드 반영
function updateAllTreeRisks(treeData, weatherToday) {
  if (!Array.isArray(treeData)) return;
  const weather = weatherToday || window.LSMS_WEATHER_TODAY || null;

  treeData.forEach((tree) => {
    const { base, instant, level } = computeInstantRisk(tree, weather);
    tree.risk_base = base;
    tree.risk_instant = instant;
    tree.risk_level = level;
  });
}

// 5) 위험도 기준 TOP5 추출
function getTodayTopRisk(treeData) {
  if (!Array.isArray(treeData)) return [];
  return [...treeData]
    .map((t) => {
      let score = 0;
      if (typeof t.risk_instant === "number") score = t.risk_instant;
      else if (typeof t.risk_base === "number") score = t.risk_base;
      else if (typeof t.risk_score === "number") score = t.risk_score;
      return { tree: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// 6) TOP5 리스트 렌더링
function renderTopRiskList(treeData) {
  const container = document.getElementById("topRiskList");
  if (!container) return;

  const top = getTodayTopRisk(treeData || window.treeData || []);
  if (!top.length) {
    container.innerHTML = `<div class="top-risk-empty">오늘은 우선 점검 대상 수목이 없습니다.</div>`;
    return;
  }

  container.innerHTML = top
    .map(
      (entry, idx) => {
        const tree = entry.tree || entry;
        const score =
          typeof tree.risk_instant === "number"
            ? tree.risk_instant
            : entry.score || 0;
        return `
      <div class="top-risk-item">
        <span class="rank">${idx + 1}</span>
        <span class="id">${tree.id || "-"}</span>
        <span class="species">${tree.species || "-"}</span>
        <span class="score">${score}점</span>
      </div>
    `;
      }
    )
    .join("");
}

// 7) 대시보드 전체 위험도/마커/그래프 업데이트
function refreshRiskDashboard() {
  const data =
    (typeof getTreeData === "function" && getTreeData()) ||
    window.treeData ||
    [];
  const weather = window.LSMS_WEATHER_TODAY || null;

  updateAllTreeRisks(data, weather);

  if (typeof window.updateTreeMarkersByRisk === "function") {
    window.updateTreeMarkersByRisk(data);
  }

  if (typeof window.updateRiskChart === "function") {
    window.updateRiskChart();
  }

  renderTopRiskList(data);
}

// 전역으로 노출
window.computeBaseRisk = computeBaseRisk;
window.computeWeatherFactor = computeWeatherFactor;
window.computeInstantRisk = computeInstantRisk;
window.updateAllTreeRisks = updateAllTreeRisks;
window.updateTreeMarkers = window.updateTreeMarkersByRisk;
window.getTodayTopRisk = getTodayTopRisk;
window.refreshRiskDashboard = refreshRiskDashboard;
