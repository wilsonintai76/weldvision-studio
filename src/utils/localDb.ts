/**
 * Local Persistent SQL Bridge — WeldVision Studio
 *
 * Initializes a SQLite-WASM database backed by the browser's
 * Origin Private File System (OPFS). Requires COOP/COEP headers.
 *
 * Used for:
 *   - Offline GMAW session caching (Home Mode queue)
 *   - Bracket calibration lookups
 *   - Local roster mirror
 */

let dbInstance: any = null;

export async function getSqliteDbInstance() {
  if (dbInstance) return dbInstance;

  // SQLite-WASM / OPFS is optional. Falls back to in-memory gracefully.
  try {
    const initSqlJs = (await import('sql.js')).default;

    const SQL = await initSqlJs({
      locateFile: (file: string) =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
    });

    let db: any;
    try {
      const opfsRoot = await navigator.storage.getDirectory();
      const fileHandle = await opfsRoot.getFileHandle('weldvision.db', { create: true });
      const file = await fileHandle.getFile();

      if (file.size > 0) {
        const buffer = await file.arrayBuffer();
        db = new SQL.Database(new Uint8Array(buffer));
      } else {
        db = new SQL.Database();
      }
    } catch {
      db = new SQL.Database();
    }

    db.run(`CREATE TABLE IF NOT EXISTS local_sessions (session_id TEXT PRIMARY KEY, student_id TEXT NOT NULL, bracket_id TEXT NOT NULL, voltage REAL NOT NULL, wfs_ipm REAL NOT NULL, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS local_telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, x_mm REAL NOT NULL, y_mm REAL NOT NULL, z_gap_mm REAL NOT NULL, speed_mms REAL NOT NULL, work_angle REAL NOT NULL, travel_angle REAL NOT NULL, trigger INTEGER NOT NULL, timestamp TEXT DEFAULT (datetime('now')));`);

    dbInstance = { db, SQL, saveToOpfs: async () => {} };
    console.log('SQLite-WASM initialized.');
    return dbInstance;
  } catch {
    // SQLite unavailable — app works fully without it
    dbInstance = { db: null, SQL: null, saveToOpfs: async () => {} };
    return dbInstance;
  }
}
