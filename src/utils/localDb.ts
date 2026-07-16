/**
 * Local Persistent SQL Bridge — WeldVision Studio
 *
 * SQLite-WASM / OPFS is deferred. The app works fully without it.
 * Returns a stub that satisfies the WeldVisionStudio interface.
 */

let dbInstance: any = null;

export async function getSqliteDbInstance() {
  if (dbInstance) return dbInstance;

  dbInstance = { db: null, SQL: null, saveToOpfs: async () => {} };
  return dbInstance;
}
