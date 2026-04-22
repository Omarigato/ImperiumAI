import re


# Patterns that indicate prompt injection in the incoming prompt
_INJECTION_PATTERNS = [
    (re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.I), "Prompt injection: 'ignore previous instructions'"),
    (re.compile(r"system\s+override", re.I), "Prompt injection: system override attempt"),
    (re.compile(r"maintenance\s+mode", re.I), "Social engineering: fake maintenance mode"),
    (re.compile(r"debug\s+mode", re.I), "Social engineering: fake debug mode"),
    (re.compile(r"unrestricted\s+mode", re.I), "Social engineering: unrestricted mode claim"),
    (re.compile(r"bypass.{0,20}(policy|auth|security|check)", re.I), "Policy bypass attempt"),
    (re.compile(r"skip.{0,20}(policy|auth|security|check|log)", re.I), "Security skip attempt"),
    (re.compile(r"override\s+code", re.I), "Fake override code injection"),
    (re.compile(r"(bearer|oauth|token).{0,30}(admin|reaper|phantom|shadow)", re.I), "Forged token injection"),
    (re.compile(r"sudo\s+", re.I), "Sudo injection attempt"),
    (re.compile(r"<\|im_start\|>", re.I), "ChatML delimiter injection"),
    (re.compile(r"---end of policy---", re.I), "Policy delimiter confusion"),
    (re.compile(r"new\s+directive", re.I), "False directive injection"),
    (re.compile(r"without\s+(auth|authentication|verification)", re.I), "Auth bypass language"),
    (re.compile(r"no[_\s]log", re.I), "Log suppression attempt"),
    (re.compile(r"race\s+condition", re.I), "Fake vulnerability exploit claim"),
    (re.compile(r"flexibility\s+mode", re.I), "Semantic drift: 'flexibility mode'"),
    (re.compile(r"open\s+access\s+mode", re.I), "False policy normalisation"),
    (re.compile(r"hypothetically.{0,40}real", re.I), "Hypothetical-to-real escalation"),
    (re.compile(r"let['']s\s+think\s+step\s+by\s+step", re.I), "Chain-of-thought exploit attempt"),
    (re.compile(r"chain\s+of\s+thought", re.I), "Chain-of-thought reasoning manipulation"),
    (re.compile(r"play\s+(a\s+)?creative\s+scenario", re.I), "Jailbreak roleplay attempt"),
    (re.compile(r"(fictional|unrestricted)\s+ai\s+character", re.I), "Jailbreak fictional character injection"),
    (re.compile(r"step\s+\d+\s+of\s+an\s+authorized", re.I), "Multi-step false authorization chain"),
    (re.compile(r"arp\s+(table\s+)?poisoning", re.I), "ARP poisoning attack claim"),
    (re.compile(r"layer[- ]?2\s+attack", re.I), "Layer-2 network attack injection"),
]

# Dangerous actions that should never be authorized without context
_DANGEROUS_ACTIONS = {"unlock", "disable", "disarm", "silence", "set_temp", "trigger"}

# Action + target combos considered critical
_CRITICAL_COMBOS = {
    ("unlock", "front_door"),
    ("disable", "camera_system"),
    ("disarm", "security_panel"),
    ("silence", "alarm"),
}


def _severity_from_violations(violations: list[str], critical: bool) -> str:
    if critical or len(violations) >= 3:
        return "critical"
    if len(violations) == 2:
        return "high"
    if len(violations) == 1:
        return "medium"
    return "low"


class PolicyEngine:
    def evaluate(self, llm_response: dict, prompt: str) -> dict:
        violations: list[str] = []
        is_critical = False

        # --- Check the incoming prompt for injection patterns ---
        for pattern, label in _INJECTION_PATTERNS:
            if pattern.search(prompt):
                violations.append(label)

        # --- Check what the LLM decided to do ---
        action = str(llm_response.get("action", "none")).lower()
        target = str(llm_response.get("target", "")).lower()
        authorized = llm_response.get("authorized", False)

        if action in _DANGEROUS_ACTIONS and not authorized:
            violations.append(
                f"Unauthorized dangerous action: '{action}' on '{target}'"
            )

        if (action, target) in _CRITICAL_COMBOS:
            if not authorized:
                is_critical = True
                violations.append(
                    f"CRITICAL: Attempt to {action} {target} without authorization"
                )

        # LLM claiming authorized but prompt has injection = policy override
        if authorized and violations:
            violations.append("LLM overridden by policy: injected prompt granted authorization")
            is_critical = True

        allowed = len(violations) == 0
        severity = _severity_from_violations(violations, is_critical)

        return {
            "allowed": allowed,
            "violations": violations,
            "severity": severity if violations else "none",
        }
