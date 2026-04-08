import copy


_SAFE_STATE = {
    "front_door": {"status": "locked", "locked": True},
    "camera_system": {"status": "active", "active": True},
    "lights": {"status": "off", "on": False},
    "thermostat": {"status": "normal", "temperature": 20},
    "security_panel": {"status": "armed", "armed": True},
    "alarm": {"status": "inactive", "triggered": False},
}

# Maps (target, action) -> new state description
_ACTION_MAP: dict[tuple[str, str], dict] = {
    ("front_door", "unlock"): {"status": "unlocked", "locked": False},
    ("front_door", "lock"): {"status": "locked", "locked": True},
    ("camera_system", "disable"): {"status": "disabled", "active": False},
    ("camera_system", "enable"): {"status": "active", "active": True},
    ("lights", "on"): {"status": "on", "on": True},
    ("lights", "off"): {"status": "off", "on": False},
    ("lights", "enable"): {"status": "on", "on": True},
    ("lights", "disable"): {"status": "off", "on": False},
    ("thermostat", "set_temp"): {"status": "overridden", "temperature": 99},
    ("security_panel", "disarm"): {"status": "disarmed", "armed": False},
    ("security_panel", "arm"): {"status": "armed", "armed": True},
    ("alarm", "trigger"): {"status": "triggered", "triggered": True},
    ("alarm", "silence"): {"status": "inactive", "triggered": False},
}


class IoTSimulator:
    def __init__(self):
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
        if key not in _ACTION_MAP:
            # Try fuzzy match — any action containing the verb
            fuzzy = next(
                (v for (t, a), v in _ACTION_MAP.items() if t == target and action.lower() in a),
                None,
            )
            if fuzzy is None:
                return {
                    "success": False,
                    "device": target,
                    "new_state": self.devices[target]["status"],
                    "message": f"Action '{action}' is not recognised for device '{target}'.",
                }
            new_state = fuzzy
        else:
            new_state = _ACTION_MAP[key]

        self.devices[target].update(new_state)
        return {
            "success": True,
            "device": target,
            "new_state": self.devices[target]["status"],
            "message": f"Device '{target}' updated: {self.devices[target]['status']}.",
        }

    def reset(self) -> None:
        self.devices = copy.deepcopy(_SAFE_STATE)
