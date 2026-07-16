# WeldVision Studio — System Architecture (GMAW-Only)

## Overview

WeldVision Studio is a dual-platform **GMAW (MIG) welding** simulation and training ecosystem spanning Android (mobile) and Web. The system is hyper-focused on a single welding process to eliminate computational overhead and deliver deterministic 60 Hz performance.

> **Design Decision:** Locking the ecosystem exclusively to GMAW eliminates:
>
> - ❌ SMAW stick-electrode burn-off math (dynamic adaptive offset transforms)
> - ❌ GTAW dual-hand tracking (secondary filler-rod AprilTag + primary torch)
> - ✅ Fixed GMAW torch geometry — static contact-tube length, TCP offset never changes mid-weld

```text
====================================== APPLICATION & DEVICE LAYER ======================================
  [ Android: WeldVision Trainer App ]                      [ Web Browser: WeldSim Studio App ]
   • AprilTag GMAW Gun Tracking (single tag)                • Three.js WebGL Core Engine
   • Android Biometric Enclave API                          • SQLite-WASM Runtime Thread
   • Local SQLite Room Database                             • OPFS Storage (*Requires COOP/COEP)
                    │                                                        │
                    │ (LAN MQTT 60 Hz Telemetry)                             │ (Fetch Roster / UI Sync)
                    └─────────────────────────┐    ┌─────────────────────────┘
                                              ▼    ▼
====================================== NETWORKING & BROKER LAYER ======================================
  [ INBOUND TRANSFERS ] ──────────────────────────────────────────────► [ BACKEND WEB ROUTING ]
   • Live GMAW Telemetry Pipeline (Online/Classroom Mode)                 • REST API Orchestration
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
   • Drives Real-time 3D Bead Growth                       • GMAW Thermophysics Engine
   • Computes Local UI Math Matrices                       • Cloudflare Workers AI Framework
                    │                                                        │
                    │ (Lecturer Grade Commits)                               │ (Persistent Writes)
                    └─────────────────────────┐    ┌─────────────────────────┘
                                              ▼    ▼
====================================== STORAGE & PERSISTENCE LAYER =====================================
  [ Cloud Relational Data Storage ]                       [ Cloud Object Data Archive ]
   • Cloudflare D1 Database                                • Cloudflare R2 Bucket Store
   • GMAW Sessions, Users, Bracket Calibration              • Archives 60Hz Coordinate Streams (.json)
```

---

## 1. GMAW Data Token Contract

Every packet — whether streaming live over MQTT or stored in OPFS SQLite — uses this uniform GMAW-only schema. No process-conditional parsing.

