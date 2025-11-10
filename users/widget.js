(() => {
  const API_URL = "https://myefnonvpjbggqqurvhy.supabase.co/functions/v1/users";
  let users = [];

  const searchInput = document.getElementById("searchUser");
  const dropdown = document.getElementById("dropdown");
  const details = document.getElementById("details");
  const note = document.getElementById("note");

  async function loadUsers() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Fetch failed");
      users = await res.json();
    } catch {
      // Silent fail to protect PHI visibility
    }
  }

  function sendToJotform(user) {
    try {
      if (window.JFCustomWidget) {
        // 1️⃣ Send full JSON to submission
        JFCustomWidget.sendData({
          valid: true,
          value: JSON.stringify(user)
        });

        // 2️⃣ Try inline population (non-HIPAA forms)
        const mapping = {
          "input_5": user.displayname,
          "input_6": user.mail,
          "input_7": user.jobtitle,
          "input_8": user.department,
          "input_9": user.manager,
          "input_10": user.managermail,
          "input_11": user.employeeId,
          "input_12": user.division
        };

        if (typeof JFCustomWidget.setFieldValue === "function") {
          Object.entries(mapping).forEach(([fieldId, value]) => {
            try {
              JFCustomWidget.setFieldValue(fieldId, value || "");
            } catch {}
          });
        }
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
    JFCustomWidget.subscribe("ready", () => {
      JFCustomWidget.sendData({ valid: true, value: "" });
      loadUsers();
    });
  } else {
    loadUsers(); // Local preview fallback
  }
})();
