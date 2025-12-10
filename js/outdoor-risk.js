// ===== 전도 위험도 계산 및 TOP5 리스트 =====

// 1) 기본 전도 위험도 + 상세 분석 (UI 설명용)
function computeBaseRiskAnalysis(tree) {
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

  // 9) 기울기/경사 가중치 포함한 기본 점수 (0~100)
  const weighted =
    0.22 * heightScore +
    0.18 * slenderScore +
    0.18 * crownScore +
    0.22 * tiltScore +
    0.20 * slopeScore;

  const structural = weighted * 100; // 순수 형상/지형 기반 점수

  // 구성 비중을 그대로 점수화
  const contribHeight = 0.22 * heightScore * 100;
  const contribSlender = 0.18 * slenderScore * 100;
  const contribCrown = 0.18 * crownScore * 100;
  const contribTilt = 0.22 * tiltScore * 100;
  const contribSlope = 0.20 * slopeScore * 100;

  // 수종/토양/뿌리/건강 가중치가 추가로 만드는 점수 변화 추정
  const afterSpecies = structural * speciesFactor;
  const deltaSpecies = afterSpecies - structural;

  const afterSoil = afterSpecies * soilFactor;
  const deltaSoil = afterSoil - afterSpecies;

  const afterRoot = afterSoil * rootFactor;
  const deltaRoot = afterRoot - afterSoil;

  const afterHealth = afterRoot * healthFactor;
  const deltaHealth = afterHealth - afterRoot;

  const baseRaw = afterHealth;
  const base = Math.min(100, Math.round(baseRaw));

  return {
    base,
    structural: {
      total: Math.round(structural),
      height: Math.round(contribHeight),
      slender: Math.round(contribSlender),
      crown: Math.round(contribCrown),
      tilt: Math.round(contribTilt),
      slope: Math.round(contribSlope),
    },
    modifiers: {
      species: {
        label: tree.species || "-",
        delta: Math.round(deltaSpecies),
      },
      soil: {
        label: soilLabel,
        delta: Math.round(deltaSoil),
      },
      root: {
        label: rootLabel,
        delta: Math.round(deltaRoot),
      },
      health: {
        score: health,
        delta: Math.round(deltaHealth),
      },
    },
  };
}

// 기존 API는 단순 점수만 반환 (호환용)
function computeBaseRisk(tree) {
  return computeBaseRiskAnalysis(tree).base;
}

// 2) 실시간 날씨 계수 + 상세 분석
function computeWeatherFactorDetail(weather) {
  const wind = weather?.wind_max ?? weather?.wind_avg ?? 0;
  const rain = weather?.rain_mm ?? 0;
  const snow = weather?.snow_cm ?? 0;

  let f_wind = 1.0;
  if (wind > 5) f_wind = 1.1;
  if (wind > 8) f_wind = 1.25;
  if (wind > 12) f_wind = 1.5;
  if (wind > 15) f_wind = 1.8;

  const f_rain = 1.0 + Math.min(rain / 50, 0.3);
  const f_snow = 1.0 + Math.min(snow / 20, 0.3);

  return {
    factor: f_wind * f_rain * f_snow,
    wind,
    rain,
    snow,
    f_wind,
    f_rain,
    f_snow,
  };
}

function computeWeatherFactor(weather) {
  return computeWeatherFactorDetail(weather || {}).factor;
}

