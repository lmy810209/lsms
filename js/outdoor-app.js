// ===== LSMS OUTDOOR · 앱 초기 구동 스크립트 =====

// 현재 접속자 권한
// 'admin' | 'worker' | 'guest' 로 사용할 수 있음
let CURRENT_USER_ROLE = "guest";

// 간단한 OUTDOOR 전용 로그인/권한 체크
// - localStorage.lsmsUser 를 읽어서 scope === "outdoor" 인지 확인
// - 없거나 잘못된 경우 포털(/index.html)로 돌려보냄
(function initOutdoorAuth() {
  let raw = null;
  try {
    raw = window.localStorage.getItem("lsmsUser");
  } catch (e) {
    console.warn("localStorage 접근 오류:", e);
  }

  if (!raw) {
    alert("로그인 정보가 없습니다.\n포털 화면에서 다시 로그인해 주세요.");
    window.location.href = "/index.html";
    return;
  }

  let user = null;
  try {
    user = JSON.parse(raw);
  } catch (e) {
    console.error("lsmsUser JSON 파싱 오류:", e);
    window.localStorage.removeItem("lsmsUser");
    alert("로그인 정보가 손상되었습니다.\n포털 화면에서 다시 로그인해 주세요.");
    window.location.href = "/index.html";
    return;
  }

  if (user.scope && user.scope !== "outdoor") {
    alert("실외조경 화면은 '실외조경'으로 로그인한 경우에만 접속할 수 있습니다.");
    window.location.href = "/index.html";
    return;
  }

  // 전역에서 참고할 수 있게 저장
  window.LSMS_USER = user;
  CURRENT_USER_ROLE = user.role || "guest";

  // OUTDOOR 상태 모듈에도 현재 권한을 전달 (있을 경우)
  if (window.LSMS && window.LSMS.outdoor) {
    window.LSMS.outdoor.userRole = CURRENT_USER_ROLE;
  }

  window.addEventListener("DOMContentLoaded", () => {
    // 상단 상태 표시 업데이트
    const userLabel = document.getElementById("outdoorUserLabel");
    const siteLabel = document.getElementById("outdoorSiteLabel");
    const logoutBtn = document.getElementById("outdoorLogoutBtn");
    const navAdmin = document.getElementById("navAdminUsers");

    if (userLabel) {
      const roleLabel =
        user.role === "admin"
          ? "관리자"
          : user.role === "worker"
          ? "작업자"
          : "사용자";
      userLabel.textContent = `${user.id} (${roleLabel})`;
    }

    if (siteLabel) {
      const siteMap = {
        yangjae: "양재 HQ",
        gangnam: "강남사옥",
        future: "미래 사업장",
      };
      siteLabel.textContent = siteMap[user.site] || "현장 미지정";
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try {
          window.localStorage.removeItem("lsmsUser");
        } catch (e) {
          console.error("localStorage 제거 오류:", e);
        }
        window.location.href = "/index.html";
      });
    }

    // 관리자 전용 메뉴 표시
    if (navAdmin) {
      if (CURRENT_USER_ROLE === "admin") {
        navAdmin.style.display = "";
      } else {
        navAdmin.style.display = "none";
      }
    }
  });
})();

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
