# ⚔ AegisAI — Interactive AI Red Teaming Battle Simulator

AegisAI is a real-time browser-based simulator where four adversarial AI agents attack a simulated smart-home IoT system. Every attack flows through Google Gemini, a policy engine, and a risk scorer — all visualised live with WebSockets, Three.js, and Framer Motion.

---

## Architecture

```
┌──────────────────────────────┐     WebSocket / REST      ┌──────────────────────────────┐
│  Frontend  (Next.js + React) │◄─────────────────────────►│  Backend (FastAPI + Python)  │
│                              │                            │                              │
│  pages/index.jsx             │                            │  main.py                     │
│  pages/battle.jsx            │                            │  agents/  (4 red-team agents)│
│  pages/dashboard.jsx         │                            │  llm/gemini_client.py        │
│  components/SmartHome3D.jsx  │                            │  iot/simulator.py            │
│  components/RiskMeter.jsx    │                            │  security/policy_engine.py   │
│  components/LiveLogs.jsx     │                            │  scoring/risk_engine.py      │
│  components/AgentAvatar.jsx  │                            │  memory/attack_memory.py     │
└──────────────────────────────┘                            └──────────────────────────────┘
```

### Red Team Agents

| Agent | Colour | Speciality |
|---|---|---|
| **ShadowInjector** | 🔴 Red | Prompt injection (direct, nested, delimiter) |
| **ContextPhantom** | 🟣 Purple | Context & role manipulation |
| **PrivilegeReaper** | 🟠 Orange | Privilege escalation & token forgery |
| **SilentEscalator** | 🔵 Cyan | Stealthy incremental boundary erosion |

### IoT Devices simulated
`front_door` · `camera_system` · `lights` · `thermostat` · `security_panel` · `alarm`

---

## Quick Start

### 1 — Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Copy env and add your Gemini API key (optional — demo mode works without one)
cp .env.example .env

uvicorn main:app --reload --port 8000
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### 3 — Run a battle

1. Open **http://localhost:3000**
2. Click **START BATTLE**
3. Watch the four red-team agents attack the smart home in real time
4. View analytics at **http://localhost:3000/dashboard**

---

## WebSocket Events

| Event | Description |
|---|---|
| `attack_launched` | Agent selects a target and tactic |
| `llm_response` | Gemini returns its decision |
| `policy_check` | Policy engine evaluates violations |
| `iot_result` | IoT device state updated or blocked |
| `risk_update` | Global risk score changed |
| `round_complete` | Round summary |
| `battle_end` | Battle over with winner and stats |
| `log` | Colour-coded log message |

---

## Environment Variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (optional — falls back to simulation) |

---

## Tech Stack

**Backend:** Python · FastAPI · uvicorn · google-generativeai · pydantic · python-dotenv

**Frontend:** Next.js 14 · React 18 · Three.js · @react-three/fiber · Framer Motion · Recharts · Tailwind CSS
