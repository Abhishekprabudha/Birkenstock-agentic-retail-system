# AIonOS × BIRKENSTOCK India — Agentic Retail Command Center

A GitHub Pages-ready web demo that showcases how AIonOS can sit on top of SAP, Shopify, POS, WMS and marketplace feeds to create a governed autonomous retail decisioning layer for BIRKENSTOCK India.

The demo is designed for a client meeting: fast, visual, executive-friendly and credible enough to look like the first version of a 90-day pilot.

---

## What this system demonstrates

- **Unified Retail Twin** across stores, D2C and marketplaces
- **Demand Sensing Agent** for Arizona / Boston / Gizeh demand spikes
- **Allocation Agent** for channel prioritization
- **Transfer Agent** for store-to-D2C / store-to-marketplace movement recommendations
- **Replenishment Agent** for mock warehouse replenishment signals
- **Inventory Accuracy Agent** using simulated vision cycle-count outputs
- **Returns Restock Agent** for grading and relisting returned products
- **AgentOps governance** with every recommendation auditable and explainable
- **Mock SAP STO + WMS pick task creation** after human approval
- **ROI proof pack** showing protected revenue, stockout delta, fill-rate and manual effort avoided

---

## Demo storyline

1. Open the app.
2. Click **Launch Mumbai Weekend Spike**.
3. Watch stockout risk change for Boston / Arizona across D2C and marketplace pools.
4. Click **Run Agent Swarm**.
5. See agents create transfer and replenishment recommendations.
6. Click **Approve Top Action**.
7. The system creates mock SAP STO and WMS task IDs.
8. Open **Audit + ROI** to show measurable pilot impact.

Client message:

> “This is not another dashboard. It is a decisioning layer that sees demand, decides movement, protects full-price sales and leaves evidence.”

---

## How to run locally

No build is required.

Option 1: Open directly

```bash
open index.html
```

Option 2: Run with a local static server

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

---

## How to upload to GitHub Pages from the web

1. Create a new GitHub repository, for example:
   `birkenstock-agentic-retail-demo`
2. Upload all files from this folder to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Save.
6. GitHub will publish the site in a few minutes.

Expected URL format:

```text
https://<your-github-username>.github.io/birkenstock-agentic-retail-demo/
```

---

## Code structure

```text
.
├── index.html              # Main app shell
├── styles.css              # Premium dark Big-4-style UI
├── src/
│   ├── data.js             # Synthetic Birkenstock-like retail data
│   ├── agents.js           # Agent logic, scoring, recommendations, approval logic
│   └── app.js              # Rendering, interactions and demo workflow
└── assets/                 # Generated visual assets for the executive demo
```

---

## Integration strategy for a real pilot

For the client demo, the connectors are simulated. For a real 90-day pilot, replace the data source in `src/data.js` with real feeds:

```text
/sap/inventory              → SAP OData / extract / MCP connector
/shopify/orders             → Shopify Admin API
/pos/sales                  → POS export / API
/wms/stock                  → WMS API / database view
/marketplace/orders         → Myntra / Nykaa / Amazon settlement and order files
```

The decisioning layer can remain the same:

```text
Connector layer → Retail Twin → Agent Engine → Optimization → AgentOps Audit → Approved execution
```

---

## Recommended next engineering step

For a production pilot, convert this static demo into:

- React / Next.js frontend
- FastAPI backend
- PostgreSQL retail twin schema
- Redis event state
- OR-Tools optimization service
- LLM-powered recommendation explanation service
- OAuth / RBAC / audit retention
- SAP / Shopify / WMS connectors

This repository is intentionally static so it can be uploaded and shown immediately through GitHub Pages.
