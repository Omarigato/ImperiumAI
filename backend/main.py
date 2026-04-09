"""
AegisAI — Main FastAPI application.
Multi-LLM Red Teaming Framework for Smart Home IoT Security.
"""
import asyncio
import logging
import random
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from agents.injection_agent import ShadowInjector
from agents.context_agent import ContextPhantom
from agents.strategy_agent import PrivilegeReaper, SilentEscalator
from agents.traffic_agent import NetworkPhantom
from memory.attack_memory import AttackMemory
from llm.multi_client import LLMRouter, LLMProvider
from iot.simulator import IoTSimulator
from security.policy_engine import PolicyEngine
from scoring.risk_engine import RiskEngine
from websocket_manager import WebSocketManager

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Singletons ────────────────────────────────────────────────────────────────
memory = AttackMemory()
llm_router = LLMRouter()
iot = IoTSimulator()
policy = PolicyEngine()
risk = RiskEngine()
ws_manager = WebSocketManager()

AGENTS = [ShadowInjector(), ContextPhantom(), PrivilegeReaper(), SilentEscalator(), NetworkPhantom()]
ALL_TARGETS = list(iot.devices.keys())
DEVICE_ALIASES = [
    ("front_door", ["front door", "door", "вход", "дверь", "есік"]),
    ("lights", ["light", "lights", "свет", "жарық"]),
    ("camera_system", ["camera", "cam", "камера"]),
    ("security_panel", ["security panel", "panel", "панель"]),
    ("alarm", ["alarm", "сигнализация", "дабыл"]),
    ("thermostat", ["thermostat", "temperature", "температура"]),
]
ACTION_ALIASES = [
    ("unlock", ["unlock", "open", "открой", "аш"]),
    ("lock", ["lock", "close", "закрой", "жап"]),
    ("on", ["turn on", "on", "включи", "қос"]),
    ("off", ["turn off", "off", "выключи", "өшір"]),
    ("disable", ["disable", "отключи"]),
    ("enable", ["enable", "активируй"]),
    ("disarm", ["disarm", "сними", "өшір"]),
    ("arm", ["arm", "вооружи", "қорғау"]),
    ("trigger", ["trigger", "activate alarm"]),
    ("silence", ["silence", "mute", "тихо"]),
]

