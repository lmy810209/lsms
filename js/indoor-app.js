document.addEventListener("DOMContentLoaded", () => {
  // ===== 1. 모바일 사이드바 토글 (실외랑 동일) =====
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    const openSidebar = () => {
      sidebar.classList.add("sidebar-open");
      overlay.classList.add("active");
    };
    const closeSidebar = () => {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
    };

    menuBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("sidebar-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    overlay.addEventListener("click", closeSidebar);
  }

  // ===== 2. 데이터 로드 + 대시보드 초기화 =====
  (async function initDashboard() {
    try {
      const data = await loadIndoorData();

      updateSummaryCards(data);
      initCharts(data);
      renderFloorPanel(data);

    } catch (err) {
      console.error("LSMS INDOOR 데이터 로드 오류:", err);
    }
  })();
});

// ---------------------- 공통: 데이터 로드 ----------------------
async function loadIndoorData() {
  const res = await fetch("./data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json 불러오기 실패");
  return await res.json();
}

// ---------------------- 3. 상단 카드 자동 계산 ----------------------
function updateSummaryCards(data) {
  // 전체 식물 개체 수
  const totalPlants = data.plants.reduce((sum, p) => sum + (p.count || 0), 0);
  setText("stat-plants", totalPlants);

  // 오늘 날짜 (샘플용으로 고정값 사용)
  const today = "2025-12-08";

  const todayTasks = data.tasks.filter(t => t.date === today);
  const completedToday = todayTasks.filter(t => t.status === "completed").length;

  setText("stat-today-tasks", todayTasks.length);

  const completion =
    todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100);
  setText("stat-completion", completion + "%");

  // 활동 작업자 (최근 3일 기준)
  const activeWorkers = data.workers.filter(w => w.last_work >= "2025-12-06");
  setText("stat-workers", activeWorkers.length);

  // 미완료 작업 (상태가 completed가 아닌 것)
  const uncompleted = data.tasks.filter(t => t.status !== "completed").length;
  setText("stat-uncompleted", uncompleted);

  // 급수 기록 수
  setText("stat-watering", data.watering.length);

  // 센서 수 (아직 없음 → 0)
  setText("stat-sensors", 0);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ---------------------- 4. 그래프 (Chart.js) ----------------------
function initCharts(data) {
  const weeklyCanvas = document.getElementById("weeklyTasksChart");
  const monthlyCanvas = document.getElementById("monthlyTasksChart");

  // 4-1) 주간 작업 완료/미완료 도넛
  if (weeklyCanvas && window.Chart) {
    const last7Tasks = data.tasks.slice(-7); // 샘플: 마지막 7개
    const weeklyCompleted = last7Tasks.filter(t => t.status === "completed").length;
    const weeklyPending = last7Tasks.filter(t => t.status !== "completed").length;

    new Chart(weeklyCanvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: ["완료", "미완료"],
        datasets: [{
          data: [weeklyCompleted, weeklyPending],
          backgroundColor: ["#4ade80", "#e5e7eb"]
        }]
      },
      options: {
        cutout: "60%",
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
  }

  // 4-2) 월간 작업 추이 (간단 샘플)
  if (monthlyCanvas && window.Chart) {
    // 12월 1주차 완료 작업 수만 실제 계산, 나머지는 샘플 값
    const week1Done = data.tasks
      .filter(t => t.date >= "2025-12-01" && t.date < "2025-12-08")
      .filter(t => t.status === "completed").length;

    const weekData = [week1Done, 3, 4, 5];

    new Chart(monthlyCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: ["1주", "2주", "3주", "4주"],
        datasets: [{
          label: "완료 작업 수",
          data: weekData,
          borderWidth: 2,
          tension: 0.3
        }]
      },
      options: {
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: { ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
  }
}

// ---------------------- 5. 오른쪽 층별 패널 자동 생성 ----------------------
function renderFloorPanel(data) {
  const listEl = document.getElementById("floorList");
  const titleEl = document.getElementById("floorTitle");
  const metaEl = document.getElementById("floorMeta");
  if (!listEl) return;

  // building-floor 조합별로 플랜터/식물/최근 급수 집계
  const floorMap = {};

  data.planters.forEach(pl => {
    const zone = data.zones.find(z => z.id === pl.zone);
    if (!zone) return;

    const key = `${zone.building}-${zone.floor}`;
    if (!floorMap[key]) {
      floorMap[key] = {
        building: zone.building,
        floor: zone.floor,
        planters: 0,
        plants: 0,
        lastWater: null
      };
    }

    // 플랜터 수
    floorMap[key].planters += 1;

    // 식물 개체 수
    const plantsIn = data.plants.filter(p => p.planter === pl.id);
    const plantCount = plantsIn.reduce((sum, p) => sum + (p.count || 0), 0);
    floorMap[key].plants += plantCount;

    // 최근 급수일
    const waters = data.watering.filter(w => w.planter === pl.id);
    waters.forEach(w => {
      if (!floorMap[key].lastWater || w.date > floorMap[key].lastWater) {
        floorMap[key].lastWater = w.date;
      }
    });
  });

  // 리스트 비우고 다시 채우기
  listEl.innerHTML = "";

  const floorList = Object.values(floorMap).sort((a, b) => {
    if (a.building === b.building) return a.floor - b.floor;
    return a.building.localeCompare(b.building);
  });

  floorList.forEach(f => {
    const buildingLabel =
      f.building === "west" ? "서관" :
      f.building === "east" ? "동관" :
      "아트리움";

    const row = document.createElement("div");
    row.className = "forecast-row";
    row.innerHTML = `
      <div class="forecast-day">${buildingLabel} ${f.floor}F</div>
      <div class="forecast-meta">플랜터 ${f.planters}개 · 식물 ${f.plants}개체</div>
      <div class="forecast-temp">
        ${f.lastWater ? `최근 급수 ${f.lastWater}` : "급수 기록 없음"}
      </div>
    `;

    // 클릭하면 상단 요약 텍스트 변경
    row.addEventListener("click", () => {
      if (titleEl) {
        titleEl.textContent = `${buildingLabel} ${f.floor}F 현황`;
      }
      if (metaEl) {
        metaEl.textContent =
          `플랜터 ${f.planters}개, 식물 ${f.plants}개체 · ` +
          (f.lastWater ? `최근 급수 ${f.lastWater}` : "급수 기록 없음");
      }
    });

    listEl.appendChild(row);
  });
}