```json
{
  "meta": {
    "session_id": "sess_gmaw_2026_01",
    "student_id": "stu_marcus_99",
    "bracket_id": "brk_035_gmaw"
  },
  "settings": {
    "voltage": 19.5,
    "wire_feed_speed_ipm": 310
  },
  "telemetry": {
    "x_mm": 45.28,
    "y_mm": 12.01,
    "z_gap_mm": 3.12,
    "travel_speed_mms": 4.25,
    "work_angle_deg": 88.5,
    "travel_angle_deg": 12.4,
    "trigger_pressed": true
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `meta.session_id` | string | Unique session identifier |
| `meta.student_id` | string | Student performing the weld |
| `meta.bracket_id` | string | Calibration bracket reference |
| `settings.voltage` | float | GMAW constant-voltage setpoint (V) |
| `settings.wire_feed_speed_ipm` | float | Wire feed speed (in/min) |
| `telemetry.x_mm` | float | Gun tip X position (mm) |
| `telemetry.y_mm` | float | Gun tip Y position (mm) |
| `telemetry.z_gap_mm` | float | Contact tip to workpiece distance (mm) |
| `telemetry.travel_speed_mms` | float | Instantaneous travel speed (mm/s) |
| `telemetry.work_angle_deg` | float | Work angle (degrees) |
| `telemetry.travel_angle_deg` | float | Travel/drag angle (degrees) |
| `telemetry.trigger_pressed` | bool | Gun trigger state |

---

## 2. GMAW Thermophysics Engine

The engine runs a deterministic, single-path solver — no multi-process switch-case blocks.

### Step A: Empirical Amperage Resolution

GMAW operates on Constant Voltage (CV). Current ($I$) is a function of Wire Feed Speed ($W$). Assuming standard 0.9 mm steel wire:

$$I \approx 0.55 \cdot W + 10$$

### Step B: Net Energy Deposit Density

Arc thermal efficiency $\eta = 0.8$ for GMAW. Heat input per unit length:

$$Q = 0.8 \cdot \frac{V \cdot I}{v}$$

where $V$ is voltage, $I$ is resolved amperage, and $v$ is the student's actual travel speed (mm/s).

### Step C: Three.js Real-Time Bead Expansion

Single unified logic path:

1. If $Q$ exceeds critical plate melting threshold **and** `trigger_pressed` is `true`
2. Grow a smooth 3D weld bead via procedural geometry extrusion
3. Shift surface mesh colors along a thermal gradient: **Bright Yellow → Deep Cherry Red → Slag Gray**

---

## Layer 1 — Application & Device

### WeldVision Trainer (Android)

| Capability | Technology |
| --- | --- |
| Single-tag GMAW gun tracking | AprilTag Computer Vision |
| Secure user authentication | Android Biometric Enclave API |
| Local SQLite calibration lookups | SQLite Room Database |
| Gun Bluetooth/GPIO trigger read | Android BLE / GPIO |

**Android Processing Loop (single operational cycle):**

```text
[ Initialize Target Camera Frame ]
               │
               ▼
[ Track GMAW Gun AprilTag ID ]
               │
               ▼
[ Inject Local SQLite Matrix Transformations ] ──► Smooth 3D Tip Coordinates
               │
               ▼
[ Read Gun Bluetooth/GPIO Trigger State ]
               │
               ▼
[ Blast Contract Data Payload Over Local LAN Broker ]
```

### WeldSim Studio (Web) ← **This Repository**

| Capability | Technology |
| --- | --- |
| Real-time 3D weld bead rendering | Three.js / WebGL |
| GMAW telemetry ingestion engine | `src/utils/gmaw-telemetry.ts` |
| Offline-capable local data store | SQLite-WASM + OPFS |
| COOP/COEP security headers | Required for OPFS and SharedArrayBuffer |

---

## Layer 2 — Networking & Broker

### Live GMAW Telemetry Pipeline (Online / Classroom Mode)

```text
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

- **MQTT Topic:** `weldvision/gmaw/{bracket_id}/telemetry` — 60 Hz coordinate streams
- **WebSocket Bridges:** Mosquitto WS on `:9001`, HiveMQ WSS on `:8884`

### Offline Queue Pipeline (Home Mode)

```text
Android ──► Local JSON Log ──► Room DB Sync ──► Cloudflare Worker (on reconnect)
```

### Backend Web Routing

- **Cloudflare Worker** (`functions/api/[[route]].ts`) handles all REST endpoints.
- Built on **Hono** — lightweight, edge-native framework.
- Endpoints: roster fetch, session submission, grading, AI inference, GMAW telemetry ingestion.

---

## Layer 3 — Compute & Ingestion

### Client-Side Browser Workspace

| Computation | File |
| --- | --- |
| GMAW amperage resolution | `src/utils/gmaw-telemetry.ts` |
| Net heat input density matrix | `src/utils/gmaw-telemetry.ts` |
| 3D bead expansion (Three.js) | `src/utils/gmaw-telemetry.ts` + `src/components/ModelViewer3D.tsx` |
| SQLite-WASM local reads | OPFS thread |

### Serverless Cloudflare Edge Layer

