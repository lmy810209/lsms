// LSMS INDOOR 전용 스크립트

document.addEventListener("DOMContentLoaded", () => {
  // ===== 모바일 햄버거 버튼으로 사이드바 열기/닫기 (실외 코드 재사용) =====
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    function openSidebar() {
      sidebar.classList.add("sidebar-open");
      overlay.classList.add("active");
    }

    function closeSidebar() {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
    }

    menuBtn.addEventListener("click", () => {
      if (sidebar.classList.contains("sidebar-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    overlay.addEventListener("click", closeSidebar);
  }

  // ===== Chart.js – 실내 대시보드 그래프 =====
  const weeklyCanvas = document.getElementById("weeklyTasksChart");
  if (weeklyCanvas) {
    const weeklyCtx = weeklyCanvas.getContext("2d");
    new Chart(weeklyCtx, {
      type: "doughnut",
      data: {
        labels: ["완료", "미완료"],
        datasets: [{
          data: [3, 7],
          backgroundColor: ["#facc15", "#e5e7eb"]
        }]
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 14, font: { size: 11 } }
          }
        },
        cutout: "65%"
      }
    });
  }

  const monthlyCanvas = document.getElementById("monthlyTasksChart");
  if (monthlyCanvas) {
    const monthlyCtx = monthlyCanvas.getContext("2d");
    new Chart(monthlyCtx, {
      type: "line",
      data: {
        labels: ["1주", "2주", "3주", "4주"],
        datasets: [{
          label: "완료된 작업",
          data: [5, 9, 7, 12],
          tension: 0.35,
          fill: false
        }]
      },
      options: {
        plugins: {
          legend: {
            display: true,
            labels: { font: { size: 11 } }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2, font: { size: 11 } }
          }
        }
      }
    });
  }
});
