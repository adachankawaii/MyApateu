initTheme();

async function loadBills() {
  const list = document.getElementById("bills-list");
  list.innerHTML = "<p>Đang tải hóa đơn...</p>";
  try {
    const data = await getJSON("/fees");
    list.innerHTML = data.map(f =>
      `<div class="bill-item">
        <h4>${f.fee_name}</h4>
        <p><b>Loại:</b> ${f.fee_type}</p>
        <p><b>Kỳ hạn:</b> ${f.period}</p>
        <p><b>Số tiền:</b> ${f.amount_due.toLocaleString()} ₫</p>
        <p><b>Trạng thái:</b>
           <span class="${f.status === 'PAID' ? 'paid' : 'unpaid'}">
             ${f.status}
           </span>
        </p>
      </div>`
    ).join("");
  } catch {
    list.innerHTML = `<p style="color:red">Không thể tải danh sách hóa đơn.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadBills);
