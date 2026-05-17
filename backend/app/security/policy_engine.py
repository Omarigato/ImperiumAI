"""
app/security/policy_engine.py
──────────────────────────────
Regex-based prompt injection detector + dangerous-action guard.
Implements a *tactic stealth model*: subtle tactics have a probability
of slipping past detection, simulating real-world detection gaps.
"""
from __future__ import annotations

import random
import re

# ── Stealth probability per tactic ────────────────────────────────────────────
TACTIC_STEALTH: dict[str, float] = {
    "direct_injection":         0.05,
    "instruction_override":     0.10,
    "nested_injection":         0.30,
    "delimiter_confusion":      0.35,
    "chain_of_thought_exploit": 0.55,
    "role_confusion":           0.35,
    "context_poisoning":        0.50,
    "memory_poisoning":         0.45,
    "semantic_drift":           0.60,
    "history_manipulation":     0.50,
    "context_hijack":           0.30,
    "false_authority":          0.25,
    "admin_impersonation":      0.20,
    "token_forgery":            0.15,
    "sudo_injection":           0.08,
    "permission_bypass":        0.30,
    "multi_step_attack":        0.50,
    "incremental_trust":        0.65,
    "boundary_erosion":         0.55,
    "context_normalization":    0.50,
    "jailbreak_roleplay":       0.45,
    "dns_spoofing":             0.20,
    "mitm_interception":        0.15,
    "traffic_injection":        0.20,
    "packet_sniffing":          0.45,
    "arp_poisoning":            0.25,
}

_INJECTION_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.I),   "Prompt injection: 'ignore previous instructions'"),
    (re.compile(r"system\s+override",                          re.I),   "Prompt injection: system override"),
    (re.compile(r"maintenance\s+mode",                         re.I),   "Social engineering: fake maintenance mode"),
    (re.compile(r"debug\s+mode",                               re.I),   "Social engineering: fake debug mode"),
    (re.compile(r"unrestricted\s+mode",                        re.I),   "Social engineering: unrestricted mode claim"),
    (re.compile(r"bypass.{0,20}(policy|auth|security|check)",  re.I),   "Policy bypass attempt"),
    (re.compile(r"skip.{0,20}(policy|auth|security|check|log)",re.I),   "Security skip attempt"),
    (re.compile(r"override\s+code",                            re.I),   "Fake override code injection"),
    (re.compile(r"(bearer|oauth|token).{0,30}(admin|reaper|phantom|shadow)", re.I), "Forged token injection"),
    (re.compile(r"sudo\s+",                                    re.I),   "Sudo injection attempt"),
    (re.compile(r"<\|im_start\|>",                             re.I),   "ChatML delimiter injection"),
    (re.compile(r"---end of policy---",                        re.I),   "Policy delimiter confusion"),
    (re.compile(r"new\s+directive",                            re.I),   "False directive injection"),
    (re.compile(r"without\s+(auth|authentication|verification)",re.I),  "Auth bypass language"),
    (re.compile(r"no[_\s]log",                                 re.I),   "Log suppression attempt"),
    (re.compile(r"race\s+condition",                           re.I),   "Fake vulnerability exploit claim"),
    (re.compile(r"flexibility\s+mode",                         re.I),   "Semantic drift: 'flexibility mode'"),
    (re.compile(r"open\s+access\s+mode",                       re.I),   "False policy normalisation"),
    (re.compile(r"hypothetically.{0,40}real",                  re.I),   "Hypothetical-to-real escalation"),
    (re.compile(r"let['']s\s+think\s+step\s+by\s+step",        re.I),   "Chain-of-thought exploit attempt"),
    (re.compile(r"chain\s+of\s+thought",                       re.I),   "Chain-of-thought reasoning manipulation"),
    (re.compile(r"play\s+(a\s+)?creative\s+scenario",          re.I),   "Jailbreak roleplay attempt"),
    (re.compile(r"(fictional|unrestricted)\s+ai\s+character",  re.I),   "Jailbreak fictional character injection"),
    (re.compile(r"step\s+\d+\s+of\s+an\s+authorized",         re.I),   "Multi-step false authorization chain"),
    (re.compile(r"arp\s+(table\s+)?poisoning",                 re.I),   "ARP poisoning attack claim"),
    (re.compile(r"layer[- ]?2\s+attack",                       re.I),   "Layer-2 network attack injection"),
]

