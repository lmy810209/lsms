// /js/lsms-auth.js

export function getLsmsUser() {
  try {
    const raw = localStorage.getItem("lsmsUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("lsmsUser 파싱 오류", e);
    return null;
  }
}

export function requireLogin(origin) {
  const user = getLsmsUser();
  if (!user || !user.id) {
    alert("로그인 정보가 없습니다. LSMS 로그인 화면으로 이동합니다.");
    // indoor 기준 경로. outdoor에서는 경로만 다르게.
    window.location.href = "../login.html?from=" + encodeURIComponent(origin || "");
    return null;
  }
  return user;
}

export function isAdmin(user) {
  return user && user.role === "admin";
}
