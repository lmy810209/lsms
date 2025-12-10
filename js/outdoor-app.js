// ===== LSMS OUTDOOR · 앱 초기 구동 스크립트 =====

// 현재 접속자 권한 (임시 설정)
// 'admin' | 'worker' | 'guest' 로 사용할 수 있음
const CURRENT_USER_ROLE = 'admin';

// DOM이 모두 준비되면 실행
window.addEventListener("DOMContentLoaded", () => {
  // 1) 지도 초기화 (map.js 안에 있음)
  if (typeof mapInit === "function") {
    mapInit();
  }

  // 2) 수목 리스트 / 추가 / 삭제 시스템 초기화 (trees.js 안에 있음)
  if (typeof treesInit === "function") {
    treesInit();
  }

  // 3) 날씨 패널 초기화 (weather.js 안에 있음)
  if (typeof weatherInit === "function") {
    weatherInit();
  }

  // 4) 서버에 저장된 수목 데이터가 있으면 불러와서 교체
  //    (없으면 기본 treeData 그대로 사용)
  //    → loadTreesFromServer() 안에서 renderTrees()가 호출되고,
  //       거기서 그래프(updateRiskChart)까지 같이 갱신됨.
  if (typeof loadTreesFromServer === "function") {
    loadTreesFromServer();
  } else {
    // 혹시 서버 기능이 없는 환경(로컬 테스트 등)에서는
    // 기본 treeData로 그래프 한 번 그려주기
    if (typeof window.updateRiskChart === "function") {
      window.updateRiskChart();
    }
  }
});