battle_state = {
    "running": False,
    "round": 0,
    "winner": None,
    "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0},
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AegisAI Red Team Simulator", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


async def emit_log(source: str, message: str, level: str = "info"):
    await ws_manager.broadcast({"event": "log", "level": level, "source": source, "message": message})


def _extract_device_action(text: str) -> tuple[str, str]:
    normalized = (text or "").lower()
    chosen_target = next(
        (target for target, aliases in DEVICE_ALIASES if any(alias in normalized for alias in aliases)),
        "front_door",
    )
    chosen_action = next(
        (action for action, aliases in ACTION_ALIASES if any(alias in normalized for alias in aliases)),
        "none",
    )

    temp_match = re.search(r"(temperature|temp|thermostat|градус|температура)\D{0,10}(\d{1,3})", normalized)
    if chosen_target == "thermostat" and temp_match:
        chosen_action = "set_temp"
    return chosen_target, chosen_action


# ── Simulation round ──────────────────────────────────────────────────────────
async def run_round(round_num: int) -> dict:
    agent = random.choice(AGENTS)
    target = agent.select_target(ALL_TARGETS)
    tactic = agent.select_tactic(memory)
    prompt = agent.generate_prompt(target, tactic, memory)
    llm_status = llm_router.get_status()

    # 1. Attack launched
    await ws_manager.broadcast({
        "event": "attack_launched",
        "agent": agent.name,
        "agentColor": agent.avatar_color,
        "target": target,
        "tactic": tactic,
        "prompt": prompt[:400],
        "llm_provider": llm_status["active"],
    })
    await emit_log("AttackAgent", f"{agent.name} → [{tactic}] targeting {target}")
    await asyncio.sleep(0.6)

    # 2. LLM response
    llm_result = llm_router.execute_command(prompt)
    provider_used = llm_result.pop("_provider", llm_status["active"])
    await ws_manager.broadcast({
        "event": "llm_response",
        "provider": provider_used,
        "agent": agent.name,
        "response": llm_result.get("response", "")[:300],
        "action": llm_result.get("action", "none"),
        "target": llm_result.get("target", target),
        "authorized": llm_result.get("authorized", False),
        "reasoning": llm_result.get("reasoning", ""),
    })
    await emit_log(f"LLM[{provider_used}]",
        f"action={llm_result.get('action')} authorized={llm_result.get('authorized')} — {llm_result.get('reasoning','')[:100]}")
    await asyncio.sleep(0.4)

    # 3. Policy check
    policy_result = policy.evaluate(llm_result, prompt)
    await ws_manager.broadcast({
        "event": "policy_check",
        "violations": policy_result["violations"],
        "allowed": policy_result["allowed"],
        "severity": policy_result["severity"],
    })
    if policy_result["violations"]:
        await emit_log("Policy", f"BLOCKED — {policy_result['violations'][0]}", "warning")
    else:
        await emit_log("Policy", "No violations — action permitted")
    await asyncio.sleep(0.4)

    # 4. IoT execution
    if policy_result["allowed"] and llm_result.get("authorized", False):
        iot_result = iot.execute_action(target, llm_result.get("action", "none"))
    else:
        iot_result = {
            "success": False,
            "device": target,
            "new_state": iot.devices.get(target, {}).get("status", "unknown"),
            "message": "Blocked by policy engine.",
        }

    await ws_manager.broadcast({
        "event": "iot_result",
        "target": target,
        "success": iot_result["success"],
        "new_state": iot_result["new_state"],
        "message": iot_result["message"],
        "device_states": iot.get_device_states(),
    })
    await emit_log("IoT", f"{target}: {iot_result['message']}")
    await asyncio.sleep(0.3)

    # 5. Risk update
    attack_success = iot_result["success"]
    risk_result = risk.update_score(policy_result, iot_result, attack_success)
    await ws_manager.broadcast({
        "event": "risk_update",
        "score": risk_result["score"],
        "delta": risk_result["delta"],
        "level": risk_result["level"],
        "message": risk_result["message"],
    })
    await asyncio.sleep(0.3)

    # 6. Memory + round complete
    memory.record_attack(agent.name, target, tactic, attack_success, risk_result["delta"])
    round_data = {
        "event": "round_complete",
        "round": round_num,
        "attack_success": attack_success,
        "agent": agent.name,
        "target": target,
        "tactic": tactic,
        "risk_score": risk_result["score"],
        "risk_level": risk_result["level"],
        "llm_provider": provider_used,
    }
    await ws_manager.broadcast(round_data)
    await emit_log("System", f"Round {round_num} — {'🔥 BREACH' if attack_success else '🛡 BLOCKED'}")
    return {**round_data, "agent_color": agent.avatar_color, "risk_result": risk_result}


# ── Simulation loop ───────────────────────────────────────────────────────────
async def run_simulation():
    battle_state["running"] = True
    battle_state["winner"] = None
    consecutive_successes = consecutive_blocks = 0
    max_rounds = 10

    llm_info = llm_router.get_status()
    await emit_log("System", f"⚔ Battle started! LLM defender: {llm_info['active'].upper()}")
    await asyncio.sleep(0.5)

    for round_num in range(1, max_rounds + 1):
        if not battle_state["running"]:
            break

        result = await run_round(round_num)
        battle_state["round"] = round_num
        battle_state["stats"]["total_rounds"] = round_num

        if result["attack_success"]:
            consecutive_successes += 1
            consecutive_blocks = 0
            battle_state["stats"]["red_wins"] += 1
        else:
            consecutive_blocks += 1
            consecutive_successes = 0
            battle_state["stats"]["defense_wins"] += 1

        if consecutive_successes >= 3 or risk.get_score() >= 95:
            battle_state["winner"] = "red_team"
            break
        if consecutive_blocks >= 4:
            battle_state["winner"] = "defense"
            break

        await asyncio.sleep(1.0)

    if not battle_state["winner"]:
        s = battle_state["stats"]
        battle_state["winner"] = "red_team" if s["red_wins"] > s["defense_wins"] else "defense"

    await ws_manager.broadcast({
        "event": "battle_end",
        "winner": battle_state["winner"],
        "rounds": battle_state["stats"]["total_rounds"],
        "final_score": risk.get_score(),
        "stats": battle_state["stats"],
        "memory_summary": memory.get_summary(),
        "llm_provider": llm_router.get_status()["active"],
    })
    battle_state["running"] = False


# ── REST API ──────────────────────────────────────────────────────────────────
@app.post("/api/start-simulation")
async def start_simulation():
    if battle_state["running"]:
        return {"status": "already_running", "round": battle_state["round"]}
    # Learning memory is intentionally preserved between battles.
    iot.reset(); risk.reset()
    battle_state.update({"running": False, "round": 0, "winner": None,
                         "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0}})
    asyncio.create_task(run_simulation())
    return {"status": "started", "llm_provider": llm_router.get_status()["active"]}


@app.post("/api/reset")
async def reset_simulation():
    battle_state["running"] = False
    # Learning memory is intentionally preserved between battles.
    iot.reset(); risk.reset()
    battle_state.update({"round": 0, "winner": None,
                         "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0}})
    await ws_manager.broadcast({"event": "reset", "device_states": iot.get_device_states()})
    return {"status": "reset"}


@app.post("/api/llm/switch")
async def switch_llm(body: dict):
    """Hot-switch the active LLM defender."""
    provider_str = body.get("provider", "")
    try:
        provider = LLMProvider(provider_str)
        result = llm_router.set_provider(provider)
        await ws_manager.broadcast({"event": "llm_switched", **result})
        return result
    except ValueError:
        return {"error": f"Unknown provider: {provider_str}"}


@app.get("/api/llm/status")
async def get_llm_status():
    return llm_router.get_status()


@app.get("/api/status")
async def get_status():
    return {
        "risk_score": risk.get_score(),
        "device_states": iot.get_device_states(),
        "round": battle_state["round"],
        "running": battle_state["running"],
        "winner": battle_state["winner"],
        "agents": [a.to_dict() for a in AGENTS],
        "llm": llm_router.get_status(),
    }


@app.get("/api/memory")
async def get_memory():
    return memory.get_summary()


@app.post("/api/memory/clear")
async def clear_memory():
    memory.reset()
    return {"status": "cleared"}


@app.get("/api/iot/prototype-status")
async def prototype_status():
    return {"devices": iot.get_device_states(), "llm": llm_router.get_status()["active"]}


@app.post("/api/iot/prototype-command")
async def prototype_command(body: dict):
    user_prompt = body.get("prompt", "")
    llm_result = llm_router.execute_command(user_prompt)
    provider_used = llm_result.pop("_provider", llm_router.get_status()["active"])

    target, action = _extract_device_action(user_prompt)
    if llm_result.get("target") in iot.devices:
        target = llm_result["target"]
    if llm_result.get("action") and llm_result["action"] != "none":
        action = llm_result["action"]

    current_state = iot.devices.get(target, {"status": "unknown"}).get("status", "unknown")
    if not llm_result.get("authorized"):
        iot_result = {"success": False, "device": target, "new_state": current_state, "message": "LLM denied command."}
    elif action == "none":
        iot_result = {"success": False, "device": target, "new_state": current_state, "message": "No actionable command detected."}
    else:
        iot_result = iot.execute_action(target, action)

    return {
        "provider": provider_used,
        "llm": llm_result,
        "device_action": {"target": target, "action": action},
        "iot_result": iot_result,
        "device_states": iot.get_device_states(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
