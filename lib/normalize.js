/**
 * normalize.js
 *
 * The source data in /data was "exported from different tools at different
 * times" (per the README), which shows up as inconsistent field naming:
 *   - equipment.json:  most items use `baseCost`, a couple use `base_cost`
 *   - customers.json:  most records use `propertyType`/`squareFootage`,
 *                       one uses `property_type`/`sqft`
 *   - customers.json:  `phone` and `lastServiceDate` are missing on some records
 *
 * Rather than fixing the JSON files by hand (which just hides the problem),
 * this module normalizes every record as it's read, so the rest of the app
 * can rely on one consistent shape. This is the kind of defensive parsing
 * you want in production when data comes from an upstream system you don't
 * fully control.
 */

function normalizeEquipment(rawList) {
  return rawList.map((item) => {
    const baseCost = item.baseCost ?? item.base_cost ?? null;

    if (baseCost === null) {
      console.warn(`[normalize] Equipment ${item.id ?? "(unknown id)"} is missing a cost field — skipping cost.`);
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category ?? "Uncategorized",
      brand: item.brand ?? "Unknown",
      modelNumber: item.modelNumber ?? "N/A",
      baseCost,
    };
  });
}

function normalizeCustomer(raw) {
  const propertyType = raw.propertyType ?? raw.property_type ?? "unknown";
  const squareFootage = raw.squareFootage ?? raw.sqft ?? null;

  return {
    id: raw.id,
    name: raw.name,
    address: raw.address ?? "No address on file",
    phone: raw.phone ?? null,
    propertyType,
    squareFootage,
    systemType: raw.systemType ?? "Not specified",
    systemAge: raw.systemAge ?? null,
    lastServiceDate: raw.lastServiceDate ?? null,
  };
}

function normalizeCustomers(rawList) {
  return rawList.map(normalizeCustomer);
}

module.exports = { normalizeEquipment, normalizeCustomers, normalizeCustomer };
