// ===== 중앙 위험 지수 그래프 (Chart.js) =====

// 차트 인스턴스 저장용
let riskChart = null;
let diseaseChart = null;

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
      let v = 0;
      if (typeof t.risk_instant === "number") {
        v = t.risk_instant;
      } else if (typeof t.risk_base === "number") {
        v = t.risk_base;
      } else if (typeof t.risk_score === "number") {
        v = t.risk_score;
      }
      return acc + v;
    }, 0);

    const avg = Math.round((sum / items.length) * 10) / 10;
    labels.push(label);
    values.push(avg);
  });

  return { labels, values };
}

// 병해충 의심 수목 요약 (구역별 의심 개체 수)
function getDiseaseSummary() {
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
    const items = data.filter(
      (t) => matchFn(t.zone) && t.disease && t.disease.has_issue
    );
    labels.push(label);
    values.push(items.length);
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

   // 전도 위험 차트 갱신 시 병해충 차트도 함께 갱신
   updateDiseaseChart();
}

function initDiseaseChart() {
  const canvas = document.getElementById("diseaseChart");
  if (!canvas) return;

  const { labels, values } = getDiseaseSummary();

  diseaseChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "구역별 병해충·수세 이상 의심 수목 수",
          data: values,
          backgroundColor: "#f97316",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          title: { display: true, text: "의심 개체 수(본)" },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: { font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} 본`,
          },
        },
      },
    },
  });
}

function updateDiseaseChart() {
  const canvas = document.getElementById("diseaseChart");
  if (!canvas) return;

  if (!diseaseChart) {
    initDiseaseChart();
    return;
  }

  const { labels, values } = getDiseaseSummary();
  diseaseChart.data.labels = labels;
  diseaseChart.data.datasets[0].data = values;
  diseaseChart.update();
}

// 다른 JS에서 쓸 수 있게 전역으로 내보내기
window.updateRiskChart = updateRiskChart;
window.initRiskChart = initRiskChart;
window.updateDiseaseChart = updateDiseaseChart;
window.initDiseaseChart = initDiseaseChart;
