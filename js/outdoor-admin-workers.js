// /js/outdoor-admin-workers.js
// LSMS OUTDOOR - 관리자용 작업자 조회 페이지

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  // 모바일 사이드바
  if (menuBtn && sidebar && overlay) {
    const open = () => {
      sidebar.classList.add("sidebar-open");
      overlay.classList.add("active");
    };
    const close = () => {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.remove("active");
    };
    menuBtn.addEventListener("click", () =>
      sidebar.classList.contains("sidebar-open") ? close() : open()
    );
    overlay.addEventListener("click", close);
  }

  initAdminWorkersPage().catch((err) => {
    console.error(err);
    alert("작업자 조회 화면 초기화 중 오류가 발생했습니다.");
  });
});

const WORKER_SITE_LABEL = {
  yangjae: "양재 HQ",
  gangnam: "강남사옥",
  future: "미래 사업장(준비중)",
  "*": "전체 현장",
};

function workerSiteLabel(code) {
  return WORKER_SITE_LABEL[code] || code || "-";
}

async function initAdminWorkersPage() {
  const userLabel = document.getElementById("adminWorkerUserLabel");

  // 로그인 / 관리자 권한 체크 (admin-users.js 와 동일 패턴)
  const raw = localStorage.getItem("lsmsUser");
  if (!raw) {
    alert("로그인 정보가 없습니다. 포털 화면으로 이동합니다.");
    window.location.href = "/index.html";
    return;
  }

  let currentUser = null;
  try {
    currentUser = JSON.parse(raw);
  } catch (e) {
    alert("로그인 정보가 손상되었습니다. 다시 로그인해 주세요.");
    window.location.href = "/index.html";
    return;
  }

  if (!currentUser || currentUser.role !== "admin") {
    alert("관리자 계정만 접근 가능한 화면입니다.");
    window.location.href = "/outdoor/index.html";
    return;
  }

  if (userLabel) {
    const roleText = "관리자";
    userLabel.textContent = `${currentUser.id} (${roleText})`;
  }

  // 사용자 목록 & 로그 불러오기
  const [usersRes, logsRes] = await Promise.all([
    fetch("/api/users-load.php"),
    fetch("/api/logs-load.php"),
  ]);

  if (!usersRes.ok) {
    throw new Error("users-load 실패: " + usersRes.status);
  }
  const users = await usersRes.json();

  let logs = [];
  if (logsRes.ok) {
    try {
      logs = await logsRes.json();
    } catch (e) {
      console.warn("logs.json 파싱 실패", e);
    }
  }

  const state = {
    users: Array.isArray(users) ? users : [],
    logs: Array.isArray(logs) ? logs : [],
    filteredIndexes: [],
    filter: {
      search: "",
      role: "worker", // 기본값: 작업자만
      site: "all",
      scope: "all",
    },
  };

  const tbody = document.getElementById("workerTableBody");
  const searchInput = document.getElementById("workerFilterSearch");
  const roleSelect = document.getElementById("workerFilterRole");
  const siteSelect = document.getElementById("workerFilterSite");
  const scopeSelect = document.getElementById("workerFilterScope");
  const refreshBtn = document.getElementById("workerRefreshBtn");

  function getLastLoginText(userId) {
    if (!userId || !state.logs.length) return "-";
    // logs.json: { ts, type, actor, meta:{ip, ...} }
    const matched = state.logs.filter(
      (log) => log && log.type === "login" && log.actor === userId
    );
    if (!matched.length) return "-";

    matched.sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
    const last = matched[matched.length - 1];
    const ts = last.ts || "";
    const ip =
      last.meta && typeof last.meta.ip === "string" ? last.meta.ip : "-";
    return `${ts.replace("T", " ").replace("Z", "")} (${ip})`;
  }

  function applyFilters() {
    state.filteredIndexes = [];
    const search = state.filter.search.toLowerCase();
    const role = state.filter.role;
    const site = state.filter.site;
    const scope = state.filter.scope;

    state.users.forEach((u, idx) => {
      // 역할 필터: 기본 worker
      if (role !== "all") {
        if ((u.role || "worker") !== role) return;
      }

      if (site !== "all") {
        if (!u.site || u.site !== site) return;
      }

      const scopes = Array.isArray(u.scopes) ? u.scopes : [];
      const hasIndoor = scopes.includes("indoor");
      const hasOutdoor = scopes.includes("outdoor");

      if (scope === "indoor" && !hasIndoor) return;
      if (scope === "outdoor" && !hasOutdoor) return;
      if (scope === "both" && !(hasIndoor && hasOutdoor)) return;

      if (search) {
        const idStr = (u.id || "").toLowerCase();
        const nameStr = (u.name || "").toLowerCase();
        if (!idStr.includes(search) && !nameStr.includes(search)) return;
      }

      state.filteredIndexes.push(idx);
    });

    renderTable();
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    state.filteredIndexes.forEach((idx) => {
      const u = state.users[idx];
      const tr = document.createElement("tr");

      // ID
      const tdId = document.createElement("td");
      tdId.textContent = u.id || "-";

      // 이름
      const tdName = document.createElement("td");
      tdName.textContent = u.name || "-";

      // 역할
      const tdRole = document.createElement("td");
      const roleSpan = document.createElement("span");
      roleSpan.className = "admin-users-pill admin-users-pill--muted";
      roleSpan.textContent =
        u.role === "admin" ? "관리자" : u.role === "worker" ? "작업자" : "사용자";
      tdRole.appendChild(roleSpan);

      // 현장
      const tdSite = document.createElement("td");
      tdSite.textContent = workerSiteLabel(u.site);

      // 권한
      const tdScopes = document.createElement("td");
      const scopesArr = Array.isArray(u.scopes) ? u.scopes : [];
      ["indoor", "outdoor"].forEach((scopeKey) => {
        const span = document.createElement("span");
        const has = scopesArr.includes(scopeKey);
        span.className =
          "admin-users-pill " +
          (has ? "admin-users-pill--primary" : "admin-users-pill--muted");
        span.textContent = scopeKey === "indoor" ? "INDOOR" : "OUTDOOR";
        tdScopes.appendChild(span);
      });

      // 상태
      const tdActive = document.createElement("td");
      const activeSpan = document.createElement("span");
      if (u.active === false) {
        activeSpan.className = "admin-users-pill admin-users-pill--muted";
        activeSpan.textContent = "중지";
      } else {
        activeSpan.className = "admin-users-pill admin-users-pill--success";
        activeSpan.textContent = "활성";
      }
      tdActive.appendChild(activeSpan);

      // 최근 로그인
      const tdLast = document.createElement("td");
      tdLast.textContent = getLastLoginText(u.id);

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdRole);
      tr.appendChild(tdSite);
      tr.appendChild(tdScopes);
      tr.appendChild(tdActive);
      tr.appendChild(tdLast);

      tbody.appendChild(tr);
    });
  }

  // 이벤트 바인딩
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.filter.search = e.target.value || "";
      applyFilters();
    });
  }

  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => {
      state.filter.role = e.target.value;
      applyFilters();
    });
  }

  if (siteSelect) {
    siteSelect.addEventListener("change", (e) => {
      state.filter.site = e.target.value;
      applyFilters();
    });
  }

  if (scopeSelect) {
    scopeSelect.addEventListener("change", (e) => {
      state.filter.scope = e.target.value;
      applyFilters();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }

  // 초기 필터/테이블 렌더링
  // 기본값: role === 'worker'
  if (roleSelect) {
    roleSelect.value = "worker";
  }
  applyFilters();
}


