(() => {
  "use strict";

  const CITIES = ["New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Patna", "Jaipur", "London"];
  const $ = (selector) => document.querySelector(selector);
  const form = $("#search-form");
  const input = $("#city-input");
  const searchButton = $("#search-button");
  const chips = $("#city-chips");
  const status = $("#status-message");
  const weatherPanel = $("#weather-panel");
  const metrics = $("#metrics");
  const output = $("#json-output");
  const copyButton = $("#copy-json");
  const tabs = [...document.querySelectorAll(".tab")];

  let requestSequence = 0;
  let latestRaw = "";
  let latestData = null;
  let mode = "formatted";
  let selectedCity = "";

  const icons = {
    "Feels like": ["♨", "#ff6b6b"],
    "Humidity": ["♧", "#55a5ff"],
    "Wind speed": ["≋", "#47e3d0"],
    "Visibility": ["◎", "#c7a6ff"],
    "UV index": ["☼", "#ffc84a"],
    "Cloud cover": ["☁", "#8baaff"]
  };


  function renderChips() {
    chips.replaceChildren();
    CITIES.forEach((city) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "city-chip";
      button.textContent = city;
      button.setAttribute("aria-pressed", String(city.toLowerCase() === selectedCity.toLowerCase()));
      button.addEventListener("click", () => {
        input.value = city;
        fetchWeather(city);
      });
      chips.append(button);
    });
  }

  function safeText(value, fallback = "—") {
    return value === undefined || value === null || value === "" ? fallback : String(value);
  }

  function formatLocalTime(location) {
    const local = location.localtime;
    if (!local) return "Local time unavailable";
    const parsed = new Date(local.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return local;
    return parsed.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function renderWeather(data) {
    const location = data.location;
    const current = data.current;
    const mood = window.WeatherMood.moodFor(current);
    const regionCountry = [location.region, location.country].filter(Boolean).join(", ");
    const iconUrl = current.condition && current.condition.icon
      ? (current.condition.icon.startsWith("//") ? `https:${current.condition.icon}` : current.condition.icon)
      : "";
    weatherPanel.innerHTML = `
      <div class="weather-main">
        <div class="location-block">
          <h2>${escapeHTML(safeText(location.name, "Unknown city"))}</h2>
          <p class="location">⌖ ${escapeHTML(regionCountry || "Location details unavailable")}</p>
          <p class="local-time">${escapeHTML(formatLocalTime(location))}</p>
        </div>
        <div class="temp-block">
          ${iconUrl ? `<img class="condition-icon" src="${escapeHTML(iconUrl)}" alt="" width="68" height="68" referrerpolicy="no-referrer">` : `<span class="condition-icon" aria-hidden="true">☼</span>`}
          <div>
            <div class="temperature">${escapeHTML(safeText(current.temp_c))}<sup>°</sup><span class="unit"> C</span></div>
            <p class="condition">${escapeHTML(safeText(current.condition?.text, "Condition unavailable"))}</p>
            <p class="condition-detail">Feels like ${escapeHTML(safeText(current.feelslike_c))}°C</p>
          </div>
        </div>
        <div class="mood-block">
          <p class="eyebrow">TODAY'S MOOD</p>
          <div class="mood-heading">
            <span class="mood-face" style="background:${mood.color}" aria-hidden="true">${mood.face}</span>
            <h3>${mood.name}</h3>
          </div>
          <p class="mood-description">${mood.description}</p>
        </div>
      </div>`;
    const items = [
      ["Feels like", current.feelslike_c, "°C", "Apparent temperature"],
      ["Humidity", current.humidity, "%", Number(current.humidity) <= 60 ? "Comfortable" : Number(current.humidity) >= 80 ? "High moisture" : "Moderate"],
      ["Wind speed", current.wind_kph, "km/h", windDescription(Number(current.wind_kph))],
      ["Visibility", current.vis_km, "km", Number(current.vis_km) >= 10 ? "Good" : "Reduced"],
      ["UV index", current.uv, "", uvDescription(Number(current.uv))],
      ["Cloud cover", current.cloud, "%", Number(current.cloud) <= 20 ? "Mostly clear" : Number(current.cloud) >= 80 ? "Mostly cloudy" : "Partly cloudy"]
    ];
    metrics.replaceChildren();
    items.forEach(([label, value, unit, note]) => {
      const [symbol, color] = icons[label];
      const card = document.createElement("article");
      card.className = "metric-card";
      card.innerHTML = `<span class="metric-icon" style="color:${color}" aria-hidden="true">${symbol}</span>
        <p class="metric-label">${label}</p>
        <p class="metric-value">${escapeHTML(safeText(value))}<small> ${unit}</small></p>
        <p class="metric-note">${escapeHTML(note)}</p>`;
      metrics.append(card);
    });
  }

  function windDescription(speed) {
    if (!Number.isFinite(speed)) return "Unavailable";
    if (speed >= 30) return "Strong breeze";
    if (speed >= 15) return "Breezy";
    if (speed >= 5) return "Light breeze";
    return "Calm";
  }
  function uvDescription(uv) {
    if (!Number.isFinite(uv)) return "Unavailable";
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very high";
    return "Extreme";
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  function syntaxHighlight(value) {
    const escaped = escapeHTML(value);
    return escaped.replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*")|\b(true|false)\b|\b(null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g,
      (match, key, string, bool, nil, number) => {
        if (key) return `<span class="json-key">${key}</span>`;
        if (string) return `<span class="json-string">${string}</span>`;
        if (bool) return `<span class="json-boolean">${bool}</span>`;
        if (nil) return `<span class="json-null">${nil}</span>`;
        if (number) return `<span class="json-number">${number}</span>`;
        return match;
      });
  }

  function renderJSON() {
    if (!latestRaw) {
      output.innerHTML = "<code>Search for a city to inspect its API response.</code>";
      copyButton.disabled = true;
      return;
    }
    copyButton.disabled = false;
    if (mode === "raw") {
      output.textContent = latestRaw;
    } else {
      try {
        output.innerHTML = syntaxHighlight(JSON.stringify(JSON.parse(latestRaw), null, 2));
      } catch {
        output.textContent = latestRaw || "The server returned an empty response.";
      }
    }
    tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    $("#json-label").textContent = mode === "raw" ? "weather-response.raw.json" : "weather-response.json";
  }

  async function fetchWeather(city) {
    const query = String(city || "").trim();
    if (!query) {
      status.textContent = "Enter a city name to get started.";
      status.className = "status-message error";
      input.focus();
      return;
    }
    if (query.length > 100) {
      status.textContent = "City names must be 100 characters or fewer.";
      status.className = "status-message error";
      return;
    }
    const sequence = ++requestSequence;
    selectedCity = query;
    renderChips();
    status.className = "status-message";
    status.textContent = `Looking up ${query}…`;
    searchButton.disabled = true;
    searchButton.setAttribute("aria-label", "Searching");
    weatherPanel.innerHTML = `<div class="empty-state"><div class="empty-sun" aria-hidden="true">◌</div><h2>Finding your weather</h2><p>Getting the latest conditions for ${escapeHTML(query)}…</p></div>`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(`/api/weather?city=${encodeURIComponent(query)}`, {
          method: "GET",
          headers: { "Accept": "application/json" },
          signal: controller.signal,
          cache: "no-store"
        });
      } finally {
        clearTimeout(timeout);
      }
      const bodyText = await response.text();
      if (sequence !== requestSequence) return;
      latestRaw = bodyText;
      let data;
      try { data = JSON.parse(bodyText); }
      catch { data = null; }
      latestData = data;
      renderJSON();
      if (!response.ok) {
        const message = data?.error?.message || data?.message || `Weather lookup failed (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (!data || !data.location || !data.current) throw new Error("The weather service returned an unexpected response.");
      renderWeather(data);
      status.textContent = `Updated for ${data.location.name}${data.current.last_updated ? ` · Last updated ${data.current.last_updated}` : ""}.`;
      status.className = "status-message";
    } catch (error) {
      if (sequence !== requestSequence) return;
      if (error.name === "AbortError") {
        status.textContent = "The request timed out. Please try again.";
      } else if (!navigator.onLine) {
        status.textContent = "You appear to be offline. Check your connection and retry.";
      } else {
        status.textContent = error.message || "Something went wrong. Please try again.";
      }
      status.className = "status-message error";
      weatherPanel.innerHTML = `<div class="empty-state"><div class="empty-sun" aria-hidden="true">!</div><h2>Couldn't load that forecast</h2><p>${escapeHTML(status.textContent)}</p><button type="button" class="city-chip" id="retry-button">Try again</button></div>`;
      $("#retry-button")?.addEventListener("click", () => fetchWeather(query));
      metrics.replaceChildren();
      renderJSON();
    } finally {
      if (sequence === requestSequence) {
        searchButton.disabled = false;
        searchButton.setAttribute("aria-label", "Search weather");
      }
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    fetchWeather(input.value);
  });
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    renderJSON();
  }));
  copyButton.addEventListener("click", async () => {
    if (!latestRaw) return;
    try {
      await navigator.clipboard.writeText(latestRaw);
      copyButton.innerHTML = "<span aria-hidden=\"true\">✓</span> Copied";
      setTimeout(() => { copyButton.innerHTML = "<span aria-hidden=\"true\">▢</span> Copy JSON"; }, 1400);
    } catch {
      status.textContent = "Clipboard access was blocked. Select the JSON and copy it manually.";
      status.className = "status-message error";
    }
  });

  renderChips();
  // A real API request on startup avoids presenting fabricated weather data.
  fetchWeather("New Delhi");
})();
