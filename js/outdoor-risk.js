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

  const speciesFactor =
    {
      "소나무": 1.1,
      "은행나무": 0.8,
      "느티나무": 1.0,
    }[tree.species] || 1.0;

  const weighted =
    0.25 * heightScore +
    0.2 * slenderScore +
    0.2 * crownScore +
    0.2 * tiltScore +
    0.15 * slopeScore;

  return Math.min(100, Math.round(weighted * 100 * speciesFactor));
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
