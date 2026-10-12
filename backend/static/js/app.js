const SYSTEMS_INTERVAL_MS = 30 * 1000;
const WEATHER_INTERVAL_MS = 10 * 60 * 1000;
const FORECAST_LENGTH_OPTIONS = [3, 5, 7];

const sourceHealth = { systems: null, weather: null };
let daylight = null;
let latestWeather = null;
let forecastDaysVisible = 7;
let activeModalId = null;
let modalReturnFocusId = null;


// ---------- Shared helpers ----------

async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(body.error || `Request failed (${response.status})`);
    }

    return body;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function setCardState(cardId, state, status) {
    const card = document.getElementById(cardId);
    card.dataset.state = state;
    card.querySelector(".card-header .status-dot").dataset.status = status;
}

function renderError(bodyId, title, error) {
    document.getElementById(bodyId).innerHTML = `
        <p class="card-message error">
            ${escapeHtml(title)}
            <span class="detail">${escapeHtml(error.message)}</span>
        </p>`;
}

function pad(number) {
    return String(number).padStart(2, "0");
}

function timeFromIso(iso) {
    return iso ? iso.slice(11, 16) : "--:--";
}

function reportSource(name, ok) {
    sourceHealth[name] = ok;

    const results = Object.values(sourceHealth).filter((value) => value !== null);
    const failures = results.filter((value) => !value).length;

    let status = "online";
    let text = "All systems nominal";

    if (failures === results.length) {
        status = "offline";
        text = "Signal lost";
    } else if (failures > 0) {
        status = "warning";
        text = "Degraded";
    }

    document.getElementById("global-status").dataset.status = status;
    document.getElementById("global-status-text").textContent = text;

    if (ok) {
        const now = new Date();
        document.getElementById("last-sync").textContent =
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
}


// ---------- Infrastructure ----------

function gaugeLevel(percent) {
    if (percent >= 90) return "critical";
    if (percent >= 70) return "warn";
    return "ok";
}

function renderGauge(label, percent) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));

    return `
        <div class="gauge" data-level="${gaugeLevel(value)}">
            <div class="gauge-dial">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle class="gauge-track" cx="50" cy="50" r="42" pathLength="100" />
                    <circle class="gauge-value" cx="50" cy="50" r="42" pathLength="100"
                        stroke-dasharray="${value} 100" />
                </svg>
                <span class="gauge-readout">${Math.round(value)}<small>%</small></span>
            </div>
            <span class="gauge-label">${label}</span>
        </div>`;
}

function formatUptime(seconds) {
    if (!seconds) return "--";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function renderSystems(nodes) {
    const online = nodes.filter((node) => node.status === "online").length;
    document.getElementById("systems-count").textContent =
        `${online}/${nodes.length} nodes online`;

    if (nodes.length === 0) {
        document.getElementById("systems-body").innerHTML =
            `<p class="card-message">No nodes reported</p>`;
        return;
    }

    const rows = nodes.map((node) => {
        const status = node.status === "online" ? "online" : "offline";

        return `
            <div class="node" data-status="${status}">
                <div class="node-header">
                    <span class="status-dot" data-status="${status}"></span>
                    <span class="node-name">${escapeHtml(node.node)}</span>
                    <span class="node-uptime">Uptime <b>${formatUptime(node.uptime_seconds)}</b></span>
                </div>
                <div class="gauges">
                    ${renderGauge("CPU", node.cpu_percent)}
                    ${renderGauge("Memory", node.memory_percent)}
                    ${renderGauge("Disk", node.disk_percent)}
                </div>
            </div>`;
    });

    document.getElementById("systems-body").innerHTML =
        `<div class="node-list">${rows.join("")}</div>`;

    const status = online === nodes.length ? "online" : "warning";
    setCardState("card-systems", "ready", status);
}

async function loadSystems() {
    try {
        const nodes = await fetchJson("/api/systems");
        renderSystems(nodes);
        reportSource("systems", true);
    } catch (error) {
        document.getElementById("systems-count").textContent = "Offline";
        renderError("systems-body", "Infrastructure offline", error);
        setCardState("card-systems", "error", "offline");
        reportSource("systems", false);
    }
}


// ---------- Weather ----------

function compassPoint(degrees) {
    const points = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return points[Math.round(degrees / 45) % 8];
}

function formatPrecip(amount, units) {
    const value = Number(amount) || 0;
    if (units === "in") {
        return `${value.toFixed(value >= 1 ? 1 : 2)} in`;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} mm`;
}

function weekdayLabel(dateIso, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";

    return new Date(`${dateIso}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });
}

function hourLabel(timeIso) {
    const date = new Date(timeIso);
    return `${pad(date.getHours())}:00`;
}

