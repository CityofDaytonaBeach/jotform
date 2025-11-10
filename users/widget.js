console.clear();
console.log("👤 Users Widget Loaded");

// ===== CONFIG =====
const API_URL = "https://myefnonvpjbggqqurvhy.supabase.co/functions/v1/users";
let users = [];

const searchInput = document.getElementById("searchUser");
const resultsContainer = document.getElementById("resultsContainer");

// ===== SAFE SEND TO JOTFORM =====
function sendWidgetData(data) {
  try {
    if (window.JFCustomWidget) JFCustomWidget.sendData(data);
  } catch (err) {
    console.warn("⚠ sendData failed:", err);
  }
}

// ===== LOAD USER DATA =====
async function loadUsers() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    users = await res.json();
    console.log(`✅ Loaded ${users.length} users`);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
  }
}

loadUsers();

// ===== AUTOCOMPLETE =====
let debounceTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => handleSearch(e.target.value.trim().toLowerCase()), 150);
});

function handleSearch(query) {
  resultsContainer.querySelectorAll(".dropdown").forEach(d => d.remove());
  if (!query) return;

  const matches = users
    .filter(u => (u.displayname || "").toLowerCase().includes(query))
    .slice(0, 8);
  if (!matches.length) return;

  const dropdown = document.createElement("div");
  dropdown.className = "dropdown";

  matches.forEach(u => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = u.displayname || "(No Name)";
    item.addEventListener("click", () => {
      searchInput.value = u.displayname || "";
      dropdown.remove();
      console.log("✅ Selected user:", u);

      // Send selected user to Jotform
      sendWidgetData({ valid: true, value: JSON.stringify(u) });
    });
    dropdown.appendChild(item);
  });

  resultsContainer.appendChild(dropdown);
}

// ===== CLICK OUTSIDE TO CLOSE =====
document.addEventListener("click", (e) => {
  if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
    resultsContainer.querySelectorAll(".dropdown").forEach(d => d.remove());
  }
});

// ===== JOTFORM READY =====
if (window.JFCustomWidget) {
  JFCustomWidget.subscribe("ready", function () {
    console.log("✅ Users Widget Ready");
    sendWidgetData({ valid: true, value: "" });
  });
}
