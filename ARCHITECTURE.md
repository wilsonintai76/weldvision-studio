# WeldVision Studio — System Architecture

## Overview

WeldVision Studio is a dual-platform welding simulation and training ecosystem spanning Android (mobile) and Web. This document describes the full four-layer architecture.

```
====================================== APPLICATION & DEVICE LAYER ======================================
  [ Android: WeldVision Trainer App ]                      [ Web Browser: WeldSim Studio App ]
   • Camera AprilTag Computer Vision                        • Three.js WebGL Core Engine
   • Android Biometric Enclave API                          • SQLite-WASM Runtime Thread
   • Local SQLite Room Database                             • OPFS Storage (*Requires COOP/COEP)
                    │                                                        │
                    │ (Secure Registration / Sync)                           │ (Fetch Roster / UI Sync)
                    └─────────────────────────┐    ┌─────────────────────────┘
                                              ▼    ▼
====================================== NETWORKING & BROKER LAYER ======================================
  [ INBOUND TRANSFERS ] ──────────────────────────────────────────────► [ BACKEND WEB ROUTING ]
   • Live Telemetry Pipeline (Online/Classroom Mode)                      • REST API Orchestration
      ├──► PRIMARY LOCAL LANE ──► Local Mosquitto LAN [TCP:1883]          • Stateless Web Endpoints
      └──► WAN FALLBACK LANE  ──► Cloud HiveMQ Cluster [TLS:8883]
   • Offline Queue Pipeline (Home Mode)
      └──► ASYNC CACHING INTERFACE ──► Local JSON Logs + Room DB Sync
                    │                                                        │
                    │ (Live Streams via WebSockets 9001 / 8884)               │ (HTTPS Multipart Uploads)
                    ▼                                                        ▼
====================================== COMPUTE & INGESTION LAYER ======================================
  [ Client-Side Browser Workspace ]                       [ Serverless Cloudflare Edge Layer ]
   • Reads Local SQLite-WASM/OPFS Data                     • Cloudflare Worker Core Router
   • Drives Real-time 3D Bead Growth                       • WeldSim Thermophysics Engine
   • Computes Local UI Math Matrices                       • Cloudflare Workers AI Framework
                    │                                                        │
                    │ (Lecturer Grade Commits)                               │ (Persistent Writes)
                    └─────────────────────────┐    ┌─────────────────────────┘
                                              ▼    ▼
====================================== STORAGE & PERSISTENCE LAYER =====================================
  [ Cloud Relational Data Storage ]                       [ Cloud Object Data Archive ]
   • Cloudflare D1 Database                                • Cloudflare R2 Bucket Store
   • Stores Tabular Accounts, Rosters & Scores             • Archives 60Hz Coordinate Streams (.json)
```

---

## Layer 1 — Application & Device

### WeldVision Trainer (Android)
| Capability | Technology |
|---|---|
| Camera-based weld inspection | AprilTag Computer Vision |
| Secure user authentication | Android Biometric Enclave API |
| Local offline storage | SQLite Room Database |

### WeldSim Studio (Web) ← **This Repository**
| Capability | Technology |
|---|---|
| Real-time 3D weld bead rendering | Three.js / WebGL |
| Offline-capable local data store | SQLite-WASM + OPFS (Origin Private File System) |
| COOP/COEP security headers | Required for OPFS and SharedArrayBuffer |

---

## Layer 2 — Networking & Broker

### Live Telemetry Pipeline (Online / Classroom Mode)

```
┌─────────────────────────────────────────────────────────┐
│  PRIMARY LOCAL LANE                                      │
│  Android ──► Mosquitto Broker [TCP:1883] ──► Web Client  │
│  (Low latency, same-subnet classroom deployment)          │
├─────────────────────────────────────────────────────────┤
│  WAN FALLBACK LANE                                       │
│  Android ──► HiveMQ Cloud [TLS:8883] ──► Web Client      │
│  (Remote students, TLS-encrypted)                        │
└─────────────────────────────────────────────────────────┘
```

- **MQTT Topics:** Telemetry packets carry 60 Hz coordinate streams, weld parameters, and sensor data.
- **WebSocket Bridges:** Mosquitto WS on `:9001`, HiveMQ WSS on `:8884`.

### Offline Queue Pipeline (Home Mode)

```
Android ──► Local JSON Log ──► Room DB Sync ──► Cloudflare Worker (on reconnect)
```

### Backend Web Routing

- **Cloudflare Worker** (`functions/api/[[route]].ts`) handles all REST endpoints.
- Built on **Hono** — lightweight, edge-native framework.
- Stateless endpoints for roster fetch, submission, grading, and AI inference.

