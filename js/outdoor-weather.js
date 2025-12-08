// ===== 날씨 패널 =====

function updateWeatherUI(weather) {
  const tempEl  = document.getElementById("todayTemp");
  const metaEl  = document.getElementById("todayMeta");
  const extraEl = document.getElementById("todayExtra");
  const listEl  = document.getElementById("forecastList");

  if (!tempEl || !metaEl || !extraEl || !listEl) return;

  tempEl.textContent = `${Math.round(weather.today.temp)}°C`;
  metaEl.textContent =
    `체감 ${Math.round(weather.today.feels_like)}°C · 습도 ${weather.today.humidity}%`;

  extraEl.innerHTML =
    `강수확률 ${Math.round(weather.today.pop * 100)}%<br>` +
    `평균 풍속 ${weather.today.wind} m/s<br>` +
    `순간 최대 ${weather.today.gust} m/s`;

  listEl.innerHTML = "";
  weather.forecast.forEach((d) => {
    const row = document.createElement("div");
    row.className = "weather-forecast-row";
    row.innerHTML = `
      <span>
        <div class="wf-label-main">${d.label}</div>
        <div class="wf-label-sub">${d.dateLabel || ""}</div>
      </span>
      <span>${d.desc}</span>
      <span>${Math.round(d.max)} / ${Math.round(d.min)}°C</span>
      <span>${d.wind} m/s</span>
    `;
    listEl.appendChild(row);
  });
}

async function fetchWeather() {
  const lat = 37.4643;   // 양재 HQ 위도
  const lon = 127.0428;  // 양재 HQ 경도
  const apiKey = "f8ac84ac53ac43039b1e5eca4cdc565c";  // 형 키

  try {
    // 1) 현재 날씨
    const curRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${apiKey}`
    );
    if (!curRes.ok) throw new Error("current weather fail: " + curRes.status);
    const cur = await curRes.json();

    // 2) 5일 예보 (3시간 간격)
    const fcRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${lat}&lon=${lon}&units=metric&lang=kr&appid=${apiKey}`
    );
    if (!fcRes.ok) throw new Error("forecast fail: " + fcRes.status);
    const fc = await fcRes.json();

    // ===== 오늘 데이터 정리 =====
    const today = {
      temp: cur.main.temp,
      feels_like: cur.main.feels_like,
      humidity: cur.main.humidity,
      pop: 0,
      wind: cur.wind.speed,
      gust: cur.wind.gust ?? cur.wind.speed
    };

    // 예보 리스트에서 날짜별로 하루 대표값 (정오 근처) 뽑기
    const byDate = {};
    fc.list.forEach((item) => {
      const [dateStr, timeStr] = item.dt_txt.split(" ");
      if (!byDate[dateStr]) {
        byDate[dateStr] = item;
      }
      if (timeStr === "12:00:00") {
        byDate[dateStr] = item;
      }
    });

    const dates = Object.keys(byDate).sort();
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

    const forecast = dates.slice(0, 5).map((d, idx) => {
      const it = byDate[d];
      const dateObj = new Date(d + "T00:00:00");

      let mainLabel;
      if (idx === 0) mainLabel = "오늘";
      else if (idx === 1) mainLabel = "내일";
      else mainLabel = dayNames[dateObj.getDay()];

      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      const subLabel = `${mm}.${dd}.`;

      return {
        label: mainLabel,
        dateLabel: subLabel,
        desc: it.weather?.[0]?.description ?? "예보 없음",
        max: it.main.temp_max,
        min: it.main.temp_min,
        wind: it.wind?.speed ?? today.wind
      };
    });

    const weatherData = { today, forecast };
    updateWeatherUI(weatherData);
  } catch (err) {
    console.warn("날씨 불러오기 실패, 콘솔 확인:", err);

    // 실패 시 기본값
    const fallback = {
      today: { temp: 27, feels_like: 29, humidity: 60, pop: 0.3, wind: 3, gust: 6 },
      forecast: [
        { label: "오늘",  dateLabel: "", desc: "가끔 구름", max: 27, min: 19, wind: 3 },
        { label: "내일",  dateLabel: "", desc: "소나기",   max: 26, min: 20, wind: 4 },
        { label: "2일 후", dateLabel: "", desc: "맑음",   max: 28, min: 18, wind: 2 },
        { label: "3일 후", dateLabel: "", desc: "구름 많음", max: 27, min: 19, wind: 3 },
        { label: "4일 후", dateLabel: "", desc: "약한 비",   max: 25, min: 21, wind: 4 }
      ]
    };
    updateWeatherUI(fallback);
  }
}

// 초기화용 래퍼
function weatherInit() {
  fetchWeather();
}
