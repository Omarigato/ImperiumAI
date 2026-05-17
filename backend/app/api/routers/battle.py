"""
app/api/routers/battle.py
──────────────────────────
Battle simulation endpoints: start, reset, status, batch.
"""
from __future__ import annotations

import asyncio
import logging
import random

from fastapi import APIRouter

from app.core.container import get_container
from app.iot.simulator import DEFAULT_BAD_ACTIONS
from app.schemas import BatchBattleRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["battle"])

# ── Shared battle state ────────────────────────────────────────────────────────
_state: dict = {
    "running": False,
    "round": 0,
    "winner": None,
    "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0},
    "shield_active": False,
    "shield_rounds_left": 0,
}


def get_state() -> dict:
    return _state


# ── Single simulation round ────────────────────────────────────────────────────
async def run_round(round_num: int) -> dict:
    c = get_container()
    ws = c.ws_manager

    agent = random.choice(c.agents)
    target = agent.select_target(c.all_targets)
    tactic = agent.select_tactic(c.memory)
    prompt = agent.generate_prompt(target, tactic, c.memory)
    llm_status = c.llm_router.get_status()

    # ① Attack launched
    await ws.broadcast({
        "event": "attack_launched",
        "agent": agent.name,
        "agentColor": agent.avatar_color,
        "target": target,
        "tactic": tactic,
        "prompt": prompt[:400],
        "llm_provider": llm_status["active"],
    })
    await ws.emit_log("AttackAgent", f"{agent.name} → [{tactic}] targeting {target}")
    await asyncio.sleep(0.6)

    # ② LLM response
    llm_result = c.llm_router.execute_command(prompt, agent_name=agent.name)
    provider_used = llm_result.pop("_provider", llm_status["active"])
    model_used = llm_result.pop("_model", None)
    await ws.broadcast({
        "event": "llm_response",
        "provider": provider_used,
        "model": model_used,
        "agent": agent.name,
        "response": llm_result.get("response", "")[:300],
        "action": llm_result.get("action", "none"),
        "target": llm_result.get("target", target),
        "authorized": llm_result.get("authorized", False),
        "reasoning": llm_result.get("reasoning", ""),
    })
    provider_label = provider_used + (f"/{model_used.split('/')[-1][:18]}" if model_used else "")
    await ws.emit_log(
        f"LLM[{provider_label}]",
        f"action={llm_result.get('action')} authorized={llm_result.get('authorized')} "
        f"— {llm_result.get('reasoning','')[:100]}",
    )
    await asyncio.sleep(0.4)

    # ③ Policy check (shield override)
    shield_applied = False
    if _state["shield_active"] and _state["shield_rounds_left"] > 0:
        _state["shield_rounds_left"] -= 1
        shield_applied = True
        if _state["shield_rounds_left"] <= 0:
            _state["shield_active"] = False
            await ws.broadcast({"event": "shield_expired"})
        else:
            await ws.broadcast({"event": "shield_active", "rounds_left": _state["shield_rounds_left"]})

    if shield_applied:
        policy_result = {"violations": ["Shield active — all attacks intercepted"], "allowed": False, "severity": "none"}
        await ws.broadcast({"event": "policy_check", **policy_result, "shield": True})
        await ws.emit_log("Shield", f"🛡 BLOCKED attack by {agent.name}", "warning")
    else:
        policy_result = c.policy.evaluate(llm_result, prompt, tactic=tactic)
        await ws.broadcast({"event": "policy_check", **policy_result})
        if policy_result.get("bypassed"):
            await ws.emit_log("Policy", f"⚠ STEALTH BYPASS — {policy_result['violations'][0]}", "warning")
        elif policy_result["violations"]:
            await ws.emit_log("Policy", f"BLOCKED — {policy_result['violations'][0]}", "warning")
        else:
            await ws.emit_log("Policy", "No violations — action permitted")
    await asyncio.sleep(0.4)

    # ④ IoT execution
    if policy_result["allowed"]:
        action_to_run = llm_result.get("action", "none")
        if policy_result.get("bypassed") and action_to_run == "none":
            action_to_run = DEFAULT_BAD_ACTIONS.get(target, "none")
        iot_result = c.iot.execute_action(target, action_to_run)
    else:
        iot_result = {
            "success": False,
            "device": target,
            "new_state": c.iot.devices.get(target, {}).get("status", "unknown"),
            "message": "Blocked by policy engine.",
        }

    await ws.broadcast({
        "event": "iot_result",
        "target": target,
        "success": iot_result["success"],
        "new_state": iot_result["new_state"],
        "message": iot_result["message"],
        "device_states": c.iot.get_device_states(),
    })
    await ws.emit_log("IoT", f"{target}: {iot_result['message']}")
    await asyncio.sleep(0.3)

    # ⑤ Risk update
    attack_success = iot_result["success"]
    risk_result = c.risk.update_score(policy_result, iot_result, attack_success)
    await ws.broadcast({"event": "risk_update", **risk_result})
    await asyncio.sleep(0.3)

    # ⑥ Memory + round complete
    c.memory.record_attack(agent.name, target, tactic, attack_success, risk_result["delta"])
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
    await ws.broadcast(round_data)
    await ws.emit_log("System", f"Round {round_num} — {'🔥 BREACH' if attack_success else '🛡 BLOCKED'}")
    return {**round_data, "agent_color": agent.avatar_color, "risk_result": risk_result}


