// /js/outdoor-admin-users.js
// LSMS OUTDOOR - 관리자용 계정 관리 화면

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
    userLabel.textContent = currentUser.id + " (" + currentUser.role + ")";
  }

  // 2) 사용자 목록 로드
  const res = await fetch("/api/users-load.php");
  if (!res.ok) {
    throw new Error("users-load 실패: " + res.status);
  }
  const users = await res.json();

  const state = {
    users: Array.isArray(users) ? users : [],
  };

  // DOM 참조
  const tbody = document.getElementById("userTableBody");
  const addUserBtn = document.getElementById("addUserBtn");
  const saveUsersBtn = document.getElementById("saveUsersBtn");
  const preview = document.getElementById("usersJsonPreview");

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = "";

    state.users.forEach((u, idx) => {
      const tr = document.createElement("tr");

      // ID
      const tdId = document.createElement("td");
      const idInput = document.createElement("input");
      idInput.value = u.id || "";
      idInput.className = "risk-input";
      idInput.addEventListener("change", (e) => {
        state.users[idx].id = e.target.value.trim();
        renderPreview();
      });
      tdId.appendChild(idInput);

      // 이름
      const tdName = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.value = u.name || "";
      nameInput.className = "risk-input";
      nameInput.addEventListener("change", (e) => {
        state.users[idx].name = e.target.value.trim();
        renderPreview();
      });
      tdName.appendChild(nameInput);

      // 역할
      const tdRole = document.createElement("td");
      const roleSelect = document.createElement("select");
      roleSelect.className = "risk-input";
      ["admin", "worker"].forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        if ((u.role || "worker") === r) opt.selected = true;
        roleSelect.appendChild(opt);
      });
      roleSelect.addEventListener("change", (e) => {
        state.users[idx].role = e.target.value;
        renderPreview();
      });
      tdRole.appendChild(roleSelect);

      // site
      const tdSite = document.createElement("td");
      const siteInput = document.createElement("input");
      siteInput.value = u.site || "";
      siteInput.placeholder = "yangjae / gangnam / *";
      siteInput.className = "risk-input";
      siteInput.addEventListener("change", (e) => {
        state.users[idx].site = e.target.value.trim();
        renderPreview();
      });
      tdSite.appendChild(siteInput);

      // scopes
      const tdScopes = document.createElement("td");
      const scopesInput = document.createElement("input");
      const scopesArr = Array.isArray(u.scopes) ? u.scopes : [];
      scopesInput.value = scopesArr.join(",");
      scopesInput.placeholder = "indoor,outdoor";
      scopesInput.className = "risk-input";
      scopesInput.addEventListener("change", (e) => {
        const raw = e.target.value;
        const arr = raw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== "");
        state.users[idx].scopes = arr;
        renderPreview();
      });
      tdScopes.appendChild(scopesInput);

      // active
      const tdActive = document.createElement("td");
      const activeInput = document.createElement("input");
      activeInput.type = "checkbox";
      activeInput.checked = u.active !== false;
      activeInput.addEventListener("change", (e) => {
        state.users[idx].active = !!e.target.checked;
        renderPreview();
      });
      tdActive.appendChild(activeInput);

      // password (평문)
      const tdPw = document.createElement("td");
      const pwInput = document.createElement("input");
      pwInput.type = "text";
      pwInput.value = u.password || "";
      pwInput.className = "risk-input";
      pwInput.addEventListener("change", (e) => {
        state.users[idx].password = e.target.value;
        renderPreview();
      });
      tdPw.appendChild(pwInput);

      // 삭제
      const tdDel = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "삭제";
      delBtn.className = "metric-badge-danger";
      delBtn.addEventListener("click", () => {
        if (!confirm("이 사용자를 삭제할까요?")) return;
        state.users.splice(idx, 1);
        renderTable();
        renderPreview();
      });
      tdDel.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdRole);
      tr.appendChild(tdSite);
      tr.appendChild(tdScopes);
      tr.appendChild(tdActive);
      tr.appendChild(tdPw);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
    });
  }

  function renderPreview() {
    if (!preview) return;
    preview.value = JSON.stringify(state.users, null, 2);
  }

  renderTable();
  renderPreview();

  if (addUserBtn) {
    addUserBtn.addEventListener("click", () => {
      state.users.push({
        id: "new-user",
        name: "",
        password: "",
        role: "worker",
        site: "yangjae",
        scopes: ["outdoor"],
        active: true,
      });
      renderTable();
      renderPreview();
    });
  }

  if (saveUsersBtn) {
    saveUsersBtn.addEventListener("click", async () => {
      if (!confirm("현재 내용으로 /data/users.json 파일을 덮어쓸까요?")) return;
      try {
        const res = await fetch("/api/users-save.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state.users),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          alert("저장 실패: " + (data.error || res.status));
          return;
        }
        alert("저장 완료 (" + data.count + "명)");
      } catch (e) {
        console.error(e);
        alert("저장 중 오류가 발생했습니다.");
      }
    });
  }
}


