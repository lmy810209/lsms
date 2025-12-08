// /js/indoor-auth.js

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("loginStatus");   // 상단 상태 배지
  const siteEl   = document.getElementById("currentSite");   // "현장: xxx" 표시
  const logoutBtn = document.getElementById("logoutBtn");    // 로그아웃 버튼

  // 항상 로그아웃 버튼에는 기능을 달아준다 (로그인 정보가 없어도 동작)
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem("lsmsUser");
      } catch (e) {
        console.error("localStorage 제거 오류:", e);
      }
      window.location.href = "/login.html";
    });
  }

  // localStorage 에서 로그인 정보 읽기
  let raw = null;
  try {
    raw = localStorage.getItem("lsmsUser");
  } catch (e) {
    console.error("localStorage 읽기 오류:", e);
  }

  // 로그인 정보가 아예 없을 때
  if (!raw) {
    if (statusEl) {
      statusEl.textContent = "로그인 정보 없음";
      statusEl.classList.remove("status-badge-ok");
      statusEl.classList.add("status-badge-warn");
    }
    if (siteEl) {
      siteEl.textContent = "-";
    }
    // 여기서는 그냥 정보만 보여주고, 필요하면 사용자가 직접 로그아웃 버튼 눌러서 login.html로 이동
    return;
  }

  // JSON 파싱
  let user = null;
  try {
    user = JSON.parse(raw);
  } catch (e) {
    console.error("lsmsUser JSON 파싱 오류:", e);
    // 깨진 데이터면 지우고 로그인 페이지로 보낸다
    try {
      localStorage.removeItem("lsmsUser");
    } catch (_) {}
    if (statusEl) {
      statusEl.textContent = "로그인 정보 오류";
      statusEl.classList.remove("status-badge-ok");
      statusEl.classList.add("status-badge-warn");
    }
    if (siteEl) siteEl.textContent = "-";
    return;
  }

  // 실내 페이지인데 실외로 로그인한 경우 방어(원하면 빼도 됨)
  if (user.scope && user.scope !== "indoor") {
    alert("실내조경이 아닌 구역으로 로그인되어 있습니다.\n다시 로그인해 주세요.");
    try {
      localStorage.removeItem("lsmsUser");
    } catch (_) {}
    window.location.href = "/login.html";
    return;
  }

  // 정상적으로 로그인 정보가 있을 때 표시
  if (statusEl) {
    const roleLabel =
      user.role === "admin" ? "관리자" :
      user.role === "worker" ? "작업자" :
      "사용자";

    statusEl.textContent = `${user.id} (${roleLabel})`;
    statusEl.classList.remove("status-badge-warn");
    statusEl.classList.add("status-badge-ok");
  }

  if (siteEl) {
    const siteNameMap = {
      yangjae: "양재 HQ",
      gangnam: "강남사옥",
      future: "미래 사업장"
    };
    siteEl.textContent = siteNameMap[user.site] || "-";
  }
});