// 3) 개별 수목의 실시간 전도 위험도 계산 + 요인 분석 저장
function computeInstantRisk(tree, weather) {
  const baseInfo = computeBaseRiskAnalysis(tree);
  const weatherInfo = computeWeatherFactorDetail(weather || {});

  const base = baseInfo.base;
  const factor = weatherInfo.factor;
  const instantRaw = base * factor;
  const instant = Math.min(100, Math.round(instantRaw));

  let level = "LOW";
  if (instant >= 40) level = "MID";
  if (instant >= 70) level = "HIGH";

  // 날씨로 인해 추가된 점수(풍속/비/눈 별로 분해)
  const deltaWind = base * (weatherInfo.f_wind - 1);
  const deltaRain = base * weatherInfo.f_wind * (weatherInfo.f_rain - 1);
  const deltaSnow =
    base * weatherInfo.f_wind * weatherInfo.f_rain * (weatherInfo.f_snow - 1);

  const detail = {
    static: baseInfo,
    weather: {
      wind: weatherInfo.wind,
      rain_mm: weatherInfo.rain,
      snow_cm: weatherInfo.snow,
      deltaWind: Math.round(deltaWind),
      deltaRain: Math.round(deltaRain),
      deltaSnow: Math.round(deltaSnow),
      factor: weatherInfo.factor,
    },
    total: {
      base,
      instant,
      extraFromWeather: instant - base,
      level,
    },
  };

  try {
    // 저장/전송 시에는 saveTreesToServer()에서 이 필드를 제거
    tree._riskDetail = detail;
  } catch (e) {
    // 읽기 전용 객체일 수 있으므로 실패해도 무시
  }

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
      <div class="top-risk-item" data-tree-id="${tree.id || ""}">
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

// 8) TOP5 항목 클릭 시 위험도 요인 분석 모달
function openRiskExplainModal(tree) {
  if (!tree || !tree._riskDetail) return;
  const modal = document.getElementById("riskExplainModal");
  const titleEl = document.getElementById("riskExplainTitle");
  const subtitleEl = document.getElementById("riskExplainSubtitle");
  const scoreEl = document.getElementById("riskExplainScore");
  const contentEl = document.getElementById("riskExplainContent");
  if (!modal || !titleEl || !subtitleEl || !scoreEl || !contentEl) return;

  const d = tree._riskDetail;
  const staticInfo = d.static;
  const weatherInfo = d.weather;

  titleEl.textContent = `${tree.id || "-"} · ${tree.species || "-"}`;
  subtitleEl.textContent = `구역: ${tree.zone || "-"} / 현재 위험도: ${
    (d.total && d.total.level) || tree.risk_level || "-"
  }`;
  scoreEl.textContent = `${(d.total && d.total.instant) || tree.risk_instant || 0}점`;

  const s = staticInfo.structural;
  const m = staticInfo.modifiers;

  const staticItems = [];
  if (s) {
    staticItems.push({
      label: "기초 구조 점수(수고·두께·수관·기울기·경사)",
      value: s.total,
    });
    if (s.tilt) {
      staticItems.push({ label: "기울기 위험", value: s.tilt });
    }
    if (s.slope) {
      staticItems.push({ label: "사면 경사 위험", value: s.slope });
    }
  }
  if (m && m.soil && m.soil.delta) {
    staticItems.push({
      label: `토양 상태(${m.soil.label})`,
      value: m.soil.delta,
    });
  }
  if (m && m.root && m.root.delta) {
    staticItems.push({
      label: `뿌리 이상(${m.root.label})`,
      value: m.root.delta,
    });
  }

  const weatherItems = [];
  if (weatherInfo) {
    if (weatherInfo.deltaWind > 0) {
      weatherItems.push({
        label: `오늘 풍속(${weatherInfo.wind.toFixed(1)} m/s)`,
        value: weatherInfo.deltaWind,
      });
    }
    if (weatherInfo.deltaRain > 0) {
      weatherItems.push({
        label: `강수량 영향(지반 약화)`,
        value: weatherInfo.deltaRain,
      });
    }
    if (weatherInfo.deltaSnow > 0) {
      weatherItems.push({
        label: `적설/눈 영향`,
        value: weatherInfo.deltaSnow,
      });
    }
  }

  const makeListHtml = (items) => {
    if (!items.length) {
      return `<li class="risk-explain-item-empty">특이 위험 요인이 없습니다.</li>`;
    }
    return items
      .map(
        (it) =>
          `<li class="risk-explain-item"><span>${it.label}</span><span>+${
            it.value
          }점</span></li>`
      )
      .join("");
  };

  contentEl.innerHTML = `
    <div class="risk-explain-section">
      <div class="risk-explain-section-title">정적 요소 (수목·지형·토양)</div>
      <ul class="risk-explain-list">
        ${makeListHtml(staticItems)}
      </ul>
    </div>
    <div class="risk-explain-section">
      <div class="risk-explain-section-title">실시간 기상 영향</div>
      <ul class="risk-explain-list">
        ${makeListHtml(weatherItems)}
      </ul>
      <div class="risk-explain-footer">
        날씨 영향으로 추가된 위험도: <strong>${
          (d.total && d.total.extraFromWeather) || 0
        }점</strong>
      </div>
    </div>
  `;

  modal.hidden = false;
}

function closeRiskExplainModal() {
  const modal = document.getElementById("riskExplainModal");
  if (modal) modal.hidden = true;
}

// 이벤트 바인딩
document.addEventListener("click", (event) => {
  const item = event.target.closest(".top-risk-item");
  if (item) {
    const treeId = item.getAttribute("data-tree-id");
    if (!treeId) return;
    const data =
      (typeof getTreeData === "function" && getTreeData()) ||
      window.treeData ||
      [];
    const tree = Array.isArray(data)
      ? data.find((t) => t && t.id === treeId)
      : null;
    if (tree) {
      openRiskExplainModal(tree);
    }
    return;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("riskExplainModal");
  const closeBtn = document.getElementById("riskExplainClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeRiskExplainModal);
  }
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeRiskExplainModal();
      }
    });
  }
});

// 전역으로 노출
window.computeBaseRisk = computeBaseRisk;
window.computeWeatherFactor = computeWeatherFactor;
window.computeInstantRisk = computeInstantRisk;
window.updateAllTreeRisks = updateAllTreeRisks;
window.updateTreeMarkers = window.updateTreeMarkersByRisk;
window.getTodayTopRisk = getTodayTopRisk;
window.refreshRiskDashboard = refreshRiskDashboard;