function renderWeather(weather) {
    const degree = `&deg;${weather.units}`;

    document.getElementById("weather-location").textContent = weather.location;

    document.getElementById("weather-body").innerHTML = `
        <div class="weather-main">
            <span class="weather-temp readout">
                ${Math.round(weather.temperature)}<sup>${degree}</sup>
            </span>
            <div class="weather-summary">
                <p class="weather-condition">${escapeHtml(weather.condition)}</p>
                <p class="weather-feels">Feels like ${Math.round(weather.feels_like)}&deg;</p>
            </div>
        </div>
        <div class="stat-grid">
            <div class="stat">
                <span class="stat-label">High / Low</span>
                <span class="stat-value">${Math.round(weather.high)}&deg; / ${Math.round(weather.low)}&deg;</span>
            </div>
            <div class="stat">
                <span class="stat-label">Precip</span>
                <span class="stat-value">${Math.round(weather.precip_probability)}%</span>
            </div>
            <div class="stat">
                <span class="stat-label">Today</span>
                <span class="stat-value">${formatPrecip(weather.precip_today, weather.precip_units)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Wind</span>
                <span class="stat-value">
                    <span class="wind-arrow" style="transform: rotate(${weather.wind_direction + 180}deg)">&uarr;</span>
                    ${Math.round(weather.wind_speed)} ${escapeHtml(weather.wind_units)}
                    ${compassPoint(weather.wind_direction)}
                </span>
            </div>
        </div>`;

    daylight = { sunrise: weather.sunrise, sunset: weather.sunset };
    document.getElementById("sunrise-label").textContent = timeFromIso(weather.sunrise);
    document.getElementById("sunset-label").textContent = timeFromIso(weather.sunset);
    updateDaylight(new Date());

    setCardState("card-weather", "ready", "online");

    if (!document.getElementById("weather-modal").hidden) {
        renderWeatherModal();
    }
}

function availableForecastLengths(weather) {
    const maxDays = Math.min(weather.daily?.length || 1, 7);
    return FORECAST_LENGTH_OPTIONS.filter((days) => days <= maxDays);
}

function renderHourlyChart(hourly) {
    const samples = (hourly || []).slice(0, 12);
    if (samples.length === 0) {
        return `<p class="card-message">No hourly data</p>`;
    }

    const maxChance = Math.max(...samples.map((hour) => hour.precip_probability || 0), 1);

    const bars = samples.map((hour) => {
        const chance = Math.round(hour.precip_probability || 0);
        const height = Math.max(6, Math.round((chance / maxChance) * 100));
        const wet = chance >= 40 || (hour.precipitation || 0) > 0;

        return `
            <div class="hour-bar" data-wet="${wet}" title="${escapeHtml(hour.condition)}">
                <span class="hour-value">${chance}%</span>
                <div class="hour-track">
                    <div class="hour-fill" style="height: ${height}%"></div>
                </div>
                <span class="hour-label">${hourLabel(hour.time)}</span>
            </div>`;
    });

    return `<div class="hourly-chart">${bars.join("")}</div>`;
}

function renderDailyRows(weather, days) {
    const rows = (weather.daily || []).slice(0, days).map((day, index) => `
        <div class="daily-row${index === 0 ? " today" : ""}">
            <span class="daily-day">${weekdayLabel(day.date, index)}</span>
            <span class="daily-condition">${escapeHtml(day.condition)}</span>
            <span class="daily-temps readout">${Math.round(day.high)}&deg; / ${Math.round(day.low)}&deg;</span>
            <span class="daily-chance readout">${Math.round(day.precip_probability)}%</span>
            <span class="daily-precip readout">${formatPrecip(day.precipitation, weather.precip_units)}</span>
        </div>`);

    return `<div class="daily-list">${rows.join("")}</div>`;
}

