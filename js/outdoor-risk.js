// ===== 전도 위험 계산 / TOP5 모듈 =====

// 공통 유틸
function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

// 수종 → 낙엽/상록 추정 (초기 버전: 필요 시 테이블 보완)
function inferDeciduous(species) {
  if (!species) return true;
  const evergreenKeywords = ["소나무", "회양목", "향나무", "측백", "주목"];
  if (evergreenKeywords.some((k) => species.includes(k))) return false;
  return true; // 나머지는 기본적으로 낙엽으로 처리
}

/**
 * 단일 수목 전도 위험 계산
 * - tree: treeData 항목 1개
 * - weatherOverride: { wind_max, rain_3d, snow_cm, month } 형태로 기상값만 덮어쓰기용
 */
function computeTreeRisk(tree, weatherOverride) {
  if (!tree) return tree;

  const weather = weatherOverride || window.LSMS_WEATHER_TODAY || {
    wind_avg: 3.0,
    wind_max: 6.0,
    rain_3d: 0.0,
    snow_cm: 0.0,
    month: new Date().getMonth() + 1,
  };

  const type = tree.type || "";
  const height = Number(tree.height || 0);

  // 1단계 – 전도 위험 계산 대상 필터
  if (!(type === "교목" && height >= 5.0)) {
    tree.risk_base = 0;
    tree.risk_weather = 0;
    tree.risk_instant = 0;
    tree.risk_score = 0;
    tree.risk_level = "LOW";
    tree._risk_detail = null;
    return tree;
  }

  const dbh = Number(tree.dbh || 0);
  const crownWidth = Number(tree.crown || tree.crown_width || 0);
  const slopeDeg = Number(tree.slope || tree.slope_deg || 0);
  const tiltDeg = Number(tree.tilt || tree.tilt_deg || 0);
  const soil = tree.soil_stability || "보통";
  const rootIssue = tree.root_issue || "없음";

  // === 2단계 – 기본 구조 위험도 (수고·수관·경사·기울기·토양·뿌리) ===
  let base = 0;
  const baseItems = [];

  // (1) 키/수관 크기
  let delta = 0;
  if (height >= 5 && height < 8) delta = 10;
  else if (height >= 8 && height < 12) delta = 20;
  else if (height >= 12) delta = 30;
  base += delta;
  if (delta) baseItems.push({ label: `수고 ${height}m`, score: delta });

  delta = 0;
  if (crownWidth >= 4 && crownWidth < 6) delta = 10;
  else if (crownWidth >= 6) delta = 15;
  base += delta;
  if (delta) baseItems.push({ label: `수관폭 ${crownWidth}m`, score: delta });

  delta = 0;
  if (dbh >= 30 && dbh < 50) delta = 5;
  else if (dbh >= 50) delta = 10;
  base += delta;
  if (delta) baseItems.push({ label: `흉고직경 ${dbh}cm`, score: delta });

  // (2) 지반 경사 / 수목 기울기
  delta = 0;
  if (slopeDeg >= 5 && slopeDeg < 15) delta = 10;
  else if (slopeDeg >= 15 && slopeDeg < 30) delta = 20;
  else if (slopeDeg >= 30) delta = 30;
  base += delta;
  if (delta) baseItems.push({ label: `지반 경사 ${slopeDeg}°`, score: delta });

  delta = 0;
  if (tiltDeg >= 5 && tiltDeg < 10) delta = 10;
  else if (tiltDeg >= 10 && tiltDeg < 20) delta = 20;
  else if (tiltDeg >= 20) delta = 30;
  base += delta;
  if (delta) baseItems.push({ label: `수목 기울기 ${tiltDeg}°`, score: delta });

  // (3) 토양 상태 / 뿌리 이상
  delta = 0;
  if (soil === "보통") delta = 10;
  else if (soil === "연약함") delta = 20;
  base += delta;
  if (delta) baseItems.push({ label: `토양 상태 ${soil}`, score: delta });

  delta = 0;
  if (rootIssue === "약간") delta = 10;
  else if (rootIssue === "심함") delta = 25;
  base += delta;
  if (delta) baseItems.push({ label: `뿌리 이상 ${rootIssue}`, score: delta });

  const riskBase = clamp(base, 0, 100);

  // === 3단계 – 기상 가중치 ===
  const v = Number(weather.wind_max || 0);
  const r = Number(weather.rain_3d || 0);
  const s = Number(weather.snow_cm || 0);
  const m = Number(weather.month || new Date().getMonth() + 1);

  const isDeciduous =
    typeof tree.deciduous === "boolean"
      ? tree.deciduous
      : inferDeciduous(tree.species || "");
  tree.deciduous = isDeciduous;

  // (A) 풍속 영향
  let w_wind = 0;
  if (v < 7) w_wind = 0;
  else if (v < 10) w_wind = 5;
  else if (v < 15) w_wind = 10;
  else if (v < 20) w_wind = 20;
  else w_wind = 30;

  let wind_factor = 1.0;
  const leafOn = m >= 4 && m <= 10;
  if (!isDeciduous) {
    wind_factor = 1.3;
  } else {
    wind_factor = leafOn ? 1.1 : 0.3;
  }
  const w_wind_adj = Math.round(w_wind * wind_factor);

  // (B) 강우 영향
  let w_rain = 0;
  if (r < 50) w_rain = 0;
  else if (r < 100) w_rain = 10;
  else w_rain = 20;

  let rain_factor = 1.0;
  if (soil === "연약함") rain_factor += 0.5;
  if (slopeDeg >= 15) rain_factor += 0.5;
  const w_rain_adj = Math.round(w_rain * rain_factor);

  // (C) 적설 영향
  let w_snow = 0;
  if (s < 5) w_snow = 0;
  else if (s < 15) w_snow = 10;
  else w_snow = 20;

  let snow_factor = 1.0;
  if (!isDeciduous) {
    snow_factor = 1.2;
  } else {
    const leafOnSnow = m >= 4 && m <= 10;
    snow_factor = leafOnSnow ? 0.8 : 0.2;
  }
  const w_snow_adj = Math.round(w_snow * snow_factor);

  const riskWeather = clamp(w_wind_adj + w_rain_adj + w_snow_adj, 0, 100);

  // === 4단계 – 최종 실시간 위험도 및 등급 ===
  const riskInstant = clamp(riskBase + riskWeather, 0, 100);

  let level = "LOW";
  if (riskInstant >= 60) level = "HIGH";
  else if (riskInstant >= 30) level = "MID";

  tree.risk_base = riskBase;
  tree.risk_weather = riskWeather;
  tree.risk_instant = riskInstant;
  tree.risk_score = riskInstant;
  tree.risk_level = level;

  tree._risk_detail = {
    base: {
      total: riskBase,
      items: baseItems,
    },
    weather: {
      total: riskWeather,
      wind: { raw: w_wind, factor: wind_factor, score: w_wind_adj, v },
      rain: { raw: w_rain, factor: rain_factor, score: w_rain_adj, r },
      snow: { raw: w_snow, factor: snow_factor, score: w_snow_adj, s },
      meta: { month: m, isDeciduous, leafOn },
    },
    instant: {
      total: riskInstant,
      level,
    },
  };

  return tree;
}

