"""
app/iot/simulator.py
─────────────────────
Simulates a Smart Home / IoT ecosystem with 19 devices,
safe defaults, and a complete action catalogue.
"""
from __future__ import annotations

import copy

_SAFE_STATE: dict[str, dict] = {
    "front_door":      {"status": "locked",    "locked": True},
    "smart_lock":      {"status": "locked",    "locked": True},
    "garage_door":     {"status": "closed",    "open": False},
    "window_sensor":   {"status": "closed",    "open": False},
    "motion_sensor":   {"status": "active",    "active": True},
    "smoke_detector":  {"status": "active",    "active": True},
    "camera_system":   {"status": "active",    "active": True},
    "baby_monitor":    {"status": "active",    "audio": True, "video": True},
    "security_panel":  {"status": "armed",     "armed": True},
    "alarm":           {"status": "inactive",  "triggered": False},
    "thermostat":      {"status": "normal",    "temperature": 20},
    "water_valve":     {"status": "closed",    "open": False},
    "power_meter":     {"status": "normal",    "load": 50},
    "lights":          {"status": "off",       "on": False},
    "smart_tv":        {"status": "standby",   "on": False},
    "smart_speaker":   {"status": "idle",      "playing": False},
    "voice_assistant": {"status": "listening", "muted": False},
    "router":          {"status": "secure",    "firewall": True, "dns_hijacked": False},
    "vacuum_robot":    {"status": "docked",    "moving": False},
}

_ACTION_MAP: dict[tuple[str, str], dict] = {
    ("front_door",     "unlock"):                  {"status": "unlocked",    "locked": False},
    ("front_door",     "lock"):                    {"status": "locked",      "locked": True},
    ("smart_lock",     "unlock"):                  {"status": "unlocked",    "locked": False},
    ("smart_lock",     "unlock_without_auth"):     {"status": "compromised", "locked": False},
    ("smart_lock",     "lock"):                    {"status": "locked",      "locked": True},
    ("garage_door",    "open"):                    {"status": "open",        "open": True},
    ("garage_door",    "close"):                   {"status": "closed",      "open": False},
    ("window_sensor",  "disable"):                 {"status": "disabled",    "active": False},
    ("window_sensor",  "enable"):                  {"status": "active",      "active": True},
    ("motion_sensor",  "disable"):                 {"status": "disabled",    "active": False},
    ("motion_sensor",  "enable"):                  {"status": "active",      "active": True},
    ("smoke_detector", "disable"):                 {"status": "disabled",    "active": False},
    ("smoke_detector", "enable"):                  {"status": "active",      "active": True},
    ("smoke_detector", "silence"):                 {"status": "muted",       "active": False},
    ("camera_system",  "disable"):                 {"status": "disabled",    "active": False},
    ("camera_system",  "disable_recording"):       {"status": "compromised", "active": False},
    ("camera_system",  "enable"):                  {"status": "active",      "active": True},
    ("baby_monitor",   "disable_audio"):           {"status": "compromised", "audio": False, "video": True},
    ("baby_monitor",   "disable"):                 {"status": "disabled",    "audio": False, "video": False},
    ("baby_monitor",   "enable"):                  {"status": "active",      "audio": True,  "video": True},
    ("security_panel", "disarm"):                  {"status": "disarmed",    "armed": False},
    ("security_panel", "arm"):                     {"status": "armed",       "armed": True},
    ("alarm",          "trigger"):                 {"status": "triggered",   "triggered": True},
    ("alarm",          "silence"):                 {"status": "inactive",    "triggered": False},
    ("alarm",          "disable"):                 {"status": "disabled",    "triggered": False},
    ("thermostat",     "set_temp"):                {"status": "overridden",  "temperature": 99},
    ("thermostat",     "set_extreme_temperature"): {"status": "critical",    "temperature": 120},
    ("lights",         "on"):                      {"status": "on",          "on": True},
    ("lights",         "off"):                     {"status": "off",         "on": False},
    ("lights",         "enable"):                  {"status": "on",          "on": True},
    ("lights",         "disable"):                 {"status": "off",         "on": False},
    ("smart_tv",       "on"):                      {"status": "on",          "on": True},
    ("smart_tv",       "off"):                     {"status": "standby",     "on": False},
    ("smart_tv",       "execute_hidden_command"):  {"status": "compromised", "on": True},
    ("smart_speaker",  "play"):                    {"status": "playing",     "playing": True},
    ("smart_speaker",  "mute"):                    {"status": "muted",       "playing": False},
    ("smart_speaker",  "execute_hidden_command"):  {"status": "compromised", "playing": True},
    ("voice_assistant","mute"):                    {"status": "muted",       "muted": True},
    ("voice_assistant","unmute"):                  {"status": "listening",   "muted": False},
    ("voice_assistant","execute_hidden_command"):  {"status": "compromised", "muted": False},
    ("water_valve",    "open"):                    {"status": "open",        "open": True},
    ("water_valve",    "close"):                   {"status": "closed",      "open": False},
    ("water_valve",    "open_valve"):              {"status": "flooding",    "open": True},
    ("power_meter",    "overload"):                {"status": "overloaded",  "load": 240},
    ("power_meter",    "reset"):                   {"status": "normal",      "load": 50},
    ("vacuum_robot",   "start"):                   {"status": "cleaning",    "moving": True},
    ("vacuum_robot",   "dock"):                    {"status": "docked",      "moving": False},
    ("vacuum_robot",   "map_home"):                {"status": "compromised", "moving": True},
    ("vacuum_robot",   "move_to_restricted_area"): {"status": "compromised", "moving": True},
    ("router",         "disable_firewall"):        {"status": "compromised", "firewall": False, "dns_hijacked": False},
    ("router",         "dns_spoof"):               {"status": "dns_poisoned","firewall": True,  "dns_hijacked": True},
    ("router",         "change_dns"):              {"status": "dns_poisoned","firewall": True,  "dns_hijacked": True},
    ("router",         "open_port"):               {"status": "compromised", "firewall": False, "dns_hijacked": False},
    ("router",         "disable"):                 {"status": "compromised", "firewall": False, "dns_hijacked": True},
    ("router",         "restore"):                 {"status": "secure",      "firewall": True,  "dns_hijacked": False},
}

