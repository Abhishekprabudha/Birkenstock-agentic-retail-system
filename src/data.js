window.BIRKENSTOCK_DATA = {
  skus: [
    { id: 'ARZ-41-SAND', style: 'Arizona', size: '41', color: 'Sand', price: 9990, grossMarginPct: 0.64, hero: true },
    { id: 'BST-42-BLK', style: 'Boston', size: '42', color: 'Black', price: 12990, grossMarginPct: 0.66, hero: true },
    { id: 'GZH-39-MOC', style: 'Gizeh', size: '39', color: 'Mocha', price: 7990, grossMarginPct: 0.62, hero: true },
    { id: 'MLN-42-TAB', style: 'Milano', size: '42', color: 'Tabacco', price: 10990, grossMarginPct: 0.61, hero: false },
    { id: 'MAD-38-WHT', style: 'Madrid', size: '38', color: 'White', price: 6990, grossMarginPct: 0.58, hero: false }
  ],
  stores: [
    { id: 'MUM-PP', name: 'Phoenix Palladium', city: 'Mumbai', tier: 'Flagship', leadHoursToD2C: 4 },
    { id: 'MUM-RC', name: 'R City', city: 'Mumbai', tier: 'Mall', leadHoursToD2C: 5 },
    { id: 'MUM-NS', name: 'Nexus Seawoods', city: 'Mumbai', tier: 'Mall', leadHoursToD2C: 5 },
    { id: 'MUM-LR', name: 'Linking Road', city: 'Mumbai', tier: 'High Street', leadHoursToD2C: 3 },
    { id: 'MUM-T2', name: 'T2 International', city: 'Mumbai', tier: 'Airport', leadHoursToD2C: 6 },
    { id: 'MUM-OB', name: 'Oberoi Mall', city: 'Mumbai', tier: 'Mall', leadHoursToD2C: 4 },
    { id: 'MUM-VM', name: 'Viviana Mall', city: 'Mumbai', tier: 'Mall', leadHoursToD2C: 5 },
    { id: 'MUM-JW', name: 'Jio World Drive', city: 'Mumbai', tier: 'Premium', leadHoursToD2C: 4 }
  ],
  channels: [
    { id: 'D2C', name: 'Shopify D2C', priority: 1.18, slaHours: 12 },
    { id: 'MARKETPLACE', name: 'Myntra / Nykaa / Amazon', priority: 1.06, slaHours: 18 },
    { id: 'STORE', name: 'Retail Store', priority: 1.0, slaHours: 24 }
  ],
  inventory: [
    { skuId: 'BST-42-BLK', locationId: 'D2C-FC', location: 'D2C Fulfilment Pool', channel: 'D2C', stock: 8, committed: 5, velocity24h: 16, inTransit: 0 },
    { skuId: 'BST-42-BLK', locationId: 'MKT-FC', location: 'Marketplace Pool', channel: 'MARKETPLACE', stock: 7, committed: 3, velocity24h: 11, inTransit: 0 },
    { skuId: 'BST-42-BLK', locationId: 'MUM-PP', location: 'Phoenix Palladium', channel: 'STORE', stock: 13, committed: 2, velocity24h: 2.5, inTransit: 0 },
    { skuId: 'BST-42-BLK', locationId: 'MUM-RC', location: 'R City', channel: 'STORE', stock: 18, committed: 1, velocity24h: 1.8, inTransit: 0 },
    { skuId: 'BST-42-BLK', locationId: 'MUM-NS', location: 'Nexus Seawoods', channel: 'STORE', stock: 15, committed: 1, velocity24h: 1.6, inTransit: 0 },
    { skuId: 'BST-42-BLK', locationId: 'MUM-LR', location: 'Linking Road', channel: 'STORE', stock: 11, committed: 1, velocity24h: 3.4, inTransit: 0 },

    { skuId: 'ARZ-41-SAND', locationId: 'D2C-FC', location: 'D2C Fulfilment Pool', channel: 'D2C', stock: 11, committed: 4, velocity24h: 13, inTransit: 0 },
    { skuId: 'ARZ-41-SAND', locationId: 'MKT-FC', location: 'Marketplace Pool', channel: 'MARKETPLACE', stock: 9, committed: 2, velocity24h: 9, inTransit: 0 },
    { skuId: 'ARZ-41-SAND', locationId: 'MUM-PP', location: 'Phoenix Palladium', channel: 'STORE', stock: 20, committed: 2, velocity24h: 2.9, inTransit: 0 },
    { skuId: 'ARZ-41-SAND', locationId: 'MUM-RC', location: 'R City', channel: 'STORE', stock: 16, committed: 1, velocity24h: 1.5, inTransit: 0 },
    { skuId: 'ARZ-41-SAND', locationId: 'MUM-T2', location: 'T2 International', channel: 'STORE', stock: 10, committed: 2, velocity24h: 4.1, inTransit: 0 },
    { skuId: 'ARZ-41-SAND', locationId: 'MUM-JW', location: 'Jio World Drive', channel: 'STORE', stock: 14, committed: 1, velocity24h: 2.2, inTransit: 0 },

    { skuId: 'GZH-39-MOC', locationId: 'D2C-FC', location: 'D2C Fulfilment Pool', channel: 'D2C', stock: 9, committed: 2, velocity24h: 7, inTransit: 0 },
    { skuId: 'GZH-39-MOC', locationId: 'MKT-FC', location: 'Marketplace Pool', channel: 'MARKETPLACE', stock: 6, committed: 2, velocity24h: 6, inTransit: 0 },
    { skuId: 'GZH-39-MOC', locationId: 'MUM-OB', location: 'Oberoi Mall', channel: 'STORE', stock: 14, committed: 1, velocity24h: 1.4, inTransit: 0 },
    { skuId: 'GZH-39-MOC', locationId: 'MUM-VM', location: 'Viviana Mall', channel: 'STORE', stock: 12, committed: 1, velocity24h: 1.2, inTransit: 0 },

    { skuId: 'MLN-42-TAB', locationId: 'D2C-FC', location: 'D2C Fulfilment Pool', channel: 'D2C', stock: 18, committed: 2, velocity24h: 4, inTransit: 0 },
    { skuId: 'MLN-42-TAB', locationId: 'MUM-PP', location: 'Phoenix Palladium', channel: 'STORE', stock: 18, committed: 1, velocity24h: 1.1, inTransit: 0 },
    { skuId: 'MAD-38-WHT', locationId: 'D2C-FC', location: 'D2C Fulfilment Pool', channel: 'D2C', stock: 22, committed: 3, velocity24h: 5, inTransit: 0 },
    { skuId: 'MAD-38-WHT', locationId: 'MUM-LR', location: 'Linking Road', channel: 'STORE', stock: 13, committed: 1, velocity24h: 1.2, inTransit: 0 }
  ],
  warehouse: [
    { skuId: 'BST-42-BLK', locationId: 'WH-NORTH', location: 'Primary Warehouse', available: 56, leadHours: 36 },
    { skuId: 'ARZ-41-SAND', locationId: 'WH-NORTH', location: 'Primary Warehouse', available: 72, leadHours: 36 },
    { skuId: 'GZH-39-MOC', locationId: 'WH-NORTH', location: 'Primary Warehouse', available: 40, leadHours: 36 },
    { skuId: 'MLN-42-TAB', locationId: 'WH-NORTH', location: 'Primary Warehouse', available: 33, leadHours: 36 },
    { skuId: 'MAD-38-WHT', locationId: 'WH-NORTH', location: 'Primary Warehouse', available: 29, leadHours: 36 }
  ],
  baseline: {
    stockoutEvents: 18,
    manualHoursPerWeek: 42,
    fillRate: 91.4,
    inventoryAccuracy: 93.2,
    dispatchErrors: 11,
    returnsCostIndex: 100
  }
};
