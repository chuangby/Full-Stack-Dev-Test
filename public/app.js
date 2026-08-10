let customers = [];
let equipment = [];
let laborRates = [];
let selectedEquipmentIds = new Set();

const customerSelect = document.getElementById("customerSelect");
const customerDetails = document.getElementById("customerDetails");
const jobTypeSelect = document.getElementById("jobTypeSelect");
const levelSelect = document.getElementById("levelSelect");
const equipmentFilter = document.getElementById("equipmentFilter");
const equipmentListEl = document.getElementById("equipmentList");
const calculateBtn = document.getElementById("calculateBtn");
const formError = document.getElementById("formError");
const ticketEl = document.getElementById("ticket");

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

async function init() {
  const [c, e, l] = await Promise.all([
    fetch("/api/customers").then((r) => r.json()),
    fetch("/api/equipment").then((r) => r.json()),
    fetch("/api/labor-rates").then((r) => r.json()),
  ]);
  customers = c;
  equipment = e;
  laborRates = l;

  populateCustomers();
  populateJobTypes();
  renderEquipmentList("");
  bindEvents();
}

function populateCustomers() {
  for (const c of customers) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.name} — ${c.address.split(",")[0]}`;
    customerSelect.appendChild(opt);
  }
}

function populateJobTypes() {
  const types = [...new Set(laborRates.map((r) => r.jobType))];
  for (const t of types) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = capitalize(t);
    jobTypeSelect.appendChild(opt);
  }
}

function populateLevels(jobType) {
  levelSelect.innerHTML = "";
  const levels = laborRates.filter((r) => r.jobType === jobType);

  if (!jobType || levels.length === 0) {
    levelSelect.disabled = true;
    levelSelect.innerHTML = '<option value="">Select job type first&hellip;</option>';
    return;
  }

  levelSelect.disabled = false;
  levelSelect.innerHTML = '<option value="">Select scope&hellip;</option>';
  for (const l of levels) {
    const opt = document.createElement("option");
    opt.value = l.level;
    opt.textContent = `${capitalize(l.level)} ($${l.hourlyRate}/hr, ${l.estimatedHours.min}\u2013${l.estimatedHours.max} hrs)`;
    levelSelect.appendChild(opt);
  }
}

function renderEquipmentList(filterText) {
  const q = filterText.trim().toLowerCase();
  const filtered = equipment.filter((item) => {
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q)
    );
  });

  equipmentListEl.innerHTML = "";
  if (filtered.length === 0) {
    equipmentListEl.innerHTML = '<div class="equipment-row"><span class="cat">No matches</span></div>';
    return;
  }

  for (const item of filtered) {
    const row = document.createElement("div");
    row.className = "equipment-row";
    const checked = selectedEquipmentIds.has(item.id) ? "checked" : "";
    row.innerHTML = `
      <input type="checkbox" id="eq-${item.id}" ${checked} />
      <label for="eq-${item.id}">
        ${item.name}
        <span class="cat">${item.category} &middot; ${item.brand}</span>
      </label>
      <span class="cost">${item.baseCost != null ? money(item.baseCost) : "N/A"}</span>
    `;
    row.querySelector("input").addEventListener("change", (e) => {
      if (e.target.checked) selectedEquipmentIds.add(item.id);
      else selectedEquipmentIds.delete(item.id);
      updateCalculateEnabled();
    });
    equipmentListEl.appendChild(row);
  }
}

function renderCustomerDetails(customer) {
  if (!customer) {
    customerDetails.className = "customer-details empty";
    customerDetails.textContent = "Pick a customer to see property details.";
    return;
  }
  customerDetails.className = "customer-details";
  customerDetails.innerHTML = `
    <div><b>${customer.name}</b></div>
    <div>${customer.address}</div>
    <div>${capitalize(customer.propertyType)} &middot; ${customer.squareFootage ? customer.squareFootage + " sq ft" : "sq ft unknown"}</div>
    <div>System: ${customer.systemType}${customer.systemAge != null ? ` (${customer.systemAge} yrs old)` : ""}</div>
    <div>Last service: ${customer.lastServiceDate ?? "No record on file"}</div>
  `;
}

function updateCalculateEnabled() {
  const ready = customerSelect.value && jobTypeSelect.value && levelSelect.value;
  calculateBtn.disabled = !ready;
}

function bindEvents() {
  customerSelect.addEventListener("change", () => {
    const customer = customers.find((c) => c.id === customerSelect.value);
    renderCustomerDetails(customer);
    updateCalculateEnabled();
  });

  jobTypeSelect.addEventListener("change", () => {
    populateLevels(jobTypeSelect.value);
    updateCalculateEnabled();
  });

  levelSelect.addEventListener("change", updateCalculateEnabled);

  equipmentFilter.addEventListener("input", (e) => renderEquipmentList(e.target.value));

  calculateBtn.addEventListener("click", handleCalculate);
}

async function handleCalculate() {
  formError.hidden = true;
  calculateBtn.disabled = true;
  calculateBtn.textContent = "Calculating\u2026";

  try {
    const res = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerSelect.value,
        jobType: jobTypeSelect.value,
        level: levelSelect.value,
        equipmentIds: [...selectedEquipmentIds],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");

    renderTicket(data);
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  } finally {
    calculateBtn.disabled = false;
    calculateBtn.textContent = "Calculate estimate";
  }
}

function renderTicket(estimate) {
  const { customer, jobType, level, labor, equipmentItems, equipmentTotal, serviceCallFee, total, generatedAt } = estimate;

  const equipmentRows = equipmentItems.length
    ? equipmentItems
        .map(
          (item) => `
      <div class="line-item">
        <span class="label">${item.name}<span class="meta">${item.brand} &middot; ${item.modelNumber}</span></span>
        <span class="value">${item.baseCost != null ? money(item.baseCost) : "N/A"}</span>
      </div>`
        )
        .join("")
    : '<div class="line-item"><span class="label meta">No equipment selected</span></div>';

  ticketEl.className = "ticket";
  ticketEl.innerHTML = `
    <div class="ticket-head">
      <div>
        <h2>Estimate</h2>
        <div class="sub">${capitalize(jobType)} &mdash; ${capitalize(level)}</div>
      </div>
      <div class="ticket-meta">
        ${new Date(generatedAt).toLocaleDateString()}<br/>
        ${new Date(generatedAt).toLocaleTimeString()}
      </div>
    </div>

    <div class="ticket-section">
      <h3>Customer</h3>
      <div class="line-item"><span class="label"><b>${customer.name}</b><span class="meta">${customer.address}</span></span></div>
      <div class="line-item"><span class="label meta">${customer.systemType}</span></div>
    </div>

    <div class="ticket-section">
      <h3>Labor</h3>
      <div class="line-item">
        <span class="label">${capitalize(jobType)} (${capitalize(level)})<span class="meta">$${labor.hourlyRate}/hr &times; ${labor.estimatedHours.min}\u2013${labor.estimatedHours.max} hrs</span></span>
        <span class="value">${money(labor.low)} \u2013 ${money(labor.high)}</span>
      </div>
    </div>

    <div class="ticket-section">
      <h3>Equipment</h3>
      ${equipmentRows}
      ${equipmentItems.length ? `<div class="line-item"><span class="label"><b>Equipment subtotal</b></span><span class="value">${money(equipmentTotal)}</span></div>` : ""}
    </div>

    <div class="ticket-section">
      <h3>Service call fee</h3>
      <div class="line-item"><span class="label meta">Standard trip charge</span><span class="value">${money(serviceCallFee)}</span></div>
    </div>

    <div class="total-block">
      <span class="total-label">Estimated total</span>
      <span class="total-stamp">${money(total.low)} \u2013 ${money(total.high)}</span>
    </div>

    <p class="ticket-note">Estimate only &mdash; final price may vary based on site conditions. Valid for 30 days.</p>

    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  `;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

init();
