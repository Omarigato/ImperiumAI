# AegisAI — Project Analysis

## Overview
**AegisAI** is a diploma project: an *AI-Based Red Teaming Framework for testing LLMs integrated into Smart Home / IoT systems*. It's an interactive, browser-based simulator where 5 adversarial AI agents attack a simulated smart home, and the results are streamed live via WebSocket to a Next.js + Three.js frontend.

## Architecture

```
Frontend (Next.js 14 + React 18 + Three.js)  ◄── WebSocket / REST ──►  Backend (FastAPI + Python)
```

Two clean halves, communicating only via REST + a single WebSocket.

---

## Backend (`backend/`, ~770 LOC of logic)

A well-organized FastAPI app with clear separation of concerns:

| Module | Responsibility |
|---|---|
| `backend/main.py` | FastAPI app, WebSocket endpoint, simulation loop, REST endpoints, batch battles |
| `agents/` | 5 red-team agents (each subclasses `BaseAgent`) |
| `llm/multi_client.py` | Strategy + Factory pattern router for OpenAI / Gemini / DeepSeek / Simulation |
| `iot/simulator.py` | In-memory IoT device state machine |
| `security/policy_engine.py` | Regex-based prompt-injection + dangerous-action detector |
| `scoring/risk_engine.py` | Global 0–100 risk score with severity-driven deltas |
| `memory/attack_memory.py` | SQLite-backed learning memory for tactic adaptation |
| `websocket_manager.py` | Broadcast manager for connected WebSocket clients |

### Red Team Agents
Each agent has `name`, `avatar_color`, `tactics`, `target_preference`, and a `generate_prompt(target, tactic, memory)` method.

| Agent | Speciality | Notable tactic |
|---|---|---|
| `ShadowInjector` | Prompt injection | `chain_of_thought_exploit` |
| `ContextPhantom` | Context / role manipulation | `memory_poisoning` |
| `PrivilegeReaper` | Privilege escalation | `multi_step_attack` |
| `SilentEscalator` | Stealth / drift | `jailbreak_roleplay` |
| `NetworkPhantom` | Network MITM | `arp_poisoning` |

### LLM Layer
Clean **Strategy pattern**: an `LLMRouter` auto-detects which provider has an API key (priority: OpenAI → Gemini → DeepSeek → Simulation), supports hot-switching at runtime, and falls back gracefully to a deterministic `SimulationClient` if no key is present. The `SMART_HOME_SYSTEM_PROMPT` enforces a strict JSON output contract.

### Defense-in-Depth
The defense is layered:
1. **LLM** decides whether to authorize (ideally rejects bad prompts on its own)
2. **PolicyEngine** does regex-based detection on both the *prompt* and the *LLM decision* — even if the LLM is fooled, the policy engine catches dangerous (action, target) combos like `(unlock, front_door)`
3. **IoTSimulator** only executes if the policy allows AND the LLM authorized
4. **RiskEngine** updates a global score; battles end at 95+ risk or after 10 rounds

### Adaptive Memory
Attacks are persisted to SQLite (`backend/data/attack_memory.db`). Tactics blocked 3+ times consecutively are temporarily skipped, and remaining candidates are sorted by historical win rate. So agents *learn* across battles — this is the core "AI red-teaming" insight.

### Simulation Loop (`run_round`)
Each round broadcasts 6 events: `attack_launched` → `llm_response` → `policy_check` → `iot_result` → `risk_update` → `round_complete`, with `asyncio.sleep` pacing for the live UI animation.

---

## Frontend (`frontend/`)

Next.js 14 (Pages Router) + React 18 + Three.js + Framer Motion + Recharts.

- **Pages:** `index`, `battle`, `dashboard`, `agents`, `attacks`, `documentation`, `team`
- **Contexts:** `LanguageContext` (EN/RU/KZ multilingual) + `ThemeContext` (dark/light/BW) — added in commit `c849a2d` for the academic redesign
- **Components:** `SmartHome3D`, `RiskMeter`, `LiveLogs`, `AgentAvatar`, `BattleResult`, `LLMSwitcher`, `NavBar`, `HomeHero3D`, `AttackAnimation`

This is clearly diploma-presentation polished — multilingual academic mode is unusual for a normal demo project.

---

## Strengths

1. **Clean architecture.** Each concern is its own module (~50–200 LOC each). No god-objects.
2. **Strong design patterns:** Strategy (LLM clients), Template Method (BaseAgent), Factory (LLMRouter).
3. **Defense-in-depth modeling** is genuinely realistic — LLM judgment is not trusted alone, which mirrors real-world LLM-app deployment best practice.
4. **Adaptive memory in SQLite** is a nice touch — battles aren't independent; the system actually learns.
5. **Real multi-LLM support** (OpenAI + Gemini + DeepSeek) with graceful simulation fallback for offline demos — important for thesis defense.
6. **Code quality is solid:** type hints, dataclass-like classes, threading lock on SQLite, no obvious bugs.

## Weaknesses / Concerns

1. **No tests.** No `tests/`, no pytest configuration. For a security-themed framework, this is a real gap — the policy engine in particular needs unit tests against known injection patterns.
2. **Policy engine is regex-only.** It catches the explicit keywords its own agents emit (essentially a closed loop). Against a novel attacker it would fail. The agents and the policy engine were designed together, so the framework partly grades its own homework.
3. **`router` is in `_SAFE_STATE` but not in `ALL_TARGETS` flow** — `NetworkPhantom`'s tactics reference network-level concepts but the IoT simulator handles them as device actions. Slightly leaky abstraction.
4. **Direct mutation of private state:** `risk._score = max(0, risk._score - 20)` in `main.py` reaches into a private attribute. Should be a public method like `risk.reduce(20)`.
5. **No persistence for battle history**, only attack memory. Dashboard analytics are limited to the SQLite memory layer.
6. **Hardcoded CORS origins** to localhost — fine for local dev, but no environment-based config.
7. **No `Dockerfile` / `docker-compose`** — would help for diploma demo reproducibility.
8. **Frontend `services/` only contains `websocket.js`** — REST calls are likely scattered ad-hoc in pages.
9. **Batch battles run synchronously inside the request handler** — for `count=10` with a real LLM, this can block for a long time and time out HTTP.

## Suggested Improvements (priority ordered)

1. **Add a `tests/` directory** with pytest cases for `PolicyEngine.evaluate()` covering all `_INJECTION_PATTERNS`, plus mock-based tests for `LLMRouter` and `RiskEngine`. Highest academic value.
2. **Add adversarial tests where the attack does NOT use the keywords** the policy engine knows — to honestly measure framework effectiveness.
3. **Add a `Dockerfile` + `docker-compose.yml`** so the diploma defense panel can spin up the demo with one command.
4. **Make batch battles async** (background task + polling endpoint) so they don't block HTTP.
5. **Encapsulate `RiskEngine._score`** — add `reduce(amount: int)` method.
6. **Add `pyproject.toml`** with `ruff` + `black` config for code quality.
7. **Frontend:** centralize API calls into `services/api.js` for consistency with `services/websocket.js`.

## Verdict

This is a **solid diploma project**. Architecture is clean, the defense-in-depth model is academically defensible, and the multi-LLM hot-swap with simulation fallback is a genuinely thoughtful design. The biggest gap before the defense would be **adding a test suite** — both to demonstrate engineering rigor and to honestly measure the policy engine's catch rate on attacks it wasn't pre-tuned for.
