console.log("Booting Address Widget…");

/* ---------------------------------------
   JOTFORM SAFETY SHIM
---------------------------------------- */
if (typeof JFCustomWidget === "undefined") {
  window.JFCustomWidget = {
    subscribe: (e, fn) => { if (e === "ready") fn(); },
    getWidgetSetting: () => null,
    sendSubmit: (d) => console.log("Submit:", d),
    sendData: (d) => console.log("SendData:", d)
  };
}

/* ---------------------------------------
   STATE
---------------------------------------- */
let backendUrl = "";
let debounceTimer = null;
let selectedAddress = null;

/* ---------------------------------------
   CONSTANTS
---------------------------------------- */
const DEFAULT_BACKEND_URL = "https://myefnonvpjbggqqurvhy.supabase.co/functions/v1/GIS-Address";
const UI_SUGGESTION_LIMIT = 5;

/* ---------------------------------------
   READY
---------------------------------------- */
JFCustomWidget.subscribe("ready", () => {
  backendUrl =
    JFCustomWidget.getWidgetSetting("backendUrl") ||
    DEFAULT_BACKEND_URL;

  const input = document.getElementById("addressInput");
  input.placeholder = "Search address…";

  JFCustomWidget.subscribe("submit", () => {
    JFCustomWidget.sendSubmit({
      valid: !!selectedAddress,
      value: selectedAddress || ""
    });
  });
});

/* ---------------------------------------
   INPUT HANDLER
---------------------------------------- */
document.getElementById("addressInput").addEventListener("input", (e) => {
  const query = e.target.value
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");

  selectedAddress = null;

  if (query.length < 3) {
    renderSuggestions([]);
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchSuggestions(query), 250);
});

/* ---------------------------------------
   FETCH SUGGESTIONS
---------------------------------------- */
async function fetchSuggestions(query) {
  const res = await fetch(
    `${backendUrl}?query=${encodeURIComponent(query)}`
  );
  const data = await res.json();
  renderSuggestions(data.addresses || []);
}

/* ---------------------------------------
   RENDER SUGGESTIONS
---------------------------------------- */
function renderSuggestions(list) {
  const box = document.getElementById("suggestions");
  box.innerHTML = "";

  if (!list.length) {
    box.style.display = "none";
    return;
  }

  list.slice(0, UI_SUGGESTION_LIMIT).forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = item.label;

    div.onmousedown = (e) => {
      e.preventDefault();
      resolveAddress(item.magicKey);
    };

    box.appendChild(div);
  });

  box.style.display = "block";
}

/* ---------------------------------------
   RESOLVE ADDRESS
---------------------------------------- */
async function resolveAddress(magicKey) {
  const res = await fetch(
    `${backendUrl}?magicKey=${encodeURIComponent(magicKey)}`
  );

  const data = await res.json();
  const item = data.addresses?.[0];
  if (!item) return;

  const fullAddress = formatAddress(item);
  selectedAddress = fullAddress;

  document.getElementById("addressInput").value = fullAddress;
  renderSuggestions([]);

  JFCustomWidget.sendData({
    valid: true,
    value: fullAddress
  });
}

/* ---------------------------------------
   FORMAT ADDRESS
---------------------------------------- */
function formatAddress(item) {
  const parts = [];

  if (item.addr_line1) parts.push(item.addr_line1);
  if (item.city) parts.push(item.city);

  const stateZip = [item.state, item.postal].filter(Boolean).join(" ");
  if (stateZip) parts.push(stateZip);

  return parts.join(", ");
}