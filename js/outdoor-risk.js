// ===== OUTDOOR RISK · 임시 초기화 버전 =====

console.log("OUTDOOR RISK JS LOADED (stub)");

// 디버깅용 stub — 나중에 실제 로직으로 교체 예정
window.testRisk = function testRiskStub(treeId, overrideWeather) {
  console.log("[testRisk stub]", { treeId, overrideWeather });
  return { ok: true, treeId, overrideWeather };
};