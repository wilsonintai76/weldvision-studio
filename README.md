# WeldSim Studio

> **Web application for the WeldVision Studio ecosystem** — a production-grade welding simulation and analysis platform for technical education, focusing on metallurgy, thermal distortion, and industrial physics.

WeldSim Studio is the **browser-based frontend** of the WeldVision dual-platform system. For the full system architecture (Android + Web + Cloud), see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Features

| Module | Description |
| --- | --- |
| **3D Weld Bead Visualizer** | Real-time Three.js / WebGL rendering of weld bead geometry |
| **Joint Type Viewer** | Butt, T-Joint, Lap Joint, T-Joint (Single Fillet) |
| **Parameter Controls** | Current, voltage, speed, preheat, gas flow, electrode diameter |
| **Weld Process Simulation** | GMAW, SMAW, GTAW with physics-based heat input and cooling rate models |
| **Distortion Analyzer** | Angular, transverse, longitudinal distortion + residual stress visualization |
| **Defect Analyzer** | Porosity, lack of fusion, undercut, burn-through prediction with AWS standards |
| **Predictive AI Analysis** | Metallurgical crack-risk scoring via Cloudflare Workers AI (Llama 3.3 70B) |
| **Lab Presets** | Pre-configured scenarios targeting specific weld defects for training |
| **Weld Quiz** | Interactive knowledge assessment for welding theory |
| **Defect Gallery** | Visual reference library of common weld defects |
| **Audio Feedback** | Auditory cues for parameter changes (toggleable) |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 6 |
| **3D Engine** | Three.js |
| **Styling** | Tailwind CSS 4 |
| **Animation** | Motion (Framer Motion) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Backend** | Hono (Cloudflare Pages Functions) |
| **AI Inference** | Cloudflare Workers AI (Llama 3.3 70B) |
| **Deployment** | Cloudflare Pages + Workers |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+

### 1. Clone & Install

```bash
git clone https://github.com/wilsonintai76/weldvision-studio.git
cd weldvision-studio
npm install
```

### 2. Set Environment Variables

Create `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key
```

> The Gemini API key is used for AI-assisted features. For production, the app uses Cloudflare Workers AI which does not require this key.

### 3. Run Locally

```bash
npm run dev
```

This starts:

- **Vite** dev server (HMR, fast refresh)
- **Cloudflare Pages Functions** (Wrangler) for the `/api/*` routes

Open [http://localhost:8788](http://localhost:8788) in your browser.

### 4. Build for Production

```bash
npm run build
```

Output is written to `dist/`.

### 5. Deploy

```bash
npm run deploy
```

Deploys the static build to Cloudflare Pages and the Worker to Cloudflare Edge.

---

## Project Structure

```text
weldvision-studio/
├── functions/
│   └── api/
│       └── [[route]].ts        # Hono Worker — REST API + Workers AI
├── src/
│   ├── components/
│   │   ├── AudioToggle.tsx      # Mute/unmute audio feedback
│   │   ├── DefectAnalyzer.tsx   # Weld defect detection & AWS standards
│   │   ├── DefectGallery.tsx    # Visual defect reference library
│   │   ├── DistortionVisualizer.tsx  # Thermal distortion charts
│   │   ├── JointVisualizer.tsx  # 2D joint cross-section view
│   │   ├── LandingPage.tsx      # Entry / splash screen
│   │   ├── ModelViewer3D.tsx    # Three.js 3D weld bead renderer
│   │   ├── PredictiveAnalysis.tsx # AI-powered crack-risk analysis
│   │   ├── WeldingControls.tsx  # Parameter sliders & inputs
│   │   ├── WeldingLabPresets.tsx # Pre-configured training scenarios
│   │   └── WeldQuiz.tsx         # Interactive knowledge quiz
│   ├── utils/
│   │   ├── metallurgy.ts        # Metallurgical physics models
│   │   └── simulation.ts        # Weld process simulation engine
│   ├── App.tsx                  # Root application component
│   ├── index.css                # Tailwind + global styles
│   ├── main.tsx                 # React entry point
│   └── types.ts                 # TypeScript type definitions
├── ARCHITECTURE.md              # Full system architecture documentation
├── index.html                   # HTML entry point
├── metadata.json                # AI Studio metadata
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
└── wrangler.toml                # Cloudflare Workers / Pages config
```

---

## API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/predictive-analysis` | AI metallurgical crack-risk analysis (Workers AI) |

---

## Architecture

WeldSim Studio is the **web frontend** of the WeldVision ecosystem. The full system includes:

1. **Android Trainer App** — Camera-based weld inspection with biometric auth
2. **MQTT Telemetry Pipeline** — 60 Hz coordinate streams via Mosquitto (LAN) / HiveMQ (WAN)
3. **Cloudflare Edge** — Worker routing, thermophysics engine, Workers AI inference
4. **D1 + R2 Storage** — Relational scores & rosters, object telemetry archives

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the complete four-layer design.

---

## License

Proprietary — WeldVision Studio. All rights reserved.