// 전체 treeData에 대해 위험도 재계산
function recalcAllTreeRisks() {
  if (!Array.isArray(window.treeData)) return;
  window.treeData.forEach((t, idx) => {
    window.treeData[idx] = computeTreeRisk(t);
  });
}

// TOP5 렌더링 (전도 경보판)
function renderRiskTop5() {
  const listEl = document.getElementById("riskTop5List");
  const emptyEl = document.getElementById("riskTop5Empty");
  if (!listEl || !emptyEl || !Array.isArray(window.treeData)) return;

  const candidates = window.treeData.filter(
    (t) => t.risk_level === "HIGH" && typeof t.risk_instant === "number"
  );
  const sorted = candidates.sort(
    (a, b) => (b.risk_instant || 0) - (a.risk_instant || 0)
  );
  const top5 = sorted.slice(0, 5);

  listEl.innerHTML = "";

  if (!top5.length) {
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  top5.forEach((tree, idx) => {
    const row = document.createElement("div");
    row.className = "risk-top5-row";
    row.dataset.treeId = tree.id;

    row.innerHTML = `
      <div class="risk-top5-rank">${idx + 1}</div>
      <div class="risk-top5-main">
        <div class="risk-top5-id">${tree.id}</div>
        <div class="risk-top5-species">${tree.species || "-"}</div>
      </div>
      <div class="risk-top5-score">${Math.round(tree.risk_instant ?? 0)}점</div>
    `;

    row.addEventListener("click", () => {
      showRiskDetailPopup(tree);
    });

    row.classList.add(`risk-level-${(tree.risk_level || "low").toLowerCase()}`);

    listEl.appendChild(row);
  });
}

// 분석 팝업
function showRiskDetailPopup(tree) {
  const detail = tree._risk_detail;
  if (!detail) {
    alert("위험도 계산 정보가 없습니다.");
    return;
  }

  const lines = [];
  lines.push(
    `${tree.id} · ${tree.species || ""} (${tree.zone || "-"}) – 현재 위험도: ${
      detail.instant.total
    }점 (${detail.instant.level})`
  );
  lines.push("");
  lines.push("【기본 구조 위험도 (수목·지형 요인)】");
  detail.base.items.forEach((it) => {
    lines.push(`${it.label} → +${it.score}점`);
  });
  lines.push(`→ 구조 위험도 합계: ${detail.base.total}점`);
  lines.push("");
  lines.push("【실시간 기상 영향】`);

  const w = detail.weather;
  lines.push(
    `최대 풍속 ${w.wind.v}m/s (계수 ${w.wind.factor}) → +${w.wind.score}점`
  );
  lines.push(
    `최근 3일 누적 강우량 ${w.rain.r}mm (계수 ${w.rain.factor}) → +${w.rain.score}점`
  );
  lines.push(
    `적설 ${w.snow.s}cm (계수 ${w.snow.factor}) → +${w.snow.score}점`
  );
  lines.push(`→ 기상 영향 합계: ${w.total}점`);
  lines.push("");
  lines.push("【최종 실시간 위험도】");
  lines.push(
    `구조 위험도 ${detail.base.total}점 + 기상 영향 ${w.total}점 = ${
      detail.instant.total
    }점 (상한 100점 기준)`
  );

  alert(lines.join("\n"));
}

// 전역 노출
window.computeTreeRisk = computeTreeRisk;
window.recalcAllTreeRisks = recalcAllTreeRisks;
window.renderRiskTop5 = renderRiskTop5;

// ===== 디버깅용 전도 위험 테스트 함수 =====
// 사용 예시:
//   testRisk("YA-001");
//   testRisk("YA-001", { wind_max: 15, rain_3d: 80, snow_cm: 0, month: 7 });
window.testRisk = function (treeId, overrideWeatherRaw) {
  try {
    if (!Array.isArray(window.treeData)) {
      console.error("[testRisk] window.treeData가 없습니다.");
      return;
    }

    const tree = window.treeData.find((t) => t.id === treeId);
    if (!tree) {
      console.error("[testRisk] 해당 ID의 수목을 찾을 수 없습니다:", treeId);
      return;
    }

    // overrideWeatherRaw → 내부 computeTreeRisk 형식으로 변환
    let weatherOverride;
    if (overrideWeatherRaw && typeof overrideWeatherRaw === "object") {
      weatherOverride = {
        wind_max:
          overrideWeatherRaw.wind_max ??
          overrideWeatherRaw.wind ??
          undefined,
        rain_3d:
          overrideWeatherRaw.rain_3d ??
          overrideWeatherRaw.rain_mm ??
          undefined,
        snow_cm:
          overrideWeatherRaw.snow_cm ??
          overrideWeatherRaw.snow ??
          undefined,
        month: overrideWeatherRaw.month,
      };
    }

    const cloned = JSON.parse(JSON.stringify(tree));
    const result = computeTreeRisk(cloned, weatherOverride);

    console.log("risk_base ▶", result.risk_base);
    console.log("risk_weather ▶", result.risk_weather);
    console.log("risk_instant ▶", {
      score: result.risk_instant,
      level: result.risk_level,
    });

    return result;
  } catch (err) {
    console.error("[testRisk] 실행 중 오류 발생:", err);
  }
};

// ===== LSMS 두뇌 서버 전도 위험 테스트 (기존 기능 유지) =====
async function requestRiskFromCore(angle, slope, wind) {
  const params = new URLSearchParams({
    angle: String(angle),
    slope: String(slope),
    wind: String(wind),
  });

  const url = `http://127.0.0.1:5001/api/risk?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("AI 서버 호출 실패 (status " + res.status + ")");
  }
  return res.json();
}

// 페이지 로드 후 버튼 이벤트 연결
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRiskTest");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const angle = Number(document.getElementById("inputAngle")?.value || 0);
    const slope = Number(document.getElementById("inputSlope")?.value || 0);
    const wind = Number(document.getElementById("inputWind")?.value || 0);
    const box = document.getElementById("riskTestResult");

    if (box) box.textContent = "계산 중...";

    try {
      const data = await requestRiskFromCore(angle, slope, wind);
      if (!box) return;
      box.textContent = `점수: ${data.score}, 등급: ${data.level}`;
    } catch (err) {
      console.error(err);
      if (box) box.textContent = "서버 오류: " + err.message;
    }
  });
});