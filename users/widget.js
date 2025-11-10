(() => {
  const API_URL = "https://myefnonvpjbggqqurvhy.supabase.co/functions/v1/users";
  let users = [];

  const searchInput = document.getElementById("searchUser");
  const dropdown = document.getElementById("dropdown");
  const details = document.getElementById("details");

  async function loadUsers() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Fetch failed");
      users = await res.json();
      console.log(`✅ Loaded ${users.length} users`);
    } catch (err) {
      console.error("❌ Error fetching users:", err);
    }
  }

  function sendToJotform(data) {
    try {
      if (window.JFCustomWidget) {
        JFCustomWidget.sendData({ valid: true, value: JSON.stringify(data) });
      }
    } catch (err) {
      console.warn("⚠ sendData failed:", err);
    }
  }

  function showDetails(user) {
    const map = [
      "displayname",
      "mail",
      "jobtitle",
      "department",
      "manager",
      "managermail",
      "employeeId",
      "division"
    ];
    map.forEach(key => {
      const el = document.getElementById(key);
      if (el) el.textContent = user[key] || "";
    });
    details.classList.remove("hidden");
  }

  function buildDropdown(matches) {
    dropdown.innerHTML = "";
    matches.forEach(u => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = u.displayname || "(No Name)";
      item.onclick = () => {
        searchInput.value = u.displayname || "";
        dropdown.innerHTML = "";
        showDetails(u);
        sendToJotform(u);
      };
      dropdown.appendChild(item);
    });
  }

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    dropdown.innerHTML = "";
    if (!query) return;

    const matches = users
      .filter(u => (u.displayname || "").toLowerCase().includes(query))
      .slice(0, 8);
    if (matches.length) buildDropdown(matches);
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== searchInput)
      dropdown.innerHTML = "";
  });

  if (window.JFCustomWidget) {
    JFCustomWidget.subscribe("ready", function () {
      console.log("✅ Jotform Widget Ready");
      sendToJotform({ valid: true, value: "" });
      loadUsers();
    });
  } else {
    loadUsers(); // Local test mode
  }
})();
