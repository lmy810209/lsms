// js/indoor-auth.js

(function () {
  const raw = localStorage.getItem("lsmsUser");

  // 로그인 정보 없으면 로그인 페이지로
  if (!raw) {
    alert("로그인 정보가 없습니다.\n다시 로그인 해 주세요.");
    window.location.href = "/login.html";
    return;
  }

  let user;
  try {
    user = JSON.parse(raw);
  } catch (e) {
    console.error("lsmsUser 파싱 오류", e);
    localStorage.removeItem("lsmsUser");
    alert("로그인 정보가 올바르지 않습니다.\n다시 로그인 해 주세요.");
    window.location.href = "/login.html";
    return;
  }

  // 이 파일은 '실내' 페이지 전용임 → scope 체크
  if (user.scope !== "indoor") {
    alert("실내조경 화면은 실내조경으로 로그인한 경우에만 접속할 수 있습니다.");
    window.location.href = "/login.html";
    return;
  }

  // 다른 스크립트에서도 쓸 수 있게 전역에 저장
  window.LSMS_USER = user;

  // 화면에 사용자 정보 / 현장 표기 + 로그아웃 버튼 연결
  window.addEventListener("DOMContentLoaded", () => {
    const siteSpan = document.getElementById("lsmsSiteLabel");
    const userSpan = document.getElementById("lsmsUserLabel");
    const logoutBtn = document.getElementById("lsmsLogoutBtn");

    if (siteSpan) {
      let siteName = user.site;
      if (user.site === "yangjae") siteName = "양재 HQ";
      else if (user.site === "gangnam") siteName = "강남사옥";

      siteSpan.textContent = "현장: " + siteName;
    }

    if (userSpan) {
      const roleLabel = user.role === "admin" ? "관리자" : "작업자";
      userSpan.textContent = user.id + " · " + roleLabel;
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("lsmsUser");
        window.location.href = "/login.html";
      });
    }
  });
})();
