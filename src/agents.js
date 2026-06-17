const rupee = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

function getSku(state, skuId) {
  return state.skus.find((sku) => sku.id === skuId);
}

function getChannel(state, channelId) {
  return state.channels.find((channel) => channel.id === channelId) || { priority: 1, slaHours: 24, name: channelId };
}

function availableStock(row) {
  return Math.max(0, row.stock + row.inTransit - row.committed);
}

function coverHours(row) {
  const velocityPerHour = Math.max(row.velocity24h / 24, 0.05);
  return availableStock(row) / velocityPerHour;
}

function riskLevel(hours) {
  if (hours <= 8) return 'critical';
  if (hours <= 18) return 'high';
  if (hours <= 36) return 'medium';
  return 'low';
}

function riskScore(row, state) {
  const hours = coverHours(row);
  const sku = getSku(state, row.skuId);
  const channel = getChannel(state, row.channel);
  const urgency = Math.max(0, 1 - (hours / 72));
  const velocity = Math.min(1.6, row.velocity24h / 14);
  const heroMultiplier = sku && sku.hero ? 1.2 : 1;
  const channelMultiplier = channel.priority || 1;
  return Math.min(99, Math.round(urgency * velocity * heroMultiplier * channelMultiplier * 100));
}

function recoveredRevenueEstimate(row, state, transferUnits = 1) {
  const sku = getSku(state, row.skuId);
  const channel = getChannel(state, row.channel);
  const atRiskUnits = Math.max(1, Math.min(transferUnits, Math.ceil(row.velocity24h * 0.65)));
  const grossMargin = sku.price * sku.grossMarginPct;
  return Math.round(atRiskUnits * grossMargin * channel.priority);
}

function createAudit(state, type, detail, meta = {}) {
  const entry = {
    id: `AUD-${String(state.audit.length + 1).padStart(4, '0')}`,
    timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type,
    detail,
    meta
  };
  state.audit.unshift(entry);
  return entry;
}

function createRecommendation(state, payload) {
  const id = `REC-${String(state.recommendations.length + 1).padStart(4, '0')}`;
  const recommendation = {
    id,
    status: 'pending',
    createdAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    ...payload
  };
  state.recommendations.unshift(recommendation);
  createAudit(state, 'Recommendation created', `${recommendation.agent} recommended ${recommendation.action}`, { recommendationId: id });
  return recommendation;
}

function runDemandSensingAgent(state) {
  const riskyRows = state.inventory
    .filter((row) => row.channel !== 'STORE')
    .map((row) => ({ row, score: riskScore(row, state), hours: coverHours(row) }))
    .filter((item) => item.score >= 45 || item.hours <= 24)
    .sort((a, b) => b.score - a.score);

  const top = riskyRows[0];
  if (!top) {
    createAudit(state, 'Demand Sensing Agent', 'No SKU-channel combination is breaching risk threshold.');
    return null;
  }

  const sku = getSku(state, top.row.skuId);
  state.agentStatus['Demand Sensing Agent'] = 'Detected spike';
  createAudit(
    state,
    'Demand spike detected',
    `${sku.style} size ${sku.size} has ${Math.round(top.hours)} hours cover in ${getChannel(state, top.row.channel).name}.`,
    { skuId: top.row.skuId, riskScore: top.score }
  );
  return top;
}

function runAllocationAgent(state, demandSignal) {
  if (!demandSignal) return null;
  const target = demandSignal.row;
  const channel = getChannel(state, target.channel);
  const sku = getSku(state, target.skuId);
  state.agentStatus['Allocation Agent'] = `Prioritized ${channel.name}`;
  createAudit(
    state,
    'Allocation priority set',
    `${channel.name} prioritized for ${sku.style} because stock cover is below SLA and full-price margin is protected.`,
    { channel: target.channel, slaHours: channel.slaHours }
  );
  return { target, channel, sku };
}

