// /js/outdoor-admin-logs.js
// LSMS OUTDOOR - 관리자용 로그 기록 페이지

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

  initAdminLogsPage().catch((err) => {
    console.error(err);
    alert("로그 기록 화면 초기화 중 오류가 발생했습니다.");
  });
});

function logTypeLabel(type) {
  switch (type) {
    case "login":
      return "로그인";
    case "user_created":
      return "계정 생성";
    case "user_updated":
      return "계정 수정";
    case "user_deleted":
      return "계정 삭제";
    default:
      return type || "기타";
  }
}

async function initAdminLogsPage() {
  const userLabel = document.getElementById("adminLogUserLabel");

  // 로그인 / 관리자 권한 체크
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

  // 로그 데이터 불러오기
  const res = await fetch("/api/logs-load.php");
  if (!res.ok) {
    throw new Error("logs-load 실패: " + res.status);
  }

  let logs = [];
  try {
    logs = await res.json();
  } catch (e) {
    console.error("logs.json 파싱 실패", e);
  }

  const state = {
    logs: Array.isArray(logs) ? logs : [],
    filtered: [],
  };

  const tbody = document.getElementById("logTableBody");
  const filterUser = document.getElementById("logFilterUser");
  const filterType = document.getElementById("logFilterType");
  const dateFrom = document.getElementById("logDateFrom");
  const dateTo = document.getElementById("logDateTo");
  const btnToday = document.getElementById("logTodayBtn");
  const btn7d = document.getElementById("log7dBtn");
  const btn30d = document.getElementById("log30dBtn");
  const refreshBtn = document.getElementById("logRefreshBtn");

  function applyFilters() {
    const uid = (filterUser.value || "").toLowerCase();
    const type = filterType.value;

    let fromDate = null;
    let toDate = null;
    if (dateFrom.value) {
      fromDate = new Date(dateFrom.value + "T00:00:00");
    }
    if (dateTo.value) {
      toDate = new Date(dateTo.value + "T23:59:59");
    }

    state.filtered = state.logs.filter((log) => {
      if (!log) return false;

      const actor = (log.actor || "").toLowerCase();
      if (uid && !actor.includes(uid)) {
        return false;
      }

      if (type !== "all" && log.type !== type) {
        return false;
      }

      if (fromDate || toDate) {
        if (!log.ts) return false;
        const ts = new Date(String(log.ts).replace(" ", "T"));
        if (fromDate && ts < fromDate) return false;
        if (toDate && ts > toDate) return false;
      }

      return true;
    });

    renderTable();
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    state.filtered
      .slice()
      .sort((a, b) => String(b.ts || "").localeCompare(String(a.ts || "")))
      .forEach((log) => {
        const tr = document.createElement("tr");

        const tsTd = document.createElement("td");
        tsTd.textContent = (log.ts || "").replace("T", " ").replace("Z", "");

        const typeTd = document.createElement("td");
        const typeSpan = document.createElement("span");
        typeSpan.className = "admin-users-pill admin-users-pill--muted";
        if (log.type === "login") {
          typeSpan.className =
            "admin-users-pill admin-users-pill--primary";
        } else if (log.type === "user_deleted") {
          typeSpan.className =
            "admin-users-pill admin-users-pill--muted";
        } else if (log.type === "user_created") {
          typeSpan.className =
            "admin-users-pill admin-users-pill--success";
        }
        typeSpan.textContent = logTypeLabel(log.type);
        typeTd.appendChild(typeSpan);

        const actorTd = document.createElement("td");
        actorTd.textContent = log.actor || "-";

        const detailTd = document.createElement("td");
        detailTd.textContent = buildLogDetailText(log);

        const ipTd = document.createElement("td");
        ipTd.textContent =
          log.meta && typeof log.meta.ip === "string" ? log.meta.ip : "-";

        tr.appendChild(tsTd);
        tr.appendChild(typeTd);
        tr.appendChild(actorTd);
        tr.appendChild(detailTd);
        tr.appendChild(ipTd);

        tbody.appendChild(tr);
      });
  }

  function buildLogDetailText(log) {
    const meta = log.meta || {};
    switch (log.type) {
      case "login":
        return `로그인 성공 (site=${meta.site || "-"}, scope=${
          meta.scope || "-"
        })`;
      case "user_created":
        return `계정 생성: id=${meta.id || "-"}, role=${
          meta.role || "-"
        }, site=${meta.site || "-"}`;
      case "user_updated":
        return `계정 수정: id=${meta.id || "-"}, role=${
          meta.role || "-"
        }, site=${meta.site || "-"}`;
      case "user_deleted":
        return `계정 삭제: id=${meta.id || "-"}, role=${
          meta.role || "-"
        }, site=${meta.site || "-"}`;
      default:
        return JSON.stringify(meta);
    }
  }

  function setRange(days) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (days - 1));

    dateTo.value = to.toISOString().substring(0, 10);
    dateFrom.value = from.toISOString().substring(0, 10);
    applyFilters();
  }

  // 이벤트 바인딩
  if (filterUser) {
    filterUser.addEventListener("input", applyFilters);
  }
  if (filterType) {
    filterType.addEventListener("change", applyFilters);
  }
  if (dateFrom) {
    dateFrom.addEventListener("change", applyFilters);
  }
  if (dateTo) {
    dateTo.addEventListener("change", applyFilters);
  }
  if (btnToday) {
    btnToday.addEventListener("click", () => setRange(1));
  }
  if (btn7d) {
    btn7d.addEventListener("click", () => setRange(7));
  }
  if (btn30d) {
    btn30d.addEventListener("click", () => setRange(30));
  }
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => window.location.reload());
  }

  // 초기 필터: 전체 기간/전체 유형
  state.filtered = state.logs.slice();
  renderTable();
}


