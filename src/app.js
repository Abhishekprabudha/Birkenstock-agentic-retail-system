const { cloneDeep, rupee, getSku, availableStock, coverHours, riskLevel, riskScore, createAudit } = window.AgentEngine;

const agentDefinitions = [
  { name: 'Demand Sensing Agent', description: 'Detects sale-event uplift, velocity spikes and stockout countdowns.' },
  { name: 'Allocation Agent', description: 'Prioritizes store, D2C or marketplace based on margin, SLA and demand signal.' },
  { name: 'Replenishment Agent', description: 'Creates warehouse replenishment triggers before hero SKUs breach safety stock.' },
  { name: 'Transfer Agent', description: 'Finds the best store-to-store or store-to-D2C movement with donor-store guardrails.' },
  { name: 'Inventory Accuracy Agent', description: 'Uses simulated computer vision results to flag digital-vs-physical variance.' },
  { name: 'Returns Restock Agent', description: 'Grades returned products and routes sellable units back into the best channel.' }
];

const baseState = {
  ...cloneDeep(window.BIRKENSTOCK_DATA),
  agents: agentDefinitions,
  agentStatus: Object.fromEntries(agentDefinitions.map((agent) => [agent.name, 'Standby'])),
  recommendations: [],
  audit: [],
  executions: [],
  visionResults: [],
  protectedRevenue: 0,
  stockoutsAvoided: 0,
  scenarioActive: false,
  liveFeedActive: true,
  liveEvents: [],
  todayOrders: 184,
  conversionRate: 4.8,
  liveRevenue: 2340000,
  lastEventAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
};

let state = cloneDeep(baseState);

const els = {
  riskCards: document.getElementById('riskCards'),
  recommendationSpotlight: document.getElementById('recommendationSpotlight'),
  agentGrid: document.getElementById('agentGrid'),
  retailTwinTable: document.getElementById('retailTwinTable'),
  skuFilter: document.getElementById('skuFilter'),
  revenueAtRisk: document.getElementById('revenueAtRisk'),
  protectedRevenue: document.getElementById('protectedRevenue'),
  heroRiskLabel: document.getElementById('heroRiskLabel'),
  visionResults: document.getElementById('visionResults'),
  executionConsole: document.getElementById('executionConsole'),
  auditTrail: document.getElementById('auditTrail'),
  roiCards: document.getElementById('roiCards'),
  reportOutput: document.getElementById('reportOutput'),
  toast: document.getElementById('toast'),
  liveMetrics: document.getElementById('liveMetrics'),
  liveFeed: document.getElementById('liveFeed')
};

let liveTimer = null;

function init() {
  state.audit = [
    {
      id: 'AUD-0000',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'System ready',
      detail: 'Retail twin loaded with seeded SAP, Shopify, POS, WMS and marketplace data.',
      meta: {}
    }
  ];
  populateSkuFilter();
  wireEvents();
  render();
}

function populateSkuFilter() {
  els.skuFilter.innerHTML = `<option value="ALL">All SKUs</option>` + state.skus
    .map((sku) => `<option value="${sku.id}">${sku.style} ${sku.size} ${sku.color}</option>`)
    .join('');
}

function wireEvents() {
  document.getElementById('launchSpike').addEventListener('click', launchDemandSpike);
  document.getElementById('runAgents').addEventListener('click', () => {
    window.AgentEngine.runAllAgents(state);
    showToast('Agent swarm completed: decisions, audit trail and mock execution recommendations generated.');
    render();
  });
  document.getElementById('resetDemo').addEventListener('click', resetDemo);
  document.getElementById('approveTopAction').addEventListener('click', approveTopRecommendation);
  document.getElementById('runVision').addEventListener('click', () => {
    window.AgentEngine.runInventoryAccuracyAgent(state);
    showToast('Inventory Accuracy Agent completed simulated vision cycle count.');
    render();
  });
  document.getElementById('exportReport').addEventListener('click', exportReport);
  document.getElementById('toggleLive').addEventListener('click', toggleLiveFeed);
  document.getElementById('simulateOrder').addEventListener('click', () => simulateLiveEvent('vip-order'));
  document.getElementById('receiveShipment').addEventListener('click', () => simulateLiveEvent('warehouse-drop'));
  document.getElementById('clearLiveFeed').addEventListener('click', clearLiveFeed);
  els.skuFilter.addEventListener('change', renderRetailTwin);
  startLiveFeed();
}

function launchDemandSpike() {
  if (!state.scenarioActive) {
    const multipliers = {
      'BST-42-BLK': { D2C: 2.8, MARKETPLACE: 2.2 },
      'ARZ-41-SAND': { D2C: 2.25, MARKETPLACE: 1.9 },
      'GZH-39-MOC': { D2C: 1.55, MARKETPLACE: 1.35 }
    };

    state.inventory.forEach((row) => {
      const skuMultipliers = multipliers[row.skuId];
      if (skuMultipliers && skuMultipliers[row.channel]) {
        row.velocity24h = Math.round(row.velocity24h * skuMultipliers[row.channel] * 10) / 10;
        row.committed += row.skuId === 'BST-42-BLK' ? 3 : 2;
      }
    });
    state.scenarioActive = true;
    createAudit(state, 'Scenario launched', 'Mumbai weekend spike applied to Arizona, Boston and Gizeh demand across D2C and marketplace feeds.');
    showToast('Mumbai weekend demand spike launched. Stockout risk has changed in real time.');
  } else {
    showToast('Spike already active. Run the Agent Swarm to generate the recommendations.');
  }
  render();
}

function resetDemo() {
  state = cloneDeep(baseState);
  state.audit = [
    {
      id: 'AUD-0000',
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'System reset',
      detail: 'Demo reset to baseline inventory, velocity and agent state.',
      meta: {}
    }
  ];
  document.getElementById('toggleLive').textContent = 'Pause Live Feed';
  showToast('Demo reset. You are back to the baseline operating state.');
  render();
}

function approveTopRecommendation() {
  const top = getTopRecommendation();
  if (!top) {
    showToast('No pending recommendation yet. Launch spike and run agents first.');
    return;
  }
  const execution = window.AgentEngine.approveRecommendation(state, top.id);
  if (execution) showToast(`${top.id} approved. Mock ${execution.sapSto} and ${execution.wmsTask} created.`);
  render();
}

function getTopRecommendation() {
  return state.recommendations
    .filter((rec) => rec.status === 'pending')
    .sort((a, b) => b.netImpact - a.netImpact)[0];
}

function getRiskRows() {
  return state.inventory
    .filter((row) => getSku(state, row.skuId)?.hero)
    .map((row) => ({ row, sku: getSku(state, row.skuId), score: riskScore(row, state), hours: coverHours(row) }))
    .sort((a, b) => b.score - a.score);
}

function totalRevenueAtRisk() {
  return getRiskRows()
    .filter((item) => item.score > 35)
    .reduce((sum, item) => sum + window.AgentEngine.recoveredRevenueEstimate(item.row, state, Math.max(2, Math.ceil(item.row.velocity24h * 0.4))), 0);
}

function render() {
  renderKpis();
  renderRiskCards();
  renderRecommendationSpotlight();
  renderAgents();
  renderRetailTwin();
  renderVisionResults();
  renderExecutionConsole();
  renderAuditTrail();
  renderRoiCards();
  renderLiveOps();
}

function renderKpis() {
  const revenueAtRisk = totalRevenueAtRisk();
  els.revenueAtRisk.textContent = rupee.format(revenueAtRisk);
  els.protectedRevenue.textContent = rupee.format(state.protectedRevenue);
  const maxRisk = Math.max(...getRiskRows().map((item) => item.score), 0);
  els.heroRiskLabel.textContent = maxRisk > 75 ? 'Critical' : maxRisk > 55 ? 'High' : maxRisk > 30 ? 'Watch' : 'Normal';
}

function renderRiskCards() {
  const topRisks = getRiskRows().slice(0, 5);
  els.riskCards.innerHTML = topRisks.map((item) => {
    const level = riskLevel(item.hours);
    const available = availableStock(item.row);
    const width = Math.min(100, Math.max(5, item.score));
    return `
      <div class="risk-card ${level}">
        <div>
          <h3>${item.sku.style} · Size ${item.sku.size} · ${item.row.location}</h3>
          <div class="risk-meta">
            <span>${item.row.channel}</span>
            <span>${available} available</span>
            <span>${Math.round(item.hours)}h cover</span>
            <span>${item.row.velocity24h}/day velocity</span>
          </div>
        </div>
        <div class="risk-score">
          ${item.score}
          <span>${level}</span>
        </div>
        <div class="progress"><div style="width:${width}%"></div></div>
      </div>`;
  }).join('');
}

function renderRecommendationSpotlight() {
  const top = getTopRecommendation() || state.recommendations[0];
  if (!top) {
    els.recommendationSpotlight.className = 'recommendation-empty';
    els.recommendationSpotlight.textContent = 'Trigger a demand spike to let agents recommend the first transfer.';
    return;
  }
  els.recommendationSpotlight.className = 'recommendation-card';
  const disabled = top.status === 'approved' ? 'disabled' : '';
  els.recommendationSpotlight.innerHTML = `
    <div>
      <span class="eyebrow">${top.agent} · ${top.status.toUpperCase()}</span>
      <div class="decision-title">${top.action}</div>
      <p>${top.reason}</p>
    </div>
    <div class="decision-grid">
      <div class="decision-item"><span>SKU</span><strong>${top.style}</strong></div>
      <div class="decision-item"><span>Route</span><strong>${top.from} → ${top.to}</strong></div>
      <div class="decision-item"><span>Expected net impact</span><strong>${rupee.format(top.netImpact)}</strong></div>
      <div class="decision-item"><span>Confidence</span><strong>${top.confidence}%</strong></div>
    </div>
    <div class="approval-row">
      <button class="approve" ${disabled} onclick="window.approveRecommendationById('${top.id}')">${top.status === 'approved' ? 'Approved' : 'Approve + Create Mock SAP/WMS Action'}</button>
      <button class="reject" onclick="window.showRecommendationEvidence('${top.id}')">Show Evidence</button>
    </div>
  `;
}

function renderAgents() {
  els.agentGrid.innerHTML = state.agents.map((agent) => {
    const status = state.agentStatus[agent.name] || 'Standby';
    const statusClass = status === 'Standby' ? '' : status === 'Running' ? 'active' : 'done';
    return `
      <div class="agent-card ${statusClass}">
        <h3>${agent.name}</h3>
        <p>${agent.description}</p>
        <div class="agent-status">${status}</div>
      </div>`;
  }).join('');
}

function renderRetailTwin() {
  const skuFilter = els.skuFilter.value || 'ALL';
  const rows = state.inventory
    .filter((row) => skuFilter === 'ALL' || row.skuId === skuFilter)
    .map((row) => ({ row, sku: getSku(state, row.skuId), hours: coverHours(row), risk: riskLevel(coverHours(row)), score: riskScore(row, state) }))
    .sort((a, b) => b.score - a.score);

  els.retailTwinTable.innerHTML = rows.map((item) => `
    <tr>
      <td><strong>${item.sku.style}</strong><br><span>${item.sku.size} · ${item.sku.color}</span></td>
      <td>${item.row.location}</td>
      <td>${item.row.channel}</td>
      <td>${availableStock(item.row)} <span>${item.row.inTransit ? `(+${item.row.inTransit} in transit)` : ''}</span></td>
      <td>${item.row.velocity24h}/day</td>
      <td>${Math.round(item.hours)}h</td>
      <td><span class="risk-tag ${item.risk}">${item.risk}</span></td>
      <td><button class="table-action" onclick="window.simulateRowOrder('${item.row.skuId}', '${item.row.locationId}')">Sell 1</button></td>
    </tr>
  `).join('');
}

function renderVisionResults() {
  if (!state.visionResults.length) {
    els.visionResults.innerHTML = `
      <div class="vision-row">
        <div><strong>Ready</strong><br><span>Run simulated AI vision count to flag stock variance.</span></div>
        <strong>Standby</strong>
      </div>`;
    return;
  }
  els.visionResults.innerHTML = state.visionResults.map((row) => `
    <div class="vision-row">
      <div>
        <strong>${row.location}</strong><br>
        <span>${row.sku} · Expected ${row.expected} · Detected ${row.detected}</span>
      </div>
      <strong>${row.action}</strong>
    </div>
  `).join('');
}

function renderExecutionConsole() {
  if (!state.executions.length) {
    els.executionConsole.innerHTML = `<div class="console-item">No downstream action yet.<span>Approve a recommendation to create mock SAP STO and WMS task.</span></div>`;
    return;
  }
  els.executionConsole.innerHTML = state.executions.map((execution) => `
    <div class="console-item">
      <strong>${execution.detail}</strong>
      <span><code>${execution.sapSto}</code> · <code>${execution.wmsTask}</code> · ${execution.status} · ${execution.time}</span>
    </div>
  `).join('');
}

function renderAuditTrail() {
  els.auditTrail.innerHTML = state.audit.slice(0, 16).map((entry) => `
    <div class="audit-item">
      <strong>${entry.type}</strong>
      <span>${entry.timestamp} · ${entry.detail}</span>
    </div>
  `).join('');
}

function renderRoiCards() {
  const fillRate = Math.min(98.5, state.baseline.fillRate + (state.stockoutsAvoided * 0.7));
  const manualHours = Math.max(8, state.baseline.manualHoursPerWeek - (state.executions.length * 4));
  const accuracy = state.visionResults.length ? 99.1 : state.baseline.inventoryAccuracy;
  const stockoutDelta = Math.min(70, Math.round((state.stockoutsAvoided / Math.max(1, state.baseline.stockoutEvents)) * 100));

  const cards = [
    ['Fill-rate', `${fillRate.toFixed(1)}%`],
    ['Stockout delta', `-${stockoutDelta}%`],
    ['Manual hours/week', `${manualHours}h`],
    ['Inventory accuracy', `${accuracy.toFixed(1)}%`],
    ['Protected revenue', rupee.format(state.protectedRevenue)],
    ['Mock actions created', `${state.executions.length}`]
  ];

  els.roiCards.innerHTML = cards.map(([label, value]) => `
    <div class="roi-card"><span>${label}</span><strong>${value}</strong></div>
  `).join('');
}


function startLiveFeed() {
  window.clearInterval(liveTimer);
  liveTimer = window.setInterval(() => {
    if (state.liveFeedActive) simulateLiveEvent();
  }, 4200);
}

function toggleLiveFeed() {
  state.liveFeedActive = !state.liveFeedActive;
  document.getElementById('toggleLive').textContent = state.liveFeedActive ? 'Pause Live Feed' : 'Resume Live Feed';
  createAudit(state, 'Live feed toggled', `Synthetic operations stream ${state.liveFeedActive ? 'resumed' : 'paused'} by presenter.`);
  showToast(state.liveFeedActive ? 'Synthetic live feed resumed.' : 'Synthetic live feed paused.');
  render();
}

function clearLiveFeed() {
  state.liveEvents = [];
  createAudit(state, 'Live feed cleared', 'Presenter cleared the synthetic event stream for the next demo sequence.');
  showToast('Live event feed cleared.');
  render();
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function addLiveEvent(type, title, detail, impact = {}) {
  const event = {
    id: `LIVE-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type,
    title,
    detail,
    impact
  };
  state.liveEvents.unshift(event);
  state.liveEvents = state.liveEvents.slice(0, 18);
  state.lastEventAt = event.time;
  return event;
}

function simulateLiveEvent(mode = 'auto') {
  if (mode === 'warehouse-drop') {
    const target = randomItem(state.inventory.filter((row) => row.channel !== 'STORE'));
    const sku = getSku(state, target.skuId);
    const units = 6 + Math.floor(Math.random() * 9);
    target.inTransit += units;
    addLiveEvent('shipment', 'Warehouse drop received', `${units} ${sku.style} units moved into in-transit for ${target.location}.`, { units });
    createAudit(state, 'Warehouse drop simulated', `${units} ${sku.style} units added to ${target.location} in-transit inventory.`);
    showToast(`Warehouse drop: +${units} ${sku.style} units in transit.`);
    render();
    return;
  }

  const candidates = state.inventory.filter((row) => row.channel !== 'STORE' || Math.random() > 0.45);
  const row = randomItem(candidates);
  const sku = getSku(state, row.skuId);
  const units = mode === 'vip-order' ? 3 : 1 + Math.floor(Math.random() * 2);
  const available = availableStock(row);
  row.committed += Math.min(units, Math.max(1, row.stock + row.inTransit));
  row.velocity24h = Math.round((row.velocity24h + (mode === 'vip-order' ? 1.6 : 0.35)) * 10) / 10;
  state.todayOrders += units;
  state.liveRevenue += units * sku.price;
  state.conversionRate = Math.min(8.9, Math.round((state.conversionRate + 0.05) * 10) / 10);
  addLiveEvent(mode === 'vip-order' ? 'vip' : 'order', mode === 'vip-order' ? 'VIP order committed' : 'Live order committed', `${units} ${sku.style} size ${sku.size} sold from ${row.location}; available was ${available}.`, { skuId: row.skuId, units });
  if (riskScore(row, state) > 55) {
    createAudit(state, 'Live risk signal', `${sku.style} ${sku.size} risk increased after synthetic order in ${row.location}.`);
  }
  if (mode === 'vip-order') showToast(`VIP order committed: ${units} ${sku.style} units. Risk and revenue updated.`);
  render();
}

function renderLiveOps() {
  els.liveMetrics.innerHTML = [
    ['Orders today', state.todayOrders],
    ['Live GMV', rupee.format(state.liveRevenue)],
    ['Conversion', `${state.conversionRate.toFixed(1)}%`],
    ['Last signal', state.lastEventAt],
    ['Stream', state.liveFeedActive ? 'Running' : 'Paused'],
    ['Events', state.liveEvents.length]
  ].map(([label, value]) => `<div class="live-metric"><span>${label}</span><strong>${value}</strong></div>`).join('');

  els.liveFeed.innerHTML = state.liveEvents.length ? state.liveEvents.map((event) => `
    <div class="live-event ${event.type}">
      <strong>${event.title}</strong>
      <span>${event.time} · ${event.detail}</span>
    </div>
  `).join('') : '<div class="live-event"><strong>Awaiting first signal</strong><span>The synthetic stream will append order, shipment and risk events every few seconds.</span></div>';
}

function exportReport() {
  const report = {
    title: 'AIonOS × BIRKENSTOCK India — 90-Day Agentic Retail Pilot Proof Pack',
    generatedAt: new Date().toISOString(),
    scenario: state.scenarioActive ? 'Mumbai weekend demand spike' : 'Baseline',
    protectedRevenue: rupee.format(state.protectedRevenue),
    stockoutsAvoided: state.stockoutsAvoided,
    pendingRecommendations: state.recommendations.filter((rec) => rec.status === 'pending').length,
    approvedRecommendations: state.recommendations.filter((rec) => rec.status === 'approved').length,
    topRecommendation: state.recommendations[0] || null,
    latestAudit: state.audit.slice(0, 8)
  };
  els.reportOutput.hidden = false;
  els.reportOutput.textContent = JSON.stringify(report, null, 2);
  showToast('Pilot proof pack generated in the panel. Copy or screenshot for the client walkthrough.');
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove('show'), 3600);
}

window.approveRecommendationById = function approveRecommendationById(id) {
  const execution = window.AgentEngine.approveRecommendation(state, id);
  if (execution) showToast(`${id} approved. Mock ${execution.sapSto} and ${execution.wmsTask} created.`);
  render();
};

window.simulateRowOrder = function simulateRowOrder(skuId, locationId) {
  const row = state.inventory.find((item) => item.skuId === skuId && item.locationId === locationId);
  if (!row) return;
  const sku = getSku(state, skuId);
  row.committed += 1;
  row.velocity24h = Math.round((row.velocity24h + 0.8) * 10) / 10;
  state.todayOrders += 1;
  state.liveRevenue += sku.price;
  addLiveEvent('manual', 'Presenter action: Sell 1', `${sku.style} size ${sku.size} manually sold from ${row.location}.`, { skuId, units: 1 });
  createAudit(state, 'Presenter action executed', `Manual Sell 1 button committed one ${sku.style} size ${sku.size} from ${row.location}.`);
  showToast(`Action executed: sold 1 ${sku.style} from ${row.location}.`);
  render();
};

window.showRecommendationEvidence = function showRecommendationEvidence(id) {
  const rec = state.recommendations.find((item) => item.id === id);
  if (!rec) return;
  showToast(`Evidence: ${rec.reason} Net impact ${rupee.format(rec.netImpact)}, confidence ${rec.confidence}%, audit ID ${id}.`);
};

init();