# Default dangerous actions per device (used when policy bypass forces an action)
DEFAULT_BAD_ACTIONS: dict[str, str] = {
    "front_door":      "unlock",
    "smart_lock":      "unlock_without_auth",
    "garage_door":     "open",
    "window_sensor":   "disable",
    "motion_sensor":   "disable",
    "smoke_detector":  "disable",
    "camera_system":   "disable_recording",
    "baby_monitor":    "disable_audio",
    "security_panel":  "disarm",
    "alarm":           "silence",
    "lights":          "on",
    "thermostat":      "set_extreme_temperature",
    "smart_tv":        "execute_hidden_command",
    "smart_speaker":   "execute_hidden_command",
    "voice_assistant": "execute_hidden_command",
    "water_valve":     "open_valve",
    "power_meter":     "overload",
    "vacuum_robot":    "move_to_restricted_area",
    "router":          "change_dns",
}


class IoTSimulator:
    def __init__(self) -> None:
        self.devices: dict[str, dict] = copy.deepcopy(_SAFE_STATE)

    def get_device_states(self) -> dict:
        return copy.deepcopy(self.devices)

    def execute_action(self, target: str, action: str) -> dict:
        if target not in self.devices:
            return {
                "success": False,
                "device": target,
                "new_state": "unknown",
                "message": f"Device '{target}' not found.",
            }

        key = (target, action.lower())
        new_state = _ACTION_MAP.get(key)
        if new_state is None:
            # Fuzzy match: any action containing the verb
            new_state = next(
                (v for (t, a), v in _ACTION_MAP.items() if t == target and action.lower() in a),
                None,
            )
        if new_state is None:
            return {
                "success": False,
                "device": target,
                "new_state": self.devices[target]["status"],
                "message": f"Action '{action}' not recognised for '{target}'.",
            }

        self.devices[target].update(new_state)
        return {
            "success": True,
            "device": target,
            "new_state": self.devices[target]["status"],
            "message": f"Device '{target}' updated to '{self.devices[target]['status']}'.",
        }

    def reset(self) -> None:
        self.devices = copy.deepcopy(_SAFE_STATE)