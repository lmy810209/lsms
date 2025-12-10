// ===== 중앙 위험 지수 그래프 (Chart.js) =====

// 차트 인스턴스 저장용
let riskChart = null;

// treeData를 이용해서 구역별 평균 위험지수 계산
function getZoneRiskSummary() {
  const data = window.treeData || [];

  const zones = {
    "사면부(A존)":  (z) => (z || "").includes("A존") || (z || "").includes("사면"),
    "도로변(B존)":  (z) => (z || "").includes("B존") || (z || "").includes("도로"),
    "광장·보행(C존)": (z) => (z || "").includes("C존") || (z || "").includes("광장") || (z || "").includes("보행"),
  };

  const labels = [];
  const values = [];

  Object.keys(zones).forEach((label) => {
    const matchFn = zones[label];
    const items = data.filter((t) => matchFn(t.zone));

    if (!items.length) {
      labels.push(label);
      values.push(0);
      return;
    }

    const sum = items.reduce((acc, t) => {
      const v = typeof t.risk_score === "number" ? t.risk_score : 0;
      return acc + v;
    }, 0);

    const avg = Math.round((sum / items.length) * 10) / 10;
    labels.push(label);
    values.push(avg);
  });

  return { labels, values };
}

function initRiskChart() {
  const canvas = document.getElementById("riskChart");
  if (!canvas) return;

  const { labels, values } = getZoneRiskSummary();

  riskChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "구역별 평균 전도 위험 지수",
          data: values,
          borderWidth: 1,   // 색상은 Chart.js 기본값 사용
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20 },
          title: { display: true, text: "위험 지수 (0~100)" },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} 점`,
          },
        },
      },
    },
  });
}

function updateRiskChart() {
  const canvas = document.getElementById("riskChart");
  if (!canvas) return;

  if (!riskChart) {
    initRiskChart();
    return;
  }

  const { labels, values } = getZoneRiskSummary();
  riskChart.data.labels = labels;
  riskChart.data.datasets[0].data = values;
  riskChart.update();
}

// 다른 JS에서 쓸 수 있게 전역으로 내보내기
window.updateRiskChart = updateRiskChart;
window.initRiskChart = initRiskChart;