function renderWeatherModal() {
    if (!latestWeather) return;

    const weather = latestWeather;
    const lengths = availableForecastLengths(weather);
    if (!lengths.includes(forecastDaysVisible)) {
        forecastDaysVisible = lengths[lengths.length - 1] || 1;
    }

    document.getElementById("weather-modal-title").textContent = weather.location;

    const toggles = lengths.map((days) => `
        <button type="button" data-forecast-days="${days}"
            aria-pressed="${days === forecastDaysVisible}">
            ${days}d
        </button>`).join("");

    document.getElementById("weather-modal-body").innerHTML = `
        <div class="modal-summary">
            <span class="weather-temp readout">
                ${Math.round(weather.temperature)}<sup>&deg;${weather.units}</sup>
            </span>
            <div class="weather-summary">
                <p class="weather-condition">${escapeHtml(weather.condition)}</p>
                <p class="weather-feels">
                    Feels like ${Math.round(weather.feels_like)}&deg;
                    &middot; Humidity ${Math.round(weather.humidity)}%
                </p>
            </div>
        </div>

        <div class="detail-stats">
            <div class="stat">
                <span class="stat-label">Precip chance</span>
                <span class="stat-value">${Math.round(weather.precip_probability)}%</span>
            </div>
            <div class="stat">
                <span class="stat-label">Today total</span>
                <span class="stat-value">${formatPrecip(weather.precip_today, weather.precip_units)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Last hour</span>
                <span class="stat-value">${formatPrecip(weather.precipitation, weather.precip_units)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Wind</span>
                <span class="stat-value">
                    ${Math.round(weather.wind_speed)} ${escapeHtml(weather.wind_units)}
                    ${compassPoint(weather.wind_direction)}
                </span>
            </div>
        </div>

        <div class="section-title">
            <h3>Next 12 hours &middot; precip chance</h3>
        </div>
        ${renderHourlyChart(weather.hourly)}

        <div class="section-title">
            <h3>Daily forecast</h3>
            <div class="segmented" role="group" aria-label="Forecast length">
                ${toggles}
            </div>
        </div>
        ${renderDailyRows(weather, forecastDaysVisible)}`;
}

function openWeatherModal() {
    if (!latestWeather) return;

    renderWeatherModal();
    openModal("weather-modal", "card-weather");
}

function closeWeatherModal() {
    if (activeModalId === "weather-modal") closeActiveModal();
}

// ---------- Modals (shared) ----------

function openModal(modalId, returnFocusId) {
    if (activeModalId) closeActiveModal();

    const modal = document.getElementById(modalId);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    activeModalId = modalId;
    modalReturnFocusId = returnFocusId;
    modal.querySelector(".modal-close").focus();
}

function closeActiveModal() {
    if (!activeModalId) return;

    const modal = document.getElementById(activeModalId);
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    activeModalId = null;

    const returnTo = document.getElementById(modalReturnFocusId);
    if (returnTo) returnTo.focus();
}

function bindCardToModal(cardId, open) {
    const card = document.getElementById(cardId);

    card.addEventListener("click", () => {
        if (card.dataset.state === "ready") open();
    });

    card.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && card.dataset.state === "ready") {
            event.preventDefault();
            open();
        }
    });
}

function bindInteractions() {
    bindCardToModal("card-weather", openWeatherModal);

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-modal]")) {
                closeActiveModal();
            }

            const toggle = event.target.closest("[data-forecast-days]");
            if (toggle) {
                forecastDaysVisible = Number(toggle.dataset.forecastDays);
                renderWeatherModal();
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeActiveModal();
    });
}

async function loadWeather() {
    try {
        const weather = await fetchJson("/api/weather");
        latestWeather = weather;
        forecastDaysVisible = Math.min(
            forecastDaysVisible,
            weather.forecast_days || weather.daily?.length || 7
        );
        renderWeather(weather);
        reportSource("weather", true);
    } catch (error) {
        latestWeather = null;
        document.getElementById("weather-location").textContent = "Offline";
        renderError("weather-body", "Weather feed offline", error);
        setCardState("card-weather", "error", "offline");
        reportSource("weather", false);
        closeWeatherModal();
    }
}


// ---------- Clock ----------

function updateDaylight(now) {
    if (!daylight) return;

    const sunrise = new Date(daylight.sunrise);
    const sunset = new Date(daylight.sunset);
    const span = sunset - sunrise;
    const progress = Math.max(0, Math.min(1, (now - sunrise) / span));

    const container = document.querySelector(".daylight");
    const status = document.getElementById("daylight-status");

    if (now < sunrise) {
        container.dataset.phase = "night";
        status.textContent = `Sunrise in ${formatUptime((sunrise - now) / 1000)}`;
    } else if (now > sunset) {
        container.dataset.phase = "night";
        status.textContent = "Night";
    } else {
        container.dataset.phase = "day";
        status.textContent = `${formatUptime((sunset - now) / 1000)} of daylight left`;
    }

    document.getElementById("daylight-fill").style.width = `${progress * 100}%`;
    document.getElementById("daylight-sun").style.left = `${progress * 100}%`;
}

function tickClock() {
    const now = new Date();

    document.getElementById("clock-time").textContent =
        `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    document.getElementById("clock-seconds").textContent = pad(now.getSeconds());
    document.getElementById("clock-date").textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric"
    });

    updateDaylight(now);
}


// ---------- Startup ----------

document.getElementById("clock-zone").textContent =
    Intl.DateTimeFormat().resolvedOptions().timeZone.replace("_", " ");

tickClock();
setInterval(tickClock, 1000);

loadSystems();
setInterval(loadSystems, SYSTEMS_INTERVAL_MS);

bindInteractions();

loadWeather();
setInterval(loadWeather, WEATHER_INTERVAL_MS);