| Component | File |
| --- | --- |
| Worker Core Router | `functions/api/[[route]].ts` |
| GMAW Thermophysics Engine | `src/utils/simulation.ts`, `src/utils/gmaw-telemetry.ts` |
| Metallurgy Crack-Risk Solver | `src/utils/metallurgy.ts` |
| Workers AI Inference | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |

---

## Layer 4 — Storage & Persistence

### Cloudflare D1 (Relational) — GMAW-Optimized Schema

Schema defined in [`migrations/0001_gmaw_schema.sql`](../migrations/0001_gmaw_schema.sql). Apply with:

```bash
wrangler d1 create weldvision-gmaw-db
wrangler d1 execute weldvision-gmaw-db --file=./migrations/0001_gmaw_schema.sql
```

| Table | Purpose |
| --- | --- |
| `users` | Student/lecturer accounts with bracket assignment |
| `bracket_calibration` | Per-bracket AprilTag focal length and TCP offsets |
| `gmaw_sessions` | Completed weld runs with GMAW params, scores, and R2 archive keys |

### Cloudflare R2 (Object Storage)

| Bucket | Content |
| --- | --- |
| `weld-telemetry` | 60 Hz GMAW coordinate streams (`.json`), session recordings |
| `weld-reports` | Generated PDF/HTML grade reports |

---

## Data Flow Summary

```text
┌──────────┐   MQTT (60 Hz)      ┌──────────────┐    REST/WS     ┌──────────────┐
│ Android  │ ──────────────────► │ MQTT Broker   │ ────────────► │ Cloudflare   │
│ Trainer  │   GMAW Contract     │ Mosquitto /   │               │ Worker       │
│          │ ◄────────────────── │ HiveMQ        │ ◄──────────── │ (Hono)       │
└──────────┘   Scores/Sync       └──────────────┘    Roster      └──────┬───────┘
                                                                        │
                               ┌────────────────────────────────────────┤
                               ▼                                        ▼
                        ┌──────────┐                            ┌──────────┐
                        │    D1    │                            │    R2    │
                        │ (GMAW    │                            │ (60 Hz   │
                        │ Sessions)│                            │  Archive)│
                        └──────────┘                            └──────────┘

┌──────────────┐   HTTPS (API)       ┌──────────────┐
│ Web Browser  │ ──────────────────► │ Cloudflare   │
│ WeldSim      │ ◄────────────────── │ Worker       │
│ (Three.js)   │   JSON Response     │ (Hono)       │
└──────────────┘                     └──────┬───────┘
       │                                    │
       │ gmaw-telemetry.ts                  │ Workers AI
       │ SQLite-WASM (OPFS)                 ▼
       ▼                              ┌──────────┐
   [Local DB]                         │  Llama   │
                                      │  3.3 70B │
                                      └──────────┘
```

---

## Security Model

| Layer | Mechanism |
| --- | --- |
| Android → Cloud | Biometric attestation via Android Keystore |
| Browser → Worker | HTTPS (TLS 1.3), COOP/COEP headers for OPFS isolation |
| Worker → D1/R2 | Cloudflare internal binding (no exposed credentials) |
| MQTT | Anonymous LAN (classroom), TLS + token auth (WAN/HiveMQ) |

---

## Repository Scope

This repository (`weldvision-studio`) implements:

- ✅ **WeldSim Studio Web App** — Three.js 3D visualization, GMAW parameter controls, defect analysis, distortion simulation
- ✅ **GMAW Telemetry Engine** — Amperage resolution, heat input density, bead expansion logic
- ✅ **Cloudflare Worker** — Hono-based REST API, Workers AI predictive analysis, GMAW session ingestion
- ⬜ **D1 Schema & Bindings** — Pending implementation
- ⬜ **R2 Telemetry Archive** — Pending implementation
- ⬜ **MQTT WebSocket Bridge** — Pending implementation
- ⬜ **SQLite-WASM + OPFS** — Pending implementation

The Android WeldVision Trainer app is maintained in a separate repository.
