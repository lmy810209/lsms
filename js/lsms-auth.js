// js/lsms-auth.js
// 공통 로그인/인증 & 헤더 표시/로그아웃 처리
// - localStorage.lsmsUser 구조는 그대로 사용
// - URL 또는 data-scope 로 페이지의 요구 scope(indoor|outdoor)를 판별
// - 인증 실패 시 포털(/index.html)로 리다이렉트

(function () {
  function goLogin() {
    window.location.href = "/index.html";
  }

  let raw = null;
  try {
    raw = window.localStorage.getItem("lsmsUser");
  } catch (e) {
    console.warn("lsms-auth: localStorage 접근 오류", e);
  }

  if (!raw) {
    alert("로그인 정보가 없습니다.\n포털 화면에서 다시 로그인해 주세요.");
    goLogin();
    return;
  }

  let user;
  try {
    user = JSON.parse(raw);
  } catch (e) {
    console.error("lsms-auth: lsmsUser JSON 파싱 오류", e);
    try {
      window.localStorage.removeItem("lsmsUser");
    } catch (err) {
      console.error("lsms-auth: localStorage 정리 실패", err);
    }
    alert("로그인 정보가 올바르지 않습니다.\n포털 화면에서 다시 로그인해 주세요.");
    goLogin();
    return;
  }

  // 페이지 요구 scope 판단 (HTML data-scope 우선, 없으면 URL로 추론)
  const htmlScope = document.documentElement.dataset.scope;
  let requiredScope = htmlScope || null;

  if (!requiredScope) {
    const path = window.location.pathname || "";
    if (path.startsWith("/indoor/")) requiredScope = "indoor";
    else if (path.startsWith("/outdoor/")) requiredScope = "outdoor";
  }

  if (requiredScope && user.scope && user.scope !== requiredScope) {
    const label =
      requiredScope === "indoor"
        ? "실내조경"
        : requiredScope === "outdoor"
        ? "실외조경"
        : requiredScope;
    alert(
      `${label} 화면은 '${label}'으로 로그인한 경우에만 접속할 수 있습니다.\n포털 화면에서 다시 로그인해 주세요.`
    );
    goLogin();
    return;
  }

  // 전역으로 노출
  window.LSMS_USER = user;
  window.CURRENT_USER_ROLE = user.role || "guest";

  // OUTDOOR 상태 모듈이 있으면 권한 전달
  if (window.LSMS && window.LSMS.outdoor) {
    window.LSMS.outdoor.userRole = window.CURRENT_USER_ROLE;
  }

  // 공통 헤더/로그아웃 버튼 처리
  window.addEventListener("DOMContentLoaded", () => {
    const userSpan =
      document.getElementById("lsmsUserLabel") ||
      document.getElementById("outdoorUserLabel") ||
      document.getElementById("adminUserLabel");

    const siteSpan =
      document.getElementById("lsmsSiteLabel") ||
      document.getElementById("outdoorSiteLabel");

    const logoutBtn =
      document.getElementById("lsmsLogoutBtn") ||
      document.getElementById("outdoorLogoutBtn");

    if (userSpan) {
      const roleLabel =
        user.role === "admin"
          ? "관리자"
          : user.role === "worker"
          ? "작업자"
          : "사용자";
      userSpan.textContent = `${user.id} (${roleLabel})`;
    }

    if (siteSpan) {
      const siteMap = {
        yangjae: "양재 HQ",
        gangnam: "강남사옥",
        future: "미래 사업장",
      };
      siteSpan.textContent = siteMap[user.site] || "현장 미지정";
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        try {
          window.localStorage.removeItem("lsmsUser");
        } catch (e) {
          console.error("lsms-auth: localStorage 제거 오류", e);
        }
        goLogin();
      });
    }
  });
})();
