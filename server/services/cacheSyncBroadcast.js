import { broadcastCacheSyncToAllClients } from "../controllers/notificationsController.js";

/**
 * Broadcast cache-sync hints to all connected notification SSE clients (deferred so HTTP responses finish first).
 * @param {{ scopes: string[]; orderId?: number; accountIds?: number[]; customerId?: number; calculationId?: number; beneficiaryId?: number }} payload
 */
export function scheduleCacheSync(payload) {
  const { scopes, ...rest } = payload || {};
  if (!Array.isArray(scopes) || scopes.length === 0) return;
  setImmediate(() => {
    try {
      broadcastCacheSyncToAllClients({ scopes, ...rest });
    } catch (e) {
      console.error("[scheduleCacheSync]", e);
    }
  });
}
