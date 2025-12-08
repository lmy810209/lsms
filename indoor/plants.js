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

  initPlantsPage();
});

async function loadIndoorData() {
  const res = await fetch("../data/indoor-data.json");
  if (!res.ok) throw new Error("indoor-data.json load error");
  return await res.json();
}

async function initPlantsPage() {
  const data = await loadIndoorData();

  const planterMap = Object.fromEntries(data.planters.map(p => [p.id, p]));
  const zoneMap = Object.fromEntries(data.zones.map(z => [z.id, z]));
  const buildingLabel = id =>
    id === "west" ? "서관" : id === "east" ? "동관" : "아트리움";

  // 구역별 집계
  const zoneStats = {};
  data.plants.forEach(p => {
    const planter = planterMap[p.planter];
    if (!planter) return;
    const zone = zoneMap[planter.zone];
    if (!zone) return;

    if (!zoneStats[zone.id]) {
      zoneStats[zone.id] = {
        zone,
        planters: new Set(),
        plantCount: 0
      };
    }
    zoneStats[zone.id].planters.add(planter.id);
    zoneStats[zone.id].plantCount += (p.count || 0);
  });

  const listEl = document.getElementById("plantZoneList");
  const summaryEl = document.getElementById("plantSummary");
  const detailTitle = document.getElementById("plantDetailTitle");
  const detailSub = document.getElementById("plantDetailSub");
  const detailBody = document.getElementById("plantDetailBody");

  const totalPlants = data.plants.reduce((s, p) => s + (p.count || 0), 0);
  summaryEl.textContent = `전체 식물 ${totalPlants}개체 · 관리 구역 ${Object.keys(zoneStats).length}곳`;

  listEl.innerHTML = "";

  Object.values(zoneStats)
    .sort((a, b) => a.zone.floor - b.zone.floor)
    .forEach(zs => {
      const z = zs.zone;
      const row = document.createElement("div");
      row.className = "forecast-row";
      row.innerHTML = `
        <div class="forecast-day">${buildingLabel(z.building)} ${z.floor}F</div>
        <div class="forecast-meta">${z.name} · 플랜터 ${zs.planters.size}개</div>
        <div class="forecast-temp">식물 ${zs.plantCount}개체</div>
      `;

      row.addEventListener("click", () => {
        detailTitle.textContent = `${buildingLabel(z.building)} ${z.floor}F · ${z.name}`;
        detailSub.textContent = `플랜터 ${zs.planters.size}개 · 식물 ${zs.plantCount}개체`;

        const plantersInZone = data.planters.filter(p => p.zone === z.id);
        let html = "";

        plantersInZone.forEach(pl => {
          const plantsInPlanter = data.plants.filter(p => p.planter === pl.id);
          const total = plantsInPlanter.reduce((s, p) => s + (p.count || 0), 0);
          html += `<strong>${pl.name}</strong> (${total}개체)<br>`;
          plantsInPlanter.forEach(p => {
            const healthLabel =
              p.health === "good" ? "양호" :
              p.health === "warn" ? "주의" : "불량";
            html += `- ${p.species} ${p.count}개체 (${healthLabel})<br>`;
          });
          html += `<br>`;
        });

        detailBody.innerHTML = html || "등록된 플랜터/식물이 없습니다.";
      });

      listEl.appendChild(row);
    });
}
