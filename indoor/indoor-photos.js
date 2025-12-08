document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("mobileOverlay");

  if (menuBtn && sidebar && overlay) {
    const open = () => { sidebar.classList.add("sidebar-open"); overlay.classList.add("active"); };
    const close = () => { sidebar.classList.remove("sidebar-open"); overlay.classList.remove("active"); };
    menuBtn.addEventListener("click", () => sidebar.classList.contains("sidebar-open") ? close() : open());
    overlay.addEventListener("click", close);
  }

  initPhotosPage();
});

async function loadIndoorData() {
  const res = await fetch("../data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json load error");
  return await res.json();
}

async function initPhotosPage() {
  const data = await loadIndoorData();

  const planterMap = Object.fromEntries(data.planters.map(p => [p.id, p]));
  const zoneMap = Object.fromEntries(data.zones.map(z => [z.id, z]));
  const buildingLabel = id =>
    id === "west" ? "서관" : id === "east" ? "동관" : "아트리움";

  // 플랜터별 before/after 묶기
  const photoPairs = {};
  data.photos.forEach(ph => {
    const key = ph.planter;
    if (!photoPairs[key]) photoPairs[key] = {};
    photoPairs[key][ph.type] = ph;
  });

  const listEl = document.getElementById("photoList");
  const summaryEl = document.getElementById("photoSummary");
  const detailTitle = document.getElementById("photoDetailTitle");
  const detailSub = document.getElementById("photoDetailSub");
  const detailBody = document.getElementById("photoDetailBody");

  const keys = Object.keys(photoPairs);
  summaryEl.textContent = `사진 세트 ${keys.length}개 (플랜터 기준)`;

  listEl.innerHTML = "";

  keys.forEach(planterId => {
    const pair = photoPairs[planterId];
    const planter = planterMap[planterId];
    const zone = planter ? zoneMap[planter.zone] : null;

    const card = document.createElement("article");
    card.className = "card";
    card.style.cursor = "pointer";

    const title = planter ? planter.name : planterId;
    const where = zone ? `${buildingLabel(zone.building)} ${zone.floor}F · ${zone.name}` : "위치 정보 없음";

    card.innerHTML = `
      <div class="card-title">${title}</div>
      <div class="metric-sub">${where}</div>
      <div style="margin-top:8px; font-size:12px;">
        ${pair.before ? `전(before): ${pair.before.date}` : "전(before): -"}<br>
        ${pair.after ? `후(after): ${pair.after.date}` : "후(after): -"}
      </div>
    `;

    card.addEventListener("click", () => {
      detailTitle.textContent = title;
      detailSub.textContent = where;

      let html = "";
      if (pair.before) {
        html += `<strong>전(before)</strong><br>촬영일: ${pair.before.date}<br>파일: ${pair.before.url}<br><br>`;
      } else {
        html += "<strong>전(before)</strong><br>등록된 사진 없음<br><br>";
      }
      if (pair.after) {
        html += `<strong>후(after)</strong><br>촬영일: ${pair.after.date}<br>파일: ${pair.after.url}<br>`;
      } else {
        html += "<strong>후(after)</strong><br>등록된 사진 없음<br>";
      }

      detailBody.innerHTML = html;
    });

    listEl.appendChild(card);
  });

  if (keys.length === 0) {
    listEl.innerHTML = "<div class='metric-sub'>등록된 사진이 없습니다.</div>";
  }
}