_DANGEROUS_ACTIONS = {
    "unlock", "unlock_without_auth",
    "disable", "disable_recording", "disable_audio", "disable_firewall",
    "disarm", "silence",
    "set_temp", "set_extreme_temperature",
    "trigger",
    "open", "open_valve", "open_port",
    "overload",
    "dns_spoof", "change_dns",
    "execute_hidden_command",
    "map_home", "move_to_restricted_area",
}

_CRITICAL_COMBOS: set[tuple[str, str]] = {
    ("unlock",              "front_door"),
    ("unlock",              "smart_lock"),
    ("unlock_without_auth", "smart_lock"),
    ("open",                "garage_door"),
    ("disable",             "camera_system"),
    ("disable_recording",   "camera_system"),
    ("disable_audio",       "baby_monitor"),
    ("disable",             "smoke_detector"),
    ("disarm",              "security_panel"),
    ("silence",             "alarm"),
    ("disable",             "alarm"),
    ("set_extreme_temperature", "thermostat"),
    ("open_valve",          "water_valve"),
    ("overload",            "power_meter"),
    ("change_dns",          "router"),
    ("dns_spoof",           "router"),
    ("open_port",           "router"),
    ("execute_hidden_command", "voice_assistant"),
    ("execute_hidden_command", "smart_speaker"),
    ("move_to_restricted_area","vacuum_robot"),
}


def _severity(violations: list[str], critical: bool) -> str:
    if critical or len(violations) >= 3:
        return "critical"
    if len(violations) == 2:
        return "high"
    if len(violations) == 1:
        return "medium"
    return "low"


class PolicyEngine:
    def __init__(self) -> None:
        self.blocks_per_tactic: dict[str, int] = {}

    def evaluate(
        self,
        llm_response: dict,
        prompt: str,
        tactic: str | None = None,
    ) -> dict:
        violations: list[str] = []
        is_critical = False

        # 1. Scan prompt for injection patterns
        for pattern, label in _INJECTION_PATTERNS:
            if pattern.search(prompt):
                violations.append(label)

        # 2. Check LLM decision
        action = str(llm_response.get("action", "none")).lower()
        target = str(llm_response.get("target", "")).lower()
        authorized = llm_response.get("authorized", False)

        if action in _DANGEROUS_ACTIONS and not authorized:
            violations.append(f"Unauthorized dangerous action: '{action}' on '{target}'")

        if (action, target) in _CRITICAL_COMBOS and not authorized:
            is_critical = True
            violations.append(f"CRITICAL: attempt to {action} {target} without authorization")

        if authorized and violations:
            violations.append("LLM overridden by policy: injected prompt granted authorization")
            is_critical = True

        # 3. Tactic stealth — subtle tactics may bypass detection
        bypassed = False
        bypass_chance = 0.0

        if tactic and violations and not is_critical:
            base = TACTIC_STEALTH.get(tactic, 0.10)
            blocks = self.blocks_per_tactic.get(tactic, 0)
            decay = 0.5 ** (blocks / 3)  # learning: each 3 blocks halve stealth
            bypass_chance = base * decay
            if random.random() < bypass_chance:
                bypassed = True

        if bypassed:
            return {
                "allowed": True,
                "violations": [f"⚠ Stealth bypass: '{tactic}' slipped past detection (p={bypass_chance:.2f})"],
                "severity": "high",
                "bypassed": True,
                "bypass_chance": bypass_chance,
            }

        allowed = len(violations) == 0
        severity = _severity(violations, is_critical)

        if tactic and not allowed:
            self.blocks_per_tactic[tactic] = self.blocks_per_tactic.get(tactic, 0) + 1

        return {
            "allowed": allowed,
            "violations": violations,
            "severity": severity if violations else "none",
            "bypassed": False,
            "bypass_chance": bypass_chance,
        }