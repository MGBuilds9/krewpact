/**
 * Centralized query key factory for React Query.
 *
 * Guarantees consistent, hierarchical cache keys across the app.
 * Every hook should import keys from here — never inline string arrays.
 *
 * Pattern:
 *   entity.all       → base key for the entity (used for broad invalidation)
 *   entity.lists()   → all list queries
 *   entity.list(f)   → specific filtered list
 *   entity.details() → all detail queries
 *   entity.detail(id)→ single record by id
 */

export const queryKeys = {
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.accounts.lists(), filters] as const,
    details: () => [...queryKeys.accounts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.contacts.lists(), filters] as const,
    details: () => [...queryKeys.contacts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
  },
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.opportunities.lists(), filters] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.opportunities.details(), id] as const,
  },
  estimates: {
    all: ['estimates'] as const,
    lists: () => [...queryKeys.estimates.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.estimates.lists(), filters] as const,
    details: () => [...queryKeys.estimates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.estimates.details(), id] as const,
    lines: (estimateId: string) => [...queryKeys.estimates.detail(estimateId), 'lines'] as const,
    versions: (estimateId: string) =>
      [...queryKeys.estimates.detail(estimateId), 'versions'] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.notifications.lists(), filters] as const,
    details: () => [...queryKeys.notifications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.notifications.details(), id] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    executive: () => [...queryKeys.dashboard.all, 'executive'] as const,
    pm: () => [...queryKeys.dashboard.all, 'pm'] as const,
  },
  executive: {
    all: ['executive'] as const,
    _base: () => queryKeys.executive.all,
    overview: () => [...queryKeys.executive.all, 'overview'] as const,
    overviewByDivision: (division: string) =>
      [...queryKeys.executive.all, 'overview', 'division', division] as const,
    alerts: () => [...queryKeys.executive.all, 'alerts'] as const,
    forecast: () => [...queryKeys.executive.all, 'forecast'] as const,
    staging: {
      all: [...['executive'], 'staging'] as const,
      lists: () => [...queryKeys.executive.staging.all, 'list'] as const,
      list: (filters: object) => [...queryKeys.executive.staging.lists(), filters] as const,
      detail: (id: string) => [...queryKeys.executive.staging.all, 'detail', id] as const,
    },
    subscriptions: {
      all: [...['executive'], 'subscriptions'] as const,
      lists: () => [...queryKeys.executive.subscriptions.all, 'list'] as const,
      list: (filters: object) => [...queryKeys.executive.subscriptions.lists(), filters] as const,
    },
    knowledge: {
      all: [...['executive'], 'knowledge'] as const,
      search: (query: string) => [...queryKeys.executive.knowledge.all, 'search', query] as const,
      chat: (sessionId: string) =>
        [...queryKeys.executive.knowledge.all, 'chat', sessionId] as const,
    },
  },
  icps: {
    all: ['icps'] as const,
    lists: () => [...queryKeys.icps.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.icps.lists(), filters] as const,
    details: () => [...queryKeys.icps.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.icps.details(), id] as const,
  },
  inventoryItems: {
    all: ['inventory-items'] as const,
    lists: () => [...queryKeys.inventoryItems.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.inventoryItems.lists(), filters] as const,
    details: () => [...queryKeys.inventoryItems.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inventoryItems.details(), id] as const,
  },
  inventoryStock: {
    all: ['inventory-stock'] as const,
    lists: () => [...queryKeys.inventoryStock.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.inventoryStock.lists(), filters] as const,
    byProject: (projectId: string) =>
      [...queryKeys.inventoryStock.all, 'project', projectId] as const,
    lowStock: (divisionId?: string) =>
      [...queryKeys.inventoryStock.all, 'low-stock', divisionId] as const,
  },
  inventoryLocations: {
    all: ['inventory-locations'] as const,
    lists: () => [...queryKeys.inventoryLocations.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.inventoryLocations.lists(), filters] as const,
    details: () => [...queryKeys.inventoryLocations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inventoryLocations.details(), id] as const,
  },
  purchaseOrders: {
    all: ['purchase-orders'] as const,
    lists: () => [...queryKeys.purchaseOrders.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.purchaseOrders.lists(), filters] as const,
    details: () => [...queryKeys.purchaseOrders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.details(), id] as const,
  },
  fleetVehicles: {
    all: ['fleet-vehicles'] as const,
    lists: () => [...queryKeys.fleetVehicles.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.fleetVehicles.lists(), filters] as const,
    details: () => [...queryKeys.fleetVehicles.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.fleetVehicles.details(), id] as const,
  },
  serials: {
    all: ['serials'] as const,
    lists: () => [...queryKeys.serials.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.serials.lists(), filters] as const,
    details: () => [...queryKeys.serials.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.serials.details(), id] as const,
  },
  transactionLedger: {
    all: ['transaction-ledger'] as const,
    lists: () => [...queryKeys.transactionLedger.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.transactionLedger.lists(), filters] as const,
  },
} as const;
