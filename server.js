const express = require("express");
const path = require("path");

const equipmentRaw = require("./data/equipment.json");
const laborRatesRaw = require("./data/labor_rates.json");
const customersRaw = require("./data/customers.json");

const { normalizeEquipment, normalizeCustomers } = require("./lib/normalize");
const { buildEstimate } = require("./lib/pricing");

const equipment = normalizeEquipment(equipmentRaw);
const customers = normalizeCustomers(customersRaw);
// Labor rates are already consistent in the source data, so no normalization needed —
// but if that ever changes, this is the one place to add it.
const laborRates = laborRatesRaw;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/customers", (req, res) => {
  res.json(customers);
});

app.get("/api/equipment", (req, res) => {
  res.json(equipment);
});

app.get("/api/labor-rates", (req, res) => {
  res.json(laborRates);
});

app.post("/api/estimate", (req, res) => {
  const { customerId, jobType, level, equipmentIds = [] } = req.body;

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return res.status(400).json({ error: `Unknown customerId: ${customerId}` });
  }

  const equipmentItems = equipmentIds
    .map((id) => equipment.find((e) => e.id === id))
    .filter(Boolean);

  if (equipmentIds.length !== equipmentItems.length) {
    return res.status(400).json({ error: "One or more equipmentIds were not found." });
  }

  try {
    const estimate = buildEstimate({ customer, jobType, level, equipmentItems, laborRates });
    res.json(estimate);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Field Estimate Tool running at http://localhost:${PORT}`);
});