---

## Layer 3 — Compute & Ingestion

### Client-Side Browser Workspace

| Computation | Details |
|---|---|
| SQLite-WASM reads | Local offline dataset access via OPFS |
| 3D bead growth | Three.js procedural geometry driven by telemetry |
| UI math matrices | Distortion, thermal, and metallurgy models |

### Serverless Cloudflare Edge Layer

| Component | File |
|---|---|
| Worker Core Router | `functions/api/[[route]].ts` |
| Thermophysics Engine | `src/utils/simulation.ts`, `src/utils/metallurgy.ts` |
| Workers AI Inference | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (predictive crack-risk analysis) |

---

## Layer 4 — Storage & Persistence

### Cloudflare D1 (Relational)

```sql
-- Accounts
CREATE TABLE accounts (
  id         TEXT PRIMARY KEY,
  role       TEXT NOT NULL,  -- 'student' | 'lecturer' | 'admin'
  name       TEXT NOT NULL,
  email      TEXT UNIQUE,
  biometric  TEXT,           -- Android biometric attestation hash
  created_at TEXT DEFAULT (datetime('now'))
);

-- Rosters (class enrollments)
CREATE TABLE rosters (
  id          TEXT PRIMARY KEY,
  lecturer_id TEXT NOT NULL REFERENCES accounts(id),
  class_name  TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Scores (weld session results)
CREATE TABLE scores (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES accounts(id),
  roster_id   TEXT NOT NULL REFERENCES rosters(id),
  parameters  TEXT NOT NULL,  -- JSON: WeldParameters
  quality     REAL NOT NULL,  -- 0-100 overall score
  defects     TEXT,           -- JSON: DefectMetric[]
  submitted_at TEXT DEFAULT (datetime('now'))
);
```

### Cloudflare R2 (Object Storage)

| Bucket | Content |
|---|---|
| `weld-telemetry` | 60 Hz coordinate streams (`.json`), session recordings |
| `weld-reports` | Generated PDF/HTML grade reports |

---

## Data Flow Summary

```
┌──────────┐    MQTT (60 Hz)     ┌──────────────┐    REST/WS     ┌──────────────┐
│ Android  │ ──────────────────► │ MQTT Broker   │ ────────────► │ Cloudflare   │
│ Trainer  │                     │ Mosquitto /   │               │ Worker       │
│          │ ◄────────────────── │ HiveMQ        │ ◄──────────── │ (Hono)       │
└──────────┘    Scores/Sync      └──────────────┘    Roster      └──────┬───────┘
                                                                        │
                               ┌────────────────────────────────────────┤
                               ▼                                        ▼
                        ┌──────────┐                            ┌──────────┐
                        │    D1    │                            │    R2    │
                        │ (Scores, │                            │ (Telemetry
                        │  Roster) │                            │  Archive)│
                        └──────────┘                            └──────────┘

┌──────────────┐    HTTPS (API)      ┌──────────────┐
│ Web Browser  │ ──────────────────► │ Cloudflare   │
│ WeldSim      │ ◄────────────────── │ Worker       │
│ (Three.js)   │    JSON Response    │ (Hono)       │
└──────────────┘                     └──────┬───────┘
       │                                    │
       │ SQLite-WASM (local)                │ Workers AI
       │ OPFS (offline)                     ▼
       ▼                              ┌──────────┐
   [Local DB]                         │  Llama   │
                                      │  3.3 70B │
                                      └──────────┘
```

---

## Security Model

| Layer | Mechanism |
|---|---|
| Android → Cloud | Biometric attestation via Android Keystore |
| Browser → Worker | HTTPS (TLS 1.3), COOP/COEP headers for OPFS isolation |
| Worker → D1/R2 | Cloudflare internal binding (no exposed credentials) |
| MQTT | Anonymous LAN (classroom), TLS + token auth (WAN/HiveMQ) |

---

## Repository Scope

This repository (`weldvision-studio`) implements:

- ✅ **WeldSim Studio Web App** — Three.js 3D visualization, weld parameter controls, defect analysis, distortion simulation
- ✅ **Cloudflare Worker** — Hono-based REST API, Workers AI predictive analysis endpoint
- ⬜ **D1 Schema & Bindings** — Pending implementation
- ⬜ **R2 Telemetry Archive** — Pending implementation
- ⬜ **MQTT WebSocket Bridge** — Pending implementation
- ⬜ **SQLite-WASM + OPFS** — Pending implementation

The Android WeldVision Trainer app is maintained in a separate repository.
