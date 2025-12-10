// /js/outdoor-admin-users.js
// LSMS OUTDOOR - 관리자용 계정 관리 화면 (리스트 + 상세 패널)

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

  initAdminUsersPage().catch((err) => {
    console.error(err);
    alert("계정 관리 화면 초기화 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  });
});

// 사이트 코드 ↔ 라벨 매핑
const SITE_OPTIONS = [
  { value: "yangjae", label: "양재 HQ" },
  { value: "gangnam", label: "강남사옥" },
  { value: "future", label: "미래 사업장(준비중)" },
];

function getSiteLabel(value) {
  const found = SITE_OPTIONS.find((s) => s.value === value);
  return found ? found.label : value || "-";
}

function getRoleLabel(role) {
  if (role === "admin") return "관리자";
  if (role === "worker") return "작업자";
  return role || "-";
}

function getScopesLabel(scopes) {
  const arr = Array.isArray(scopes) ? scopes : [];
  const hasIndoor = arr.includes("indoor");
  const hasOutdoor = arr.includes("outdoor");
  if (hasIndoor && hasOutdoor) return "실내+실외";
  if (hasOutdoor) return "실외";
  if (hasIndoor) return "실내";
  return "없음";
}

async function initAdminUsersPage() {
  // 1) 로그인 / 관리자 체크
  const userLabel = document.getElementById("adminUserLabel");

  const raw = localStorage.getItem("lsmsUser");
  if (!raw) {
    alert("로그인 정보가 없습니다. 포털 화면으로 이동합니다.");
    window.location.href = "/index.html";
    return;
  }

  let currentUser;
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
    const roleText = currentUser.role === "admin" ? "관리자" : currentUser.role;
    userLabel.textContent = `${currentUser.id} (${roleText})`;
  }

  // 2) 사용자 목록 로드
  const res = await fetch("/api/users-load.php");
  if (!res.ok) {
    throw new Error("users-load 실패: " + res.status);
  }
  const users = await res.json();

  const state = {
    users: Array.isArray(users) ? users : [],
    filteredIndexes: [], // 필터링된 행의 실제 인덱스 목록
    selectedIndex: -1, // state.users 기준 인덱스
    filter: {
      search: "",
      role: "all",
      site: "all",
    },
  };

  // DOM 참조
  const tbody = document.getElementById("userTableBody");
  const addUserBtn = document.getElementById("addUserBtn");
  const preview = document.getElementById("usersJsonPreview");
  const filterSearch = document.getElementById("filterSearch");
  const filterRole = document.getElementById("filterRole");
  const filterSite = document.getElementById("filterSite");

  const detailTitle = document.getElementById("detailTitle");
  const detailSubtitle = document.getElementById("detailSubtitle");
  const detailEmptyMessage = document.getElementById("detailEmptyMessage");
  const detailForm = document.getElementById("detailForm");
  const detailId = document.getElementById("detailId");
  const detailName = document.getElementById("detailName");
  const detailRole = document.getElementById("detailRole");
  const detailSite = document.getElementById("detailSite");
  const detailScopeIndoor = document.getElementById("detailScopeIndoor");
  const detailScopeOutdoor = document.getElementById("detailScopeOutdoor");
  const detailActive = document.getElementById("detailActive");
  const detailPassword = document.getElementById("detailPassword");
  const detailDeleteBtn = document.getElementById("detailDeleteBtn");
  const detailSaveBtn = document.getElementById("detailSaveBtn");

  const presetOutdoorOnly = document.getElementById("presetOutdoorOnly");
  const presetIndoorOutdoor = document.getElementById("presetIndoorOutdoor");
  const saveUsersJsonBtn = document.getElementById("saveUsersJsonBtn");

  // detailSite 셀렉트 옵션 구성
  if (detailSite) {
    detailSite.innerHTML = "";
    SITE_OPTIONS.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.value;
      opt.textContent = s.label;
      detailSite.appendChild(opt);
    });
  }

  function updatePreview() {
    if (!preview) return;
    preview.value = JSON.stringify(state.users, null, 2);
  }

  function applyFilters() {
    state.filteredIndexes = [];
    const search = state.filter.search.toLowerCase();
    const role = state.filter.role;
    const site = state.filter.site;

    state.users.forEach((u, idx) => {
      if (role !== "all" && u.role !== role) return;
      if (site !== "all" && u.site !== site) return;

      if (search) {
        const idStr = (u.id || "").toLowerCase();
        const nameStr = (u.name || "").toLowerCase();
        if (!idStr.includes(search) && !nameStr.includes(search)) return;
      }

      state.filteredIndexes.push(idx);
    });

    // 선택된 계정이 필터에서 사라지면 선택 해제
    if (!state.filteredIndexes.includes(state.selectedIndex)) {
      state.selectedIndex = -1;
    }

    renderTable();
    renderDetail();
    updatePreview();
  }

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    state.filteredIndexes.forEach((userIdx) => {
      const u = state.users[userIdx];
      const tr = document.createElement("tr");

      if (userIdx === state.selectedIndex) {
        tr.classList.add("admin-users-row-selected");
      }

      // 행 클릭 시 상세 열기
      tr.addEventListener("click", (e) => {
        const target = e.target;
        if (
          target instanceof HTMLElement &&
          target.dataset &&
          target.dataset.action === "resetPw"
        ) {
          return;
        }
        selectUser(userIdx);
      });

      // ID
      const tdId = document.createElement("td");
      tdId.textContent = u.id || "-";

      // 이름
      const tdName = document.createElement("td");
      tdName.textContent = u.name || "-";

      // 역할
      const tdRoleCell = document.createElement("td");
      const roleSpan = document.createElement("span");
      roleSpan.className = "admin-users-pill admin-users-pill--muted";
      roleSpan.textContent = getRoleLabel(u.role);
      tdRoleCell.appendChild(roleSpan);

      // 현장
      const tdSiteCell = document.createElement("td");
      tdSiteCell.textContent = getSiteLabel(u.site);

      // 권한
      const tdScopesCell = document.createElement("td");
      const scopesArr = Array.isArray(u.scopes) ? u.scopes : [];
      ["indoor", "outdoor"].forEach((scopeKey) => {
        const span = document.createElement("span");
        const has = scopesArr.includes(scopeKey);
        span.className =
          "admin-users-pill " +
          (has ? "admin-users-pill--primary" : "admin-users-pill--muted");
        span.textContent = scopeKey === "indoor" ? "INDOOR" : "OUTDOOR";
        tdScopesCell.appendChild(span);
      });

      // 상태
      const tdActiveCell = document.createElement("td");
      const activeSpan = document.createElement("span");
      if (u.active === false) {
        activeSpan.className = "admin-users-pill admin-users-pill--muted";
        activeSpan.textContent = "중지";
      } else {
        activeSpan.className = "admin-users-pill admin-users-pill--success";
        activeSpan.textContent = "활성";
      }
      tdActiveCell.appendChild(activeSpan);

      // 임시 비밀번호 (마스킹 + 초기화 버튼)
      const tdPwCell = document.createElement("td");
      const hasPw = !!u.password;
      const maskSpan = document.createElement("span");
      maskSpan.style.marginRight = "4px";
      maskSpan.textContent = hasPw ? "●●●●" : "—";

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "초기화";
      resetBtn.className = "metric-badge-ok";
      resetBtn.style.padding = "2px 6px";
      resetBtn.dataset.action = "resetPw";
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("이 계정의 비밀번호를 '1234'로 초기화할까요?")) return;
        state.users[userIdx].password = "1234";
        updatePreview();
        renderTable();
        if (state.selectedIndex === userIdx && detailPassword) {
          detailPassword.value = "";
        }
      });

      tdPwCell.appendChild(maskSpan);
      tdPwCell.appendChild(resetBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdRoleCell);
      tr.appendChild(tdSiteCell);
      tr.appendChild(tdScopesCell);
      tr.appendChild(tdActiveCell);
      tr.appendChild(tdPwCell);

      tbody.appendChild(tr);
    });
  }

  function selectUser(userIdx) {
    state.selectedIndex = userIdx;
    renderTable();
    renderDetail();
  }

  function renderDetail() {
    if (!detailForm || !detailEmptyMessage) return;

    if (state.selectedIndex < 0 || !state.users[state.selectedIndex]) {
      detailForm.style.display = "none";
      detailEmptyMessage.style.display = "block";
      if (detailTitle) detailTitle.textContent = "계정 상세";
      if (detailSubtitle)
        detailSubtitle.textContent =
          "좌측 목록에서 계정을 선택하면 상세 정보가 여기에 표시됩니다.";
      return;
    }

    const u = state.users[state.selectedIndex];

    detailForm.style.display = "block";
    detailEmptyMessage.style.display = "none";

    if (detailTitle) {
      detailTitle.textContent = `계정 상세 · ${u.id || "-"}`;
    }
    if (detailSubtitle) {
      const roleLabel = getRoleLabel(u.role);
      const siteLabel = getSiteLabel(u.site);
      const scopesLabel = getScopesLabel(u.scopes);
      const statusLabel = u.active === false ? "중지" : "활성";
      detailSubtitle.textContent = `ID: ${u.id || "-"} · 이름: ${
        u.name || "-"
      } · 역할: ${roleLabel} · 현장: ${siteLabel} · 권한: ${scopesLabel} · 상태: ${statusLabel}`;
    }

    if (detailId) detailId.value = u.id || "";
    if (detailName) detailName.value = u.name || "";
    if (detailRole) detailRole.value = u.role || "worker";
    if (detailSite) detailSite.value = u.site || "yangjae";

    const scopesArr = Array.isArray(u.scopes) ? u.scopes : [];
    if (detailScopeIndoor)
      detailScopeIndoor.checked = scopesArr.includes("indoor");
    if (detailScopeOutdoor)
      detailScopeOutdoor.checked = scopesArr.includes("outdoor");

    if (detailActive)
      detailActive.value = u.active === false ? "false" : "true";

    if (detailPassword) {
      detailPassword.value = "";
    }
  }

  function collectDetailForm() {
    if (state.selectedIndex < 0 || !state.users[state.selectedIndex]) {
      return false;
    }
    const u = state.users[state.selectedIndex];

    // ID 변경 허용: 비어 있거나 중복이면 저장 불가
    if (detailId) {
      const newId = (detailId.value || "").trim();
      if (!newId) {
        alert("ID는 비워둘 수 없습니다.");
        return false;
      }
      const duplicate = state.users.some((other, idx) => {
        if (idx === state.selectedIndex) return false;
        return (other.id || "") === newId;
      });
      if (duplicate) {
        alert("이미 같은 ID가 존재합니다. 다른 ID를 입력해 주세요.");
        return false;
      }
      u.id = newId;
    }

    if (detailName) u.name = detailName.value.trim();
    if (detailRole) u.role = detailRole.value;
    if (detailSite) u.site = detailSite.value;

    const scopes = [];
    if (detailScopeIndoor && detailScopeIndoor.checked) scopes.push("indoor");
    if (detailScopeOutdoor && detailScopeOutdoor.checked)
      scopes.push("outdoor");
    u.scopes = scopes;

    if (detailActive) {
      u.active = detailActive.value === "true";
    }

    if (detailPassword) {
      const pw = detailPassword.value;
      if (pw && pw.trim() !== "") {
        u.password = pw.trim();
      }
    }

    return true;
  }

  async function saveUsersToServer() {
    try {
      const payload = {
        users: state.users,
        actorId: (currentUser && currentUser.id) || "admin",
      };

      const res = await fetch("/api/users-save.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert("저장 실패: " + (data.error || res.status));
        return;
      }
      alert(`저장 완료 (${data.count}명)`);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    }
  }

  // 이벤트 바인딩
  if (filterSearch) {
    filterSearch.addEventListener("input", (e) => {
      state.filter.search = e.target.value || "";
      applyFilters();
    });
  }

  if (filterRole) {
    filterRole.addEventListener("change", (e) => {
      state.filter.role = e.target.value;
      applyFilters();
    });
  }

  if (filterSite) {
    filterSite.addEventListener("change", (e) => {
      state.filter.site = e.target.value;
      applyFilters();
    });
  }

  if (addUserBtn) {
    addUserBtn.addEventListener("click", () => {
      const newUser = {
        id: "new-user",
        name: "",
        password: "1234",
        role: "worker",
        site: "yangjae",
        scopes: ["outdoor"],
        active: true,
      };
      state.users.push(newUser);
      state.selectedIndex = state.users.length - 1;
      applyFilters();
      if (!state.filteredIndexes.includes(state.selectedIndex)) {
        state.filter = { search: "", role: "all", site: "all" };
        if (filterSearch) filterSearch.value = "";
        if (filterRole) filterRole.value = "all";
        if (filterSite) filterSite.value = "all";
        applyFilters();
      }
    });
  }

  if (detailSaveBtn) {
    detailSaveBtn.addEventListener("click", async () => {
      if (state.selectedIndex < 0) {
        alert("먼저 좌측에서 계정을 선택해 주세요.");
        return;
      }
      const ok = collectDetailForm();
      if (!ok) return;
      updatePreview();
      renderTable();
      renderDetail();
      await saveUsersToServer();
    });
  }

  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener("click", async () => {
      if (state.selectedIndex < 0) {
        alert("삭제할 계정을 먼저 선택해 주세요.");
        return;
      }
      const u = state.users[state.selectedIndex];
      if (!confirm(`ID: ${u.id} 계정을 삭제할까요?`)) return;
      state.users.splice(state.selectedIndex, 1);
      state.selectedIndex = -1;
      applyFilters();
      await saveUsersToServer();
    });
  }

  if (presetOutdoorOnly) {
    presetOutdoorOnly.addEventListener("click", () => {
      if (detailScopeIndoor) detailScopeIndoor.checked = false;
      if (detailScopeOutdoor) detailScopeOutdoor.checked = true;
    });
  }

  if (presetIndoorOutdoor) {
    presetIndoorOutdoor.addEventListener("click", () => {
      if (detailScopeIndoor) detailScopeIndoor.checked = true;
      if (detailScopeOutdoor) detailScopeOutdoor.checked = true;
    });
  }

  if (saveUsersJsonBtn) {
    saveUsersJsonBtn.addEventListener("click", async () => {
      if (!preview) return;
      if (!confirm("JSON 내용을 그대로 /data/users.json 에 저장할까요?")) return;
      try {
        const parsed = JSON.parse(preview.value);
        if (!Array.isArray(parsed)) {
          alert("최상위 구조가 배열이 아닙니다. users.json 은 배열이어야 합니다.");
          return;
        }
        state.users = parsed;
        state.selectedIndex = -1;
        applyFilters();
        await saveUsersToServer();
      } catch (e) {
        console.error(e);
        alert("JSON 파싱에 실패했습니다. 형식을 다시 확인해 주세요.");
      }
    });
  }

  // 초기 렌더
  applyFilters();
}


