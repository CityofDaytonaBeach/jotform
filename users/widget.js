(() => {
  const API_URL = "https://myefnonvpjbggqqurvhy.supabase.co/functions/v1/users";
  let users = [];

  const searchInput = document.getElementById("searchUser");
  const dropdown = document.getElementById("dropdown");
  const details = document.getElementById("details");
  const note = document.getElementById("note");

  // Load users once
  async function loadUsers() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Fetch failed");
      users = await res.json();
    } catch (err) {
      // no console logs to avoid PHI leaks
    }
  }

  function sendToJotform(user) {
    try {
      if (window.JFCustomWidget) {
        JFCustomWidget.sendData({
          valid: true,
          value: JSON.stringify(user)
        });
      }
    } catch {}
  }

  function showDetails(user) {
    const fields = [
      "displayname",
      "mail",
      "jobtitle",
      "department",
      "manager",
      "managermail",
      "employeeId",
      "division"
    ];
    fields.forEach(k => {
      const el = document.getElementById(k);
      if (el) el.textContent = user[k] || "";
    });
    details.classList.remove("hidden");
    note.classList.remove("hidden");
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
    dropdown.classList.remove("hidden");
  }

  // Filtering logic
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();
    dropdown.innerHTML = "";
    if (!query) {
      dropdown.classList.add("hidden");
      return;
    }
    const matches = users
      .filter(u => (u.displayname || "").toLowerCase().includes(query))
      .slice(0, 8);
    if (matches.length) buildDropdown(matches);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== searchInput)
      dropdown.innerHTML = "";
  });

  if (window.JFCustomWidget) {
    JFCustomWidget.subscribe("ready", () => {
      JFCustomWidget.sendData({ valid: true, value: "" });
      loadUsers();
    });
  } else {
    loadUsers(); // Local preview fallback
  }
})();
