initTheme();

async function loadParking() {
  const list = document.getElementById("parking-list");
  list.innerHTML = "<p>Đang tải danh sách xe...</p>";
  try {
    const data = await getJSON("/vehicles");
    list.innerHTML = data.map(v =>
      `<div class="parking-item">
        <h4>${v.plate || "Xe"}</h4>
        <p><b>Loại:</b> ${v.vehicle_type}</p>
        <p><b>Trạng thái:</b> ${v.parking_status}</p>
        <p><b>Slot:</b> ${v.parking_slot || "-"}</p>
        <p><b>Chủ sở hữu:</b> ${v.owner_name || "-"}</p>
      </div>`
    ).join("");
  } catch {
    list.innerHTML = `<p style="color:red">Không thể tải dữ liệu xe.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadParking);
