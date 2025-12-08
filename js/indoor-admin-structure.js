// /js/indoor-admin-structure.js

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  // 모바일 사이드바
  if (menuBtn && sidebar && overlay) {
    const open = () => { sidebar.classList.add("sidebar-open"); overlay.classList.add("active"); };
    const close = () => { sidebar.classList.remove("sidebar-open"); overlay.classList.remove("active"); };
    menuBtn.addEventListener("click", () => {
      sidebar.classList.contains("sidebar-open") ? close() : open();
    });
    overlay.addEventListener("click", close);
  }

  initAdminPage().catch(err => {
    console.error(err);
    alert("indoor-admin-structure 초기화 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  });
});

async function initAdminPage() {
  // 1) 로그인 / 관리자 체크
  const userLabel = document.getElementById("adminUserLabel");
  const raw = localStorage.getItem("lsmsUser");
  if (!raw) {
    alert("로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
    window.location.href = "../login.html";
    return;
  }
  let user;
  try {
    user = JSON.parse(raw);
  } catch (e) {
    alert("로그인 정보가 손상되었습니다. 다시 로그인해 주세요.");
    window.location.href = "../login.html";
    return;
  }
  if (!user || user.role !== "admin") {
    alert("관리자 계정만 접근 가능한 화면입니다.");
    window.location.href = "index.html";
    return;
  }
  if (userLabel) userLabel.textContent = user.id + " (" + user.role + ")";

  // 2) 데이터 로드
  const res = await fetch("../data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json load error");
  const data = await res.json();

  // 편집용 상태
  const state = {
    buildings: data.buildings || [],
    zones: data.zones || [],
    planters: data.planters || [],
    // 나머지 데이터는 그대로 유지
    rest: {
      plants: data.plants || [],
      tasks: data.tasks || [],
      waterings: data.waterings || [],
      workers: data.workers || []
    }
  };

  // DOM 참조
  const buildingTbody = document.getElementById("buildingTableBody");
  const zoneTbody = document.getElementById("zoneTableBody");
  const planterTbody = document.getElementById("planterTableBody");
  const addBuildingBtn = document.getElementById("addBuildingBtn");
  const addZoneBtn = document.getElementById("addZoneBtn");
  const addPlanterBtn = document.getElementById("addPlanterBtn");
  const jsonPreview = document.getElementById("jsonPreview");
  const copyJsonBtn = document.getElementById("copyJsonBtn");

  // 3) 렌더 함수들
  function renderBuildings() {
    buildingTbody.innerHTML = "";
    state.buildings.forEach((b, idx) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      const idInput = document.createElement("input");
      idInput.value = b.id || "";
      idInput.className = "risk-input";
      idInput.addEventListener("change", e => {
        state.buildings[idx].id = e.target.value.trim();
        renderJson();
      });
      tdId.appendChild(idInput);

      const tdName = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.value = b.name || "";
      nameInput.className = "risk-input";
      nameInput.addEventListener("change", e => {
        state.buildings[idx].name = e.target.value.trim();
        renderJson();
      });
      tdName.appendChild(nameInput);

      const tdFloors = document.createElement("td");
      const floorsInput = document.createElement("input");
      const floorsArr = Array.isArray(b.floors) ? b.floors : [];
      floorsInput.value = floorsArr.join(",");
      floorsInput.className = "risk-input";
      floorsInput.placeholder = "예: 1,3,18";
      floorsInput.addEventListener("change", e => {
        const raw = e.target.value;
        const arr = raw.split(",").map(s => s.trim()).filter(s => s !== "");
        state.buildings[idx].floors = arr.map(v => isNaN(Number(v)) ? v : Number(v));
        renderJson();
      });
      tdFloors.appendChild(floorsInput);

      const tdDel = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "삭제";
      delBtn.className = "metric-badge-danger";
      delBtn.addEventListener("click", () => {
        if (!confirm("이 건물을 삭제하면 관련 존/플랜터도 수동으로 정리해야 합니다. 삭제할까요?")) return;
        state.buildings.splice(idx, 1);
        renderAll();
      });
      tdDel.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdFloors);
      tr.appendChild(tdDel);
      buildingTbody.appendChild(tr);
    });
  }

  function renderZones() {
    zoneTbody.innerHTML = "";
    state.zones.forEach((z, idx) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      const idInput = document.createElement("input");
      idInput.value = z.id || "";
      idInput.className = "risk-input";
      idInput.addEventListener("change", e => {
        state.zones[idx].id = e.target.value.trim();
        renderJson();
      });
      tdId.appendChild(idInput);

      const tdB = document.createElement("td");
      const bInput = document.createElement("input");
      bInput.value = z.building || "";
      bInput.className = "risk-input";
      bInput.placeholder = "예: west";
      bInput.addEventListener("change", e => {
        state.zones[idx].building = e.target.value.trim();
        renderJson();
      });
      tdB.appendChild(bInput);

      const tdF = document.createElement("td");
      const fInput = document.createElement("input");
      fInput.value = z.floor != null ? z.floor : "";
      fInput.className = "risk-input";
      fInput.placeholder = "예: 3";
      fInput.addEventListener("change", e => {
        const v = e.target.value.trim();
        state.zones[idx].floor = v === "" ? null : (isNaN(Number(v)) ? v : Number(v));
        renderJson();
      });
      tdF.appendChild(fInput);

      const tdName = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.value = z.name || "";
      nameInput.className = "risk-input";
      nameInput.addEventListener("change", e => {
        state.zones[idx].name = e.target.value.trim();
        renderJson();
      });
      tdName.appendChild(nameInput);

      const tdDel = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "삭제";
      delBtn.className = "metric-badge-danger";
      delBtn.addEventListener("click", () => {
        if (!confirm("이 존을 삭제하면 연결된 플랜터는 수동 정리가 필요합니다. 삭제할까요?")) return;
        state.zones.splice(idx, 1);
        renderAll();
      });
      tdDel.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdB);
      tr.appendChild(tdF);
      tr.appendChild(tdName);
      tr.appendChild(tdDel);
      zoneTbody.appendChild(tr);
    });
  }

  function renderPlanters() {
    planterTbody.innerHTML = "";
    state.planters.forEach((p, idx) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      const idInput = document.createElement("input");
      idInput.value = p.id || "";
      idInput.className = "risk-input";
      idInput.addEventListener("change", e => {
        state.planters[idx].id = e.target.value.trim();
        renderJson();
      });
      tdId.appendChild(idInput);

      const tdZone = document.createElement("td");
      const zInput = document.createElement("input");
      zInput.value = p.zone || "";
      zInput.className = "risk-input";
      zInput.placeholder = "예: S18-L1";
      zInput.addEventListener("change", e => {
        state.planters[idx].zone = e.target.value.trim();
        renderJson();
      });
      tdZone.appendChild(zInput);

      const tdName = document.createElement("td");
      const nameInput = document.createElement("input");
      nameInput.value = p.name || "";
      nameInput.className = "risk-input";
      nameInput.addEventListener("change", e => {
        state.planters[idx].name = e.target.value.trim();
        renderJson();
      });
      tdName.appendChild(nameInput);

      const tdDel = document.createElement("td");
      const delBtn = document.createElement("button");
      delBtn.textContent = "삭제";
      delBtn.className = "metric-badge-danger";
      delBtn.addEventListener("click", () => {
        if (!confirm("이 플랜터를 삭제할까요?")) return;
        state.planters.splice(idx, 1);
        renderAll();
      });
      tdDel.appendChild(delBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdZone);
      tr.appendChild(tdName);
      tr.appendChild(tdDel);
      planterTbody.appendChild(tr);
    });
  }

  function renderJson() {
    const full = {
      buildings: state.buildings,
      zones: state.zones,
      planters: state.planters,
      plants: state.rest.plants,
      tasks: state.rest.tasks,
      waterings: state.rest.waterings,
      workers: state.rest.workers
    };
    if (jsonPreview) {
      jsonPreview.value = JSON.stringify(full, null, 2);
    }
  }

  function renderAll() {
    renderBuildings();
    renderZones();
    renderPlanters();
    renderJson();
  }

  // 4) 버튼 핸들러
  if (addBuildingBtn) {
    addBuildingBtn.addEventListener("click", () => {
      state.buildings.push({ id: "new-building", name: "새 건물", floors: [] });
      renderAll();
    });
  }

  if (addZoneBtn) {
    addZoneBtn.addEventListener("click", () => {
      state.zones.push({ id: "new-zone", building: "", floor: "", name: "새 존" });
      renderAll();
    });
  }

  if (addPlanterBtn) {
    addPlanterBtn.addEventListener("click", () => {
      state.planters.push({ id: "new-planter", zone: "", name: "새 플랜터" });
      renderAll();
    });
  }

  if (copyJsonBtn && jsonPreview) {
    copyJsonBtn.addEventListener("click", async () => {
      jsonPreview.select();
      try {
        await navigator.clipboard.writeText(jsonPreview.value);
        alert("JSON을 클립보드에 복사했습니다. GitHub 또는 서버의 indoor-data.json에 붙여넣어 주세요.");
      } catch {
        document.execCommand("copy");
        alert("JSON 복사 시도 완료. 안 되면 수동으로 드래그 후 복사해 주세요.");
      }
    });
  }

  // 5) 최초 렌더
  renderAll();
}
