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
  scenarioActive: false
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
  toast: document.getElementById('toast')
};

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
  els.skuFilter.addEventListener('change', renderRetailTwin);
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

window.showRecommendationEvidence = function showRecommendationEvidence(id) {
  const rec = state.recommendations.find((item) => item.id === id);
  if (!rec) return;
  showToast(`Evidence: ${rec.reason} Net impact ${rupee.format(rec.netImpact)}, confidence ${rec.confidence}%, audit ID ${id}.`);
};

init();
