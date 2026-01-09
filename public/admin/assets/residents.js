initTheme();

async function loadResidents() {
  const list = document.getElementById("residents-list");
  list.innerHTML = "<p>Đang tải dữ liệu...</p>";
  try {
    const data = await getJSON("/rooms");
    list.innerHTML = data.map(r =>
      `<div class="resident-item">
        <h4>${r.name || "Phòng " + r.id}</h4>
        <p><b>Trưởng phòng:</b> ${r.head_name || "(chưa có)"} — ${r.phone || "-"}</p>
        <p><b>Trạng thái:</b> ${r.status || "?"}</p>
        <p><b>Loại phòng:</b> ${r.room_type || "?"}</p>
        <p><b>Số cư dân:</b> ${r.occupants_count_calc ?? 0}</p>
      </div>`
    ).join("");
  } catch {
    list.innerHTML = `<p style="color:red">Không thể tải danh sách cư dân.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadResidents);
