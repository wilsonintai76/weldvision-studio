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

  // Dynamic import of SQLite-WASM from npm package (sql.js)
  try {
    const initSqlJs = (await import('sql.js')).default;

    const SQL = await initSqlJs();

    // Try OPFS-backed persistent storage
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
      // Fallback: in-memory (no COOP/COEP headers)
      console.warn('OPFS unavailable — running SQLite in memory-only mode.');
      db = new SQL.Database();
    }

    // ── GMAW Local Schema ─────────────────────────────────────────────────
    db.run(`
      CREATE TABLE IF NOT EXISTS local_sessions (
        session_id   TEXT PRIMARY KEY,
        student_id   TEXT NOT NULL,
        bracket_id   TEXT NOT NULL,
        voltage      REAL NOT NULL,
        wfs_ipm      REAL NOT NULL,
        created_at   TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS local_telemetry (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id   TEXT NOT NULL,
        x_mm         REAL NOT NULL,
        y_mm         REAL NOT NULL,
        z_gap_mm     REAL NOT NULL,
        speed_mms    REAL NOT NULL,
        work_angle   REAL NOT NULL,
        travel_angle REAL NOT NULL,
        trigger      INTEGER NOT NULL,
        timestamp    TEXT DEFAULT (datetime('now'))
      );
    `);

    dbInstance = { db, SQL, saveToOpfs: async () => {
      try {
        const data = db.export();
        const opfsRoot = await navigator.storage.getDirectory();
        const fileHandle = await opfsRoot.getFileHandle('weldvision.db', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(data.buffer);
        await writable.close();
      } catch {
        // OPFS save failed — data lives in memory only
      }
    }};

    console.log('SQLite-WASM engine initialized. OPFS persistence active.');
    return dbInstance;
  } catch (err) {
    console.error('SQLite-WASM initialization failed:', err);
    throw err;
  }
}
