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
// Build mappings from settings
// fieldId MUST be QUESTION ID (e.g. 4)
// ----------------------------------
function buildMappings(settings) {
  const mappings = [];

  for (let i = 1; i <= 15; i++) {
    const jsonKey = settings[`map${i}_jsonKey`];
    const qid = settings[`map${i}_fieldId`];

    if (
      !jsonKey ||
      !qid ||
      jsonKey === `map${i}_jsonKey` ||
      qid === `map${i}_fieldId`
    ) {
      continue;
    }

    mappings.push({
      jsonKey: jsonKey.trim(),
      questionId: String(qid).trim(),
      domId: `input_${String(qid).trim()}`
    });
  }

  return mappings;
}

// ----------------------------------
// Widget Initialization
// ----------------------------------
JFCustomWidget.subscribe("ready", function () {
  const settings = JFCustomWidget.getWidgetSettings() || {};

  const jsonURL = settings.jsonURL;
  const searchKey = (settings.searchKey || "").trim();
  const idKey = (settings.idKey || searchKey).trim();
  const returnFormat = (settings.returnFormat || "value").toLowerCase();
  const minChars = Number(settings.minChars || 2);

  if (!jsonURL || !searchKey || !idKey) {
    console.error("Widget settings incomplete", settings);
    return;
  }

  const FIELD_MAPPINGS = buildMappings(settings);
  console.log("Resolved mappings:", FIELD_MAPPINGS);

  const input = document.getElementById("searchBox");
  const results = document.getElementById("results");
  const statusEl = document.getElementById("status");

  let entries = [];
  let currentList = [];
  let activeIndex = -1;
  let selectedEntry = null;

  function setStatus(msg) {
    statusEl.textContent = msg || "";
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
  // Load JSON
  // ----------------------------------
  fetch(jsonURL, { cache: "no-store" })
    .then(r => r.json())
    .then(json => {
      const data = Array.isArray(json)
        ? json
        : Object.values(json).find(Array.isArray) || [];

      entries = data.map(item => ({
        item,
        flat: flatten(item)
      }));

      resize();
    });

  // ----------------------------------
  // Search
  // ----------------------------------
  function search() {
    const q = input.value.trim().toLowerCase();
    if (q.length < minChars) return;

    renderList(
      entries.filter(e => {
        const v = e.flat[searchKey];
        return v && String(v).toLowerCase().includes(q);
      })
    );
  }

  function renderList(list) {
    results.innerHTML = "";
    currentList = list;
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
  // Selection + DUAL WRITE (OFFICIAL PATTERN)
  // ----------------------------------
  function selectEntry(entry) {
    const flat = entry.flat;

    const byQuestionId = [];

    FIELD_MAPPINGS.forEach(map => {
      const value = flat[map.jsonKey];
      if (value == null) return;

      console.log("Writing:", map, value);

      // Question ID write
      byQuestionId.push({
        id: map.questionId,
        value: String(value)
      });

      // DOM ID write (fallback)
      JFCustomWidget.storeToField(map.domId, String(value));
    });

    if (byQuestionId.length) {
      JFCustomWidget.setFieldsValueById(byQuestionId);
    }

    let returnValue;
    if (returnFormat === "json") returnValue = entry.item;
    else if (returnFormat === "flat") returnValue = flat;
    else returnValue = flat[idKey];

    JFCustomWidget.sendData({ value: returnValue });

    selectedEntry = entry;
    input.value = displayLabel(entry);
    setStatus("Selected");

    results.innerHTML = "";
    resize();
  }

  input.addEventListener("input", debounce(search, 150));

  // ----------------------------------
  // Submit
  // ----------------------------------
  JFCustomWidget.subscribe("submit", function () {
    if (!selectedEntry) {
      JFCustomWidget.sendSubmit({ valid: false, value: "" });
      return;
    }

    JFCustomWidget.sendSubmit({
      valid: true,
      value: selectedEntry.flat[idKey]
    });
  });
});
