document.addEventListener("DOMContentLoaded", async () => {

  async function loadData() {
    const res = await fetch("./data/indoor-data.json");
    return await res.json();
  }

  const data = await loadData();

  // -------------------------------
  // 1) 상단 요약 카드 자동 계산
  // -------------------------------

  // 전체 식물 수
  const totalPlants = data.plants.reduce((sum, p) => sum + p.count, 0);
  document.getElementById("stat-plants").innerText = totalPlants;

  // 오늘 작업 수 / 완료율 계산
  const today = "2025-12-08";
  const todayTasks = data.tasks.filter(t => t.date === today);
  const completedToday = todayTasks.filter(t => t.status === "completed").length;

  document.getElementById("stat-today-tasks").innerText = todayTasks.length;
  document.getElementById("stat-completion").innerText =
    (todayTasks.length === 0 ? 0 : Math.round((completedToday / todayTasks.length) * 100)) + "%";

  // 활동 작업자
  const activeWorkers = data.workers.filter(w => w.last_work >= "2025-12-06");
  document.getElementById("stat-workers").innerText = activeWorkers.length;

  // 미완료 작업
  const uncompleted = data.tasks.filter(t => t.status !== "completed").length;
  document.getElementById("stat-uncompleted").innerText = uncompleted;

  // 급수 기록 수
  document.getElementById("stat-watering").innerText = data.watering.length;

  // 센서 수 (추후 확장)
  document.getElementById("stat-sensors").innerText = 0;


  // -------------------------------
  // 2) 그래프 자동 생성
  // -------------------------------

  // 주간 작업 완료/미완료
  const last7 = data.tasks.slice(-7);
  const weeklyCompleted = last7.filter(t => t.status === "completed").length;
  const weeklyPending = last7.filter(t => t.status !== "completed").length;

  new Chart(document.getElementById("weeklyTasksChart"), {
    type: "doughnut",
    data: {
      labels: ["완료", "미완료"],
      datasets: [{
        data: [weeklyCompleted, weeklyPending],
        backgroundColor: ["#4ade80", "#e5e7eb"]
      }]
    },
    options: { cutout: "60%", plugins: { legend: { position: "bottom" } } }
  });

  // 월간 작업 추이 (주차별 완료 수)
  const weekData = [
    data.tasks.filter(t => t.date >= "2025-12-01" && t.date < "2025-12-08").filter(t => t.status === "completed").length,
    3, 4, 5 // 샘플
  ];

  new Chart(document.getElementById("monthlyTasksChart"), {
    type: "line",
    data: {
      labels: ["1주", "2주", "3주", "4주"],
      datasets: [{
        label: "완료 작업 수",
        data: weekData,
        borderWidth: 2,
        tension: 0.3
      }]
    }
  });

});
