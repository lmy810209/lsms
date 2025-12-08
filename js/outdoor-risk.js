// LSMS 두뇌 서버에 전도 위험 계산 요청
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