function findBestSourceStore(state, target) {
  const candidateStores = state.inventory
    .filter((row) => row.skuId === target.skuId && row.channel === 'STORE' && availableStock(row) >= 4)
    .map((row) => {
      const hours = coverHours(row);
      const store = state.stores.find((s) => s.id === row.locationId);
      const transferCost = (store?.leadHoursToD2C || 6) * 180;
      const donorRiskPenalty = riskScore(row, state) * 75;
      const excessUnits = Math.max(0, availableStock(row) - Math.ceil(row.velocity24h * 2));
      const score = (hours * 12) + (excessUnits * 240) - transferCost - donorRiskPenalty;
      return { row, store, hours, excessUnits, transferCost, donorRiskPenalty, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidateStores[0] || null;
}

function runTransferAgent(state, allocation) {
  if (!allocation) return null;
  const { target, channel, sku } = allocation;
  const source = findBestSourceStore(state, target);
  if (!source) {
    state.agentStatus['Transfer Agent'] = 'No safe donor store';
    createAudit(state, 'Transfer Agent', `No donor store found for ${sku.style} size ${sku.size}.`);
    return null;
  }

  const targetGap = Math.ceil(Math.max(4, target.velocity24h * 0.65));
  const units = Math.min(source.excessUnits || 6, targetGap, 8);
  const recovered = recoveredRevenueEstimate(target, state, units);
  const netImpact = Math.max(0, recovered - source.transferCost);

  state.agentStatus['Transfer Agent'] = `Found ${source.row.location}`;
  return createRecommendation(state, {
    agent: 'Transfer Agent',
    action: `Move ${units} units to ${channel.name}`,
    skuId: target.skuId,
    style: `${sku.style} ${sku.size} ${sku.color}`,
    from: source.row.location,
    fromLocationId: source.row.locationId,
    to: target.location,
    toLocationId: target.locationId,
    channel: channel.name,
    units,
    reason: `${source.row.location} has ${Math.round(source.hours)} hours of cover; ${target.location} has ${Math.round(coverHours(target))} hours and is below SLA.`,
    confidence: Math.min(96, Math.max(76, 100 - Math.round(riskScore(source.row, state) / 2))),
    recoveredRevenue: recovered,
    transferCost: source.transferCost,
    netImpact,
    riskAvoided: riskScore(target, state),
    requiresApproval: true
  });
}

function runReplenishmentAgent(state) {
  const riskyRows = state.inventory
    .filter((row) => row.channel !== 'STORE' && riskScore(row, state) > 35)
    .sort((a, b) => riskScore(b, state) - riskScore(a, state));

  if (!riskyRows.length) {
    state.agentStatus['Replenishment Agent'] = 'No breach';
    return null;
  }

  const target = riskyRows[0];
  const sku = getSku(state, target.skuId);
  const warehouse = state.warehouse.find((row) => row.skuId === target.skuId);
  if (!warehouse || warehouse.available <= 0) return null;

  const units = Math.min(18, warehouse.available, Math.max(8, Math.ceil(target.velocity24h)));
  const recovered = Math.round(units * sku.price * sku.grossMarginPct * 0.55);
  state.agentStatus['Replenishment Agent'] = `Warehouse order ${units} units`;
  createAudit(
    state,
    'Warehouse replenishment signal',
    `Prepare ${units} units of ${sku.style} size ${sku.size} from ${warehouse.location} to ${target.location}.`,
    { skuId: target.skuId, units, leadHours: warehouse.leadHours }
  );

  return createRecommendation(state, {
    agent: 'Replenishment Agent',
    action: `Replenish ${units} units from warehouse`,
    skuId: target.skuId,
    style: `${sku.style} ${sku.size} ${sku.color}`,
    from: warehouse.location,
    fromLocationId: warehouse.locationId,
    to: target.location,
    toLocationId: target.locationId,
    channel: getChannel(state, target.channel).name,
    units,
    reason: `Warehouse has ${warehouse.available} units; channel cover is ${Math.round(coverHours(target))} hours with ${warehouse.leadHours} hour lead time.`,
    confidence: 88,
    recoveredRevenue: recovered,
    transferCost: warehouse.leadHours * 90,
    netImpact: Math.max(0, recovered - warehouse.leadHours * 90),
    riskAvoided: riskScore(target, state),
    requiresApproval: true
  });
}

function runInventoryAccuracyAgent(state) {
  const sampleRows = [
    { location: 'Primary Warehouse Bay A-14', sku: 'Boston size 42', expected: 42, detected: 39, action: 'Cycle count required' },
    { location: 'Returns Table 03', sku: 'Arizona size 41', expected: 8, detected: 8, action: 'No variance' },
    { location: 'Dispatch Lane 02', sku: 'Gizeh size 39', expected: 12, detected: 11, action: 'Hold dispatch; verify one carton' }
  ];
  state.visionResults = sampleRows;
  state.agentStatus['Inventory Accuracy Agent'] = 'Variance flagged';
  createAudit(state, 'Inventory Accuracy Agent', 'AI vision cycle count completed; 2 exceptions routed to warehouse supervisor.');
  return sampleRows;
}

function runReturnsRestockAgent(state) {
  const sku = getSku(state, 'ARZ-41-SAND');
  state.agentStatus['Returns Restock Agent'] = 'Grade A relist';
  createAudit(
    state,
    'Returns restock decision',
    `${sku.style} size ${sku.size} return graded A. Relist to D2C pool because online demand velocity is elevated.`,
    { skuId: sku.id }
  );
  return true;
}

function runAllAgents(state) {
  state.agentStatus = Object.fromEntries(state.agents.map((agent) => [agent.name, 'Running']));
  const demandSignal = runDemandSensingAgent(state);
  const allocation = runAllocationAgent(state, demandSignal);
  runTransferAgent(state, allocation);
  runReplenishmentAgent(state);
  runInventoryAccuracyAgent(state);
  runReturnsRestockAgent(state);
  Object.keys(state.agentStatus).forEach((name) => {
    if (state.agentStatus[name] === 'Running') state.agentStatus[name] = 'Complete';
  });
}

function approveRecommendation(state, recId) {
  const rec = state.recommendations.find((item) => item.id === recId);
  if (!rec || rec.status === 'approved') return null;
  rec.status = 'approved';
  rec.approvedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const source = state.inventory.find((row) => row.skuId === rec.skuId && row.locationId === rec.fromLocationId);
  const target = state.inventory.find((row) => row.skuId === rec.skuId && row.locationId === rec.toLocationId);
  if (source) source.stock = Math.max(0, source.stock - rec.units);
  if (target) target.inTransit += rec.units;

  state.protectedRevenue += rec.netImpact;
  state.stockoutsAvoided += Math.max(1, Math.round(rec.riskAvoided / 35));
  const sapSto = `SAP-STO-${Date.now().toString().slice(-6)}`;
  const wmsTask = `WMS-PICK-${String(state.executions.length + 1).padStart(4, '0')}`;
  const execution = {
    id: `EXE-${String(state.executions.length + 1).padStart(4, '0')}`,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    sapSto,
    wmsTask,
    detail: `${rec.action}: ${rec.from} → ${rec.to}`,
    status: 'Mock action created'
  };
  state.executions.unshift(execution);
  createAudit(state, 'Human approval captured', `${rec.id} approved. ${sapSto} and ${wmsTask} created as mock downstream actions.`, { recId: rec.id });
  return execution;
}

window.AgentEngine = {
  cloneDeep,
  rupee,
  getSku,
  availableStock,
  coverHours,
  riskLevel,
  riskScore,
  recoveredRevenueEstimate,
  createAudit,
  runAllAgents,
  runDemandSensingAgent,
  runInventoryAccuracyAgent,
  approveRecommendation
};
