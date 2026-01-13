// ----------------------------------
// Utilities
// ----------------------------------
function flatten(obj, prefix = "", out = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const val = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (val && typeof val === "object" && !Array.isArray(val)) {
      flatten(val, path, out);
    } else {
      out[path] = val;
    }
  }
  return out;
}

function debounce(fn, delay = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ----------------------------------
// Build mappings from widget settings
// EXPECTS QUESTION IDs (e.g. "4")
// ----------------------------------
function buildMappings(settings) {
  const mappings = [];

  for (let i = 1; i <= 15; i++) {
    const jsonKey = settings[`map${i}_jsonKey`];
    const questionId = settings[`map${i}_fieldId`];

    // Ignore empty or placeholder defaults
    if (
      !jsonKey ||
      !questionId ||
      jsonKey === `map${i}_jsonKey` ||
      questionId === `map${i}_fieldId`
    ) {
      continue;
    }

    mappings.push({
      jsonKey: jsonKey.trim(),
      questionId: String(questionId).trim()
    });
  }

  return mappings;
}

// ----------------------------------
// Widget Initialization
// ----------------------------------
JFCustomWidget.subscribe("ready", async () => {
  const settings = JFCustomWidget.getWidgetSettings() || {};

  // --- REQUIRED SETTINGS ---
  const jsonURL = settings.jsonURL;
  const searchKey = (settings.searchKey || "").trim();
  const idKey = (settings.idKey || searchKey).trim();
  const returnFormat = (settings.returnFormat || "value").toLowerCase();
  const widgetWidth = settings.widgetWidth;
  const minChars = Number(settings.minChars || 2);

  if (!jsonURL || !searchKey || !idKey) {
    console.error("Widget settings missing required values", settings);
    return;
  }

  const FIELD_MAPPINGS = buildMappings(settings);
  console.log("Resolved QUESTION-ID mappings:", FIELD_MAPPINGS);

  // --- DOM ---
  const input = document.getElementById("searchBox");
  const results = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const container = document.getElementById("widget");

  if (widgetWidth && container) {
    container.style.maxWidth = widgetWidth;
  }

  let entries = [];
  let currentList = [];
  let activeIndex = -1;
  let selectedEntry = null;

  function setStatus(msg, type = "") {
    statusEl.textContent = msg;
    statusEl.className = "status" + (type ? ` ${type}` : "");
  }

  function resize() {
    JFCustomWidget.requestFrameResize({
      height: document.body.scrollHeight
    });
  }

  function displayLabel(entry) {
    return String(entry.flat[searchKey] ?? "");
  }

  // ----------------------------------
  // Load JSON Data
  // ----------------------------------
  async function loadData() {
    try {
      const res = await fetch(jsonURL, { cache: "no-store" });
      const json = await res.json();

      const data = Array.isArray(json)
        ? json
        : Object.values(json).find(Array.isArray) || [];

      entries = data.map(item => ({
        item,
        flat: flatten(item)
      }));

      resize();
    } catch (err) {
      console.error("JSON load failed", err);
      setStatus("Failed to load data.", "error");
    }
  }

  // ----------------------------------
  // Search (STRICT searchKey)
  // ----------------------------------
  function search() {
    const q = input.value.trim().toLowerCase();

    if (q.length < minChars) {
      results.innerHTML = "";
      resize();
      return;
    }

    renderList(
      entries.filter(entry => {
        const v = entry.flat[searchKey];
        return v && String(v).toLowerCase().includes(q);
      })
    );
  }

  function renderList(list) {
    results.innerHTML = "";
    currentList = list;

    if (!list.length) {
      results.innerHTML = `<div class="empty">No matches</div>`;
      resize();
      return;
    }

    activeIndex = 0;

    list.forEach((entry, idx) => {
      const div = document.createElement("div");
      div.className = `result ${idx === 0 ? "selected" : ""}`;
      div.textContent = displayLabel(entry);
      div.onclick = () => selectEntry(entry);
      results.appendChild(div);
    });

    resize();
  }

  // ----------------------------------
  // Selection + QUESTION-ID population
  // ----------------------------------
  function selectEntry(entry) {
    const flat = entry.flat;
    const identifier = flat[idKey];

    if (identifier == null) {
      setStatus(`Missing ID key: ${idKey}`, "error");
      return;
    }

    const payload = [];

    FIELD_MAPPINGS.forEach(map => {
      const value = flat[map.jsonKey];

      console.log(
        `Mapping → JSON key "${map.jsonKey}"`,
        value,
        `→ Question ID "${map.questionId}"`
      );

      if (value !== undefined && value !== null) {
        payload.push({
          id: map.questionId,
          value: String(value)
        });
      }
    });

    console.log("Final QUESTION-ID payload:", payload);

    if (payload.length) {
      JFCustomWidget.setFieldsValueById(payload);
    }

    let returnValue;
    if (returnFormat === "json") returnValue = entry.item;
    else if (returnFormat === "flat") returnValue = flat;
    else returnValue = identifier;

    JFCustomWidget.sendData({ value: returnValue });

    selectedEntry = entry;
    input.value = displayLabel(entry);
    setStatus("Selected.", "success");

    results.innerHTML = "";
    activeIndex = -1;
    resize();
  }

  // ----------------------------------
  // Events
  // ----------------------------------
  input.addEventListener("input", debounce(search, 150));

  input.addEventListener("keydown", e => {
    if (!currentList.length) return;

    if (e.key === "ArrowDown") {
      activeIndex = Math.min(activeIndex + 1, currentList.length - 1);
    } else if (e.key === "ArrowUp") {
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectEntry(currentList[activeIndex]);
    }

    [...results.querySelectorAll(".result")].forEach((row, idx) =>
      row.classList.toggle("selected", idx === activeIndex)
    );
  });

  // ----------------------------------
  // Submit Enforcement
  // ----------------------------------
  JFCustomWidget.subscribe("submit", () => {
    if (!selectedEntry) {
      JFCustomWidget.sendSubmit({ valid: false, value: "" });
      return;
    }

    const flat = selectedEntry.flat;
    const identifier = flat[idKey];

    let value;
    if (returnFormat === "json") value = selectedEntry.item;
    else if (returnFormat === "flat") value = flat;
    else value = identifier;

    JFCustomWidget.sendSubmit({ valid: true, value });
  });

  loadData();
});