# ── Simulation loop ────────────────────────────────────────────────────────────
async def run_simulation() -> None:
    from app.core.config import get_settings
    cfg = get_settings()
    c = get_container()

    _state["running"] = True
    _state["winner"] = None
    consecutive_ok = consecutive_block = 0

    await c.ws_manager.emit_log(
        "System",
        f"⚔ Battle started! LLM: {c.llm_router.get_status()['active'].upper()}",
    )
    await asyncio.sleep(0.5)

    for rnd in range(1, cfg.max_rounds + 1):
        if not _state["running"]:
            break

        result = await run_round(rnd)
        _state["round"] = rnd
        _state["stats"]["total_rounds"] = rnd

        if result["attack_success"]:
            consecutive_ok += 1
            consecutive_block = 0
            _state["stats"]["red_wins"] += 1
        else:
            consecutive_block += 1
            consecutive_ok = 0
            _state["stats"]["defense_wins"] += 1

        if consecutive_ok >= cfg.consecutive_success_win or c.risk.get_score() >= cfg.risk_win_threshold:
            _state["winner"] = "red_team"
            break
        if consecutive_block >= cfg.consecutive_block_win:
            _state["winner"] = "defense"
            break

        await asyncio.sleep(cfg.round_delay_s)

    if not _state["winner"]:
        s = _state["stats"]
        _state["winner"] = "red_team" if s["red_wins"] > s["defense_wins"] else "defense"

    await c.ws_manager.broadcast({
        "event": "battle_end",
        "winner": _state["winner"],
        "rounds": _state["stats"]["total_rounds"],
        "final_score": c.risk.get_score(),
        "stats": _state["stats"],
        "memory_summary": c.memory.get_summary(),
        "llm_provider": c.llm_router.get_status()["active"],
    })
    _state["running"] = False


# ── REST endpoints ─────────────────────────────────────────────────────────────
@router.post("/start-simulation")
async def start_simulation() -> dict:
    if _state["running"]:
        return {"status": "already_running", "round": _state["round"]}
    c = get_container()
    c.iot.reset()
    c.risk.reset()
    _state.update({
        "running": False, "round": 0, "winner": None,
        "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0},
        "shield_active": False, "shield_rounds_left": 0,
    })
    asyncio.create_task(run_simulation())
    return {"status": "started", "llm_provider": c.llm_router.get_status()["active"]}


@router.post("/reset")
async def reset_simulation() -> dict:
    _state["running"] = False
    c = get_container()
    c.iot.reset()
    c.risk.reset()
    _state.update({
        "round": 0, "winner": None,
        "stats": {"red_wins": 0, "defense_wins": 0, "total_rounds": 0},
        "shield_active": False, "shield_rounds_left": 0,
    })
    await c.ws_manager.broadcast({"event": "reset", "device_states": c.iot.get_device_states()})
    return {"status": "reset"}


@router.get("/status")
async def get_status() -> dict:
    c = get_container()
    return {
        "risk_score": c.risk.get_score(),
        "device_states": c.iot.get_device_states(),
        "round": _state["round"],
        "running": _state["running"],
        "winner": _state["winner"],
        "agents": [a.to_dict() for a in c.agents],
        "llm": c.llm_router.get_status(),
    }


@router.post("/batch-battles")
async def batch_battles(body: BatchBattleRequest) -> dict:
    c = get_container()
    results = []

    for i in range(body.count):
        c.iot.reset()
        c.risk.reset()
        consecutive_ok = consecutive_block = 0
        local = {"red_wins": 0, "defense_wins": 0, "rounds": 0}
        llm_info = c.llm_router.get_status()

        for rnd in range(1, 11):
            agent = random.choice(c.agents)
            target = agent.select_target(c.all_targets)
            tactic = agent.select_tactic(c.memory)
            prompt = agent.generate_prompt(target, tactic, c.memory)

            llm_result = c.llm_router.execute_command(prompt, agent_name=agent.name)
            llm_result.pop("_provider", None)
            llm_result.pop("_model", None)
            policy_result = c.policy.evaluate(llm_result, prompt, tactic=tactic)

            if policy_result["allowed"]:
                action = llm_result.get("action", "none")
                if policy_result.get("bypassed") and action == "none":
                    action = DEFAULT_BAD_ACTIONS.get(target, "none")
                iot_result = c.iot.execute_action(target, action)
            else:
                iot_result = {"success": False, "device": target, "new_state": "blocked", "message": "Blocked"}

            attack_success = iot_result["success"]
            risk_result = c.risk.update_score(policy_result, iot_result, attack_success)
            c.memory.record_attack(agent.name, target, tactic, attack_success, risk_result["delta"])

            local["rounds"] = rnd
            if attack_success:
                consecutive_ok += 1; consecutive_block = 0; local["red_wins"] += 1
            else:
                consecutive_block += 1; consecutive_ok = 0; local["defense_wins"] += 1

            from app.core.config import get_settings
            cfg = get_settings()
            if consecutive_ok >= cfg.consecutive_success_win or c.risk.get_score() >= cfg.risk_win_threshold:
                winner = "red_team"; break
            if consecutive_block >= cfg.consecutive_block_win:
                winner = "defense"; break
        else:
            winner = "red_team" if local["red_wins"] > local["defense_wins"] else "defense"

        results.append({
            "battle": i + 1,
            "winner": winner,
            "rounds": local["rounds"],
            "red_wins": local["red_wins"],
            "defense_wins": local["defense_wins"],
            "final_risk": c.risk.get_score(),
            "llm_provider": llm_info["active"],
        })

    red_total = sum(1 for r in results if r["winner"] == "red_team")
    n = body.count
    return {
        "battles": results,
        "summary": {
            "total": n,
            "red_team_wins": red_total,
            "defense_wins": n - red_total,
            "red_win_rate": round(red_total / n, 2),
            "avg_final_risk": round(sum(r["final_risk"] for r in results) / n, 1),
            "avg_rounds": round(sum(r["rounds"] for r in results) / n, 1),
            "llm_provider": c.llm_router.get_status()["active"],
        },
    }