/**
 * 3D model registry — AegisAI.
 *
 * Maps a logical "modelKey" to a static .glb path under /public/models,
 * plus a fallback primitive shape if the file is missing or fails to load.
 *
 * Files that are expected to live in /public/models (already committed):
 *   agent_shadow.glb, agent_privilege.glb, agent_network.glb,
 *   agent_context.glb, agent_silent.glb,
 *   security_camera.glb, thermostat.glb, smart_lock.glb,
 *   door_handle.glb, alarm_button.glb,
 *   cyber_city_bg.glb, dystopian_city_bg.glb
 *
 * Sketchfab iframe embeds are NOT usable inside a react-three-fiber Canvas —
 * only real .glb / .gltf files can be loaded via useGLTF.
 */
export const MODEL_REGISTRY = {
  // ── Red-Team agent avatars ──────────────────────────────────────────────
  agent_shadow: {
    path: '/models/agent_shadow.glb',
    fallback: 'humanoid',
    scale: 0.75,
    type: 'agent',
    displayName: 'ShadowInjector',
    heavy: true,                     // ~27 MB — not preloaded
  },
  agent_privilege: {
    path: '/models/agent_privilege.glb',
    fallback: 'mech',
    scale: 0.8,
    type: 'agent',
    displayName: 'PrivilegeReaper',
    credit: 'Mech Cyberpunk – Police Mech Lowpoly Animated · author: matthall · Sketchfab · free, credit requested, NoAI',
  },
  agent_network: {
    path: '/models/agent_network.glb',
    fallback: 'drone',
    scale: 0.9,
    type: 'agent',
    displayName: 'NetworkPhantom',
  },
  agent_context: {
    path: '/models/agent_context.glb',
    fallback: 'robot',
    scale: 0.9,
    type: 'agent',
    displayName: 'ContextPhantom',
  },
  agent_silent: {
    path: '/models/agent_silent.glb',
    fallback: 'stealth',
    scale: 0.85,
    type: 'agent',
    displayName: 'SilentEscalator',
  },

  // ── IoT device models ───────────────────────────────────────────────────
  security_camera: {
    path: '/models/security_camera.glb',
    fallback: 'camera',
    scale: 0.6,
    type: 'device',
    displayName: 'Security Camera',
  },
  thermostat: {
    path: '/models/thermostat.glb',
    fallback: 'thermostat',
    scale: 0.6,
    type: 'device',
    displayName: 'Thermostat',
  },
  smart_lock: {
    path: '/models/smart_lock.glb',
    fallback: 'lock',
    scale: 0.55,
    type: 'device',
    displayName: 'Smart Lock',
  },
  door_handle: {
    path: '/models/door_handle.glb',
    fallback: 'door',
    scale: 0.65,
    type: 'device',
    displayName: 'Smart Door',
    heavy: true,                     // ~24 MB — not preloaded
  },
  alarm_button: {
    path: '/models/alarm_button.glb',
    fallback: 'button',
    scale: 0.55,
    type: 'device',
    displayName: 'Alarm Button',
  },

  // ── Environment backgrounds (VERY heavy – pick one at most) ────────────
  cyber_city_bg: {
    path: '/models/cyber_city_bg.glb',
    fallback: 'city',
    scale: 0.35,
    type: 'environment',
    displayName: 'Cyber City',
    heavy: true,                     // ~22 MB
  },
  dystopian_city_bg: {
    path: '/models/dystopian_city_bg.glb',
    fallback: 'city',
    scale: 0.25,
    type: 'environment',
    displayName: 'Dystopian City',
    heavy: true,                     // ~29 MB
  },
};

/**
 * Map a red-team agent name to its 3D avatar model key.
 * Keep in sync with backend agent names.
 */
export const AGENT_MODEL_KEYS = {
  ShadowInjector:  'agent_shadow',
  ContextPhantom:  'agent_context',
  PrivilegeReaper: 'agent_privilege',
  SilentEscalator: 'agent_silent',
  NetworkPhantom:  'agent_network',
};

/**
 * Map an IoT device id to its preferred 3D model key.
 * Devices not present here will render with a procedural fallback primitive
 * chosen by the DeviceNode in SmartHome3D.
 */
export const DEVICE_MODEL_KEYS = {
  front_door:     'door_handle',
  smart_lock:     'smart_lock',
  camera_system:  'security_camera',
  thermostat:     'thermostat',
  alarm:          'alarm_button',
  security_panel: 'alarm_button',   // share until a dedicated model arrives
  // Remaining devices deliberately omitted — they use a colour-matched
  // procedural fallback primitive rendered by ModelAsset.
};

/**
 * Environment model keys that can be swapped in/out by the user.
 */
export const ENVIRONMENT_KEYS = {
  none:              null,
  cyber_city:        'cyber_city_bg',
  dystopian_city:    'dystopian_city_bg',
};

export function getModelEntry(modelKey) {
  if (!modelKey) return null;
  return MODEL_REGISTRY[modelKey] || null;
}
