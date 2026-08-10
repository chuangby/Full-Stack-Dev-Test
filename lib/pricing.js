/**
 * pricing.js
 *
 * Core estimate math, deliberately kept separate from server.js / routing
 * so it's easy to read, test, and reason about on its own.
 */

// Flat trip/service-call fee. This wasn't in the source data — it's a
// common real-world HVAC billing practice (a base charge just for showing
// up), and it's called out explicitly in the write-up as an assumption.
const SERVICE_CALL_FEE = 89;

function findLaborRate(laborRates, jobType, level) {
  const match = laborRates.find((r) => r.jobType === jobType && r.level === level);
  if (!match) {
    throw new Error(`No labor rate found for jobType="${jobType}", level="${level}"`);
  }
  return match;
}

function calculateLaborCost(laborRate) {
  const { hourlyRate, estimatedHours } = laborRate;
  return {
    hourlyRate,
    estimatedHours,
    low: Math.round(hourlyRate * estimatedHours.min * 100) / 100,
    high: Math.round(hourlyRate * estimatedHours.max * 100) / 100,
  };
}

function calculateEquipmentTotal(equipmentItems) {
  return equipmentItems.reduce((sum, item) => sum + (item.baseCost ?? 0), 0);
}

/**
 * Build a full estimate.
 *
 * @param {object} params
 * @param {object} params.customer - normalized customer record
 * @param {string} params.jobType
 * @param {string} params.level
 * @param {object[]} params.equipmentItems - normalized equipment records selected for this job
 * @param {object[]} params.laborRates - full normalized labor rate table
 * @param {boolean} [params.includeServiceCallFee=true]
 */
function buildEstimate({ customer, jobType, level, equipmentItems, laborRates, includeServiceCallFee = true }) {
  const laborRate = findLaborRate(laborRates, jobType, level);
  const labor = calculateLaborCost(laborRate);
  const equipmentTotal = calculateEquipmentTotal(equipmentItems);
  const serviceCallFee = includeServiceCallFee ? SERVICE_CALL_FEE : 0;

  const low = labor.low + equipmentTotal + serviceCallFee;
  const high = labor.high + equipmentTotal + serviceCallFee;

  return {
    customer,
    jobType,
    level,
    labor,
    equipmentItems,
    equipmentTotal,
    serviceCallFee,
    total: { low, high },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { buildEstimate, findLaborRate, calculateLaborCost, calculateEquipmentTotal, SERVICE_CALL_FEE };
