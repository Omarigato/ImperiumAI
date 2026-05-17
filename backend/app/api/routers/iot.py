"""
app/api/routers/iot.py
"""
from __future__ import annotations

import re

from fastapi import APIRouter

from app.core.container import get_container
from app.schemas import IoTCommandRequest

router = APIRouter(prefix="/api/iot", tags=["iot"])

_DEVICE_ALIASES = [
    ("front_door",      ["front door", "door", "дверь", "есік"]),
    ("smart_lock",      ["smart lock", "lock", "замок"]),
    ("garage_door",     ["garage", "гараж"]),
    ("window_sensor",   ["window", "окно"]),
    ("motion_sensor",   ["motion", "движение"]),
    ("smoke_detector",  ["smoke", "дым"]),
    ("lights",          ["light", "lights", "свет", "жарық"]),
    ("camera_system",   ["camera", "cam", "камера"]),
    ("baby_monitor",    ["baby monitor", "baby", "детская"]),
    ("security_panel",  ["security panel", "panel", "панель"]),
    ("alarm",           ["alarm", "сигнализация", "дабыл"]),
    ("thermostat",      ["thermostat", "temperature", "температура"]),
    ("smart_tv",        ["tv", "television", "телевизор"]),
    ("smart_speaker",   ["speaker", "колонка"]),
    ("voice_assistant", ["voice", "assistant", "ассистент"]),
    ("water_valve",     ["water", "valve", "вода"]),
    ("power_meter",     ["power", "meter", "электричество"]),
    ("vacuum_robot",    ["vacuum", "robot", "пылесос"]),
    ("router",          ["router", "wifi", "роутер"]),
]

_ACTION_ALIASES = [
    ("unlock", ["unlock", "open", "открой", "аш"]),
    ("lock",   ["lock", "close", "закрой", "жап"]),
    ("on",     ["turn on", "on", "включи", "қос"]),
    ("off",    ["turn off", "off", "выключи", "өшір"]),
    ("disable",["disable", "отключи"]),
    ("enable", ["enable", "активируй"]),
    ("disarm", ["disarm", "сними", "өшір"]),
    ("arm",    ["arm", "вооружи", "қорғау"]),
    ("trigger",["trigger", "activate alarm"]),
    ("silence",["silence", "mute", "тихо"]),
]


def _extract(text: str) -> tuple[str, str]:
    norm = (text or "").lower()
    target = next(
        (t for t, aliases in _DEVICE_ALIASES if any(a in norm for a in aliases)),
        "front_door",
    )
    action = next(
        (a for a, aliases in _ACTION_ALIASES if any(al in norm for al in aliases)),
        "none",
    )
    if target == "thermostat" and re.search(r"(temperature|temp|thermostat)\D{0,10}\d{1,3}", norm):
        action = "set_temp"
    return target, action


@router.get("/prototype-status")
async def prototype_status() -> dict:
    c = get_container()
    return {"devices": c.iot.get_device_states(), "llm": c.llm_router.get_status()["active"]}


@router.post("/prototype-command")
async def prototype_command(body: IoTCommandRequest) -> dict:
    c = get_container()
    llm_result = c.llm_router.execute_command(body.prompt)
    provider = llm_result.pop("_provider", c.llm_router.get_status()["active"])
    llm_result.pop("_model", None)

    target, action = _extract(body.prompt)
    if llm_result.get("target") in c.iot.devices:
        target = llm_result["target"]
    if llm_result.get("action") and llm_result["action"] != "none":
        action = llm_result["action"]

    current = c.iot.devices.get(target, {"status": "unknown"})["status"]
    if not llm_result.get("authorized"):
        iot_result = {"success": False, "device": target, "new_state": current, "message": "LLM denied command."}
    elif action == "none":
        iot_result = {"success": False, "device": target, "new_state": current, "message": "No actionable command detected."}
    else:
        iot_result = c.iot.execute_action(target, action)

    return {
        "provider": provider,
        "llm": llm_result,
        "device_action": {"target": target, "action": action},
        "iot_result": iot_result,
        "device_states": c.iot.get_device_states(),
    }