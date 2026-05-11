/**
 * 3D model registry — AegisAI.
 *
 * Every entry corresponds to a real .glb shipped in `frontend/public/models/`.
 * Each entry tells `ModelAsset` how to normalise the model:
 *
 *   path           — absolute URL served by Next.js
 *   fallback       — name of the procedural primitive used if the file is
 *                    missing or fails to load (never crashes the page)
 *   displayName    — human-readable name shown in Asset Debug
 *   type           — 'agent' | 'device' | 'environment'
 *   desiredHeight  — target world-space height in metres; ModelAsset will
 *                    auto-scale the model to fit this height
 *   scale          — extra multiplier applied AFTER desiredHeight (1 = none)
 *   rotation       — [x, y, z] euler in radians, applied to the model
 *   positionOffset — [x, y, z] offset added AFTER the normalisation
 *                    (centre XZ, bottom y=0). Use it for small visual tweaks.
 *   heavy          — true ⇒ NEVER preload; loaded lazily on first render.
 *
 * Sketchfab iframe embeds are NOT supported. We only use local .glb files.
 */

const D = (props) => ({
  // sane defaults so missing fields don't break anything
  scale: 1,
  rotation: [0, 0, 0],
  positionOffset: [0, 0, 0],
  desiredHeight: 1.0,
  type: 'device',
  fallback: 'box',
  ...props,
});

export const MODEL_REGISTRY = {
  // ── Architecture / Environment ──────────────────────────────────────────
  house: D({
    path: '/models/house.glb',
    fallback: 'house',
    displayName: 'Smart Home',
    type: 'environment',
    desiredHeight: 3.5,
    heavy: true,                                  // ~27 MB
  }),
  cyber_city_bg: D({
    path: '/models/cyber_city_bg.glb',
    fallback: 'city',
    displayName: 'Cyber City',
    type: 'environment',
    desiredHeight: 12,
    positionOffset: [0, 0, -22],
    heavy: true,                                  // ~22 MB
  }),
  dystopian_city_bg: D({
    path: '/models/dystopian_city_bg.glb',
    fallback: 'city',
    displayName: 'Dystopian City',
    type: 'environment',
    desiredHeight: 14,
    positionOffset: [0, 0, -22],
    heavy: true,                                  // ~30 MB
  }),

  // ── Red-Team agent avatars ──────────────────────────────────────────────
  agent_shadow: D({
    path: '/models/agent_shadow.glb',
    fallback: 'humanoid',
    displayName: 'ShadowInjector',
    type: 'agent',
    desiredHeight: 1.7,
    heavy: true,                                  // ~28 MB
  }),
  agent_privilege: D({
    path: '/models/agent_privilege.glb',
    fallback: 'mech',
    displayName: 'PrivilegeReaper',
    type: 'agent',
    desiredHeight: 1.9,
    heavy: true,                                  // ~19 MB
    credit:
      'Mech Cyberpunk – Police Mech Lowpoly Animated · author: matthall · ' +
      'Sketchfab · free, credit requested, NoAI',
  }),
  agent_network: D({
    path: '/models/agent_network.glb',
    fallback: 'drone',
    displayName: 'NetworkPhantom',
    type: 'agent',
    desiredHeight: 1.4,
  }),
  agent_context: D({
    path: '/models/agent_context.glb',
    fallback: 'robot',
    displayName: 'ContextPhantom',
    type: 'agent',
    desiredHeight: 1.7,
  }),
  agent_silent: D({
    path: '/models/agent_silent.glb',
    fallback: 'stealth',
    displayName: 'SilentEscalator',
    type: 'agent',
    desiredHeight: 1.7,
  }),

  // ── Security / access ──────────────────────────────────────────────────
  door_handle: D({
    path: '/models/door_handle.glb',
    fallback: 'door',
    displayName: 'Smart Door',
    desiredHeight: 1.4,
    heavy: true,                                  // ~24 MB
  }),
  smart_lock: D({
    path: '/models/smart_lock.glb',
    fallback: 'lock',
    displayName: 'Smart Lock',
    desiredHeight: 0.55,
  }),
  garage_door: D({
    path: '/models/garage_door.glb',
    fallback: 'garage',
    displayName: 'Garage Door',
    desiredHeight: 1.6,
  }),
  security_panel: D({
    path: '/models/security_panel.glb',
    fallback: 'panel',
    displayName: 'Security Panel',
    desiredHeight: 0.8,
    heavy: true,                                  // ~19 MB
  }),
  alarm_button: D({
    path: '/models/alarm_button.glb',
    fallback: 'button',
    displayName: 'Alarm Button',
    desiredHeight: 0.45,
  }),

  // ── Sensors ────────────────────────────────────────────────────────────
  window_sensor: D({
    path: '/models/window_sensor.glb',
    fallback: 'sensor',
    displayName: 'Window Sensor',
    desiredHeight: 0.35,
  }),
  motion_sensor: D({
    path: '/models/motion_sensor.glb',
    fallback: 'sensor',
    displayName: 'Motion Sensor',
    desiredHeight: 0.4,
  }),
  smoke_detector: D({
    path: '/models/smoke_detector.glb',
    fallback: 'sensor',
    displayName: 'Smoke Detector',
    desiredHeight: 0.4,
  }),

  // ── Surveillance ───────────────────────────────────────────────────────
  security_camera: D({
    path: '/models/security_camera.glb',
    fallback: 'camera',
    displayName: 'Security Camera',
    desiredHeight: 0.55,
    heavy: true,                                  // ~10 MB
  }),
  baby_monitor: D({
    path: '/models/baby_monitor.glb',
    fallback: 'camera',
    displayName: 'Baby Monitor',
    desiredHeight: 0.45,
  }),

  // ── Climate / utilities ────────────────────────────────────────────────
  thermostat: D({
    path: '/models/thermostat.glb',
    fallback: 'thermostat',
    displayName: 'Thermostat',
    desiredHeight: 0.5,
  }),
  water_valve: D({
    path: '/models/water_valve.glb',
    fallback: 'valve',
    displayName: 'Water Valve',
    desiredHeight: 0.6,
  }),
  power_meter: D({
    path: '/models/power_meter.glb',
    fallback: 'panel',
    displayName: 'Power Meter',
    desiredHeight: 0.6,
  }),
  smart_light: D({
    path: '/models/smart_light.glb',
    fallback: 'light',
    displayName: 'Smart Light',
    desiredHeight: 0.45,
  }),

  // ── Multimedia / assistants ────────────────────────────────────────────
  smart_tv: D({
    path: '/models/smart_tv.glb',
    fallback: 'tv',
    displayName: 'Smart TV',
    desiredHeight: 0.6,
  }),
  smart_speaker: D({
    path: '/models/smart_speaker.glb',
    fallback: 'speaker',
    displayName: 'Smart Speaker',
    desiredHeight: 0.4,
  }),
  voice_assistant: D({
    path: '/models/voice_assistant.glb',
    fallback: 'speaker',
    displayName: 'Voice Assistant',
    desiredHeight: 0.5,
  }),

  // ── Network ────────────────────────────────────────────────────────────
  router: D({
    path: '/models/router.glb',
    fallback: 'router',
    displayName: 'Router',
    desiredHeight: 0.4,
  }),

  // ── Robotics ───────────────────────────────────────────────────────────
  vacuum_robot: D({
    path: '/models/vacuum_robot.glb',
    fallback: 'robot',
    displayName: 'Vacuum Robot',
    desiredHeight: 0.3,
  }),
};

// ── Red-team agent → model key ──────────────────────────────────────────────
export const AGENT_MODEL_KEYS = {
  ShadowInjector:  'agent_shadow',
  ContextPhantom:  'agent_context',
  PrivilegeReaper: 'agent_privilege',
  SilentEscalator: 'agent_silent',
  NetworkPhantom:  'agent_network',
};

// ── IoT device → model key (now covers every device the backend simulates) ─
export const DEVICE_MODEL_KEYS = {
  front_door:      'door_handle',
  smart_lock:      'smart_lock',
  camera_system:   'security_camera',
  thermostat:      'thermostat',
  alarm:           'alarm_button',
  security_panel:  'security_panel',
  router:          'router',
  lights:          'smart_light',
  garage_door:     'garage_door',
  window_sensor:   'window_sensor',
  motion_sensor:   'motion_sensor',
  smoke_detector:  'smoke_detector',
  baby_monitor:    'baby_monitor',
  water_valve:     'water_valve',
  power_meter:     'power_meter',
  smart_tv:        'smart_tv',
  smart_speaker:   'smart_speaker',
  voice_assistant: 'voice_assistant',
  vacuum_robot:    'vacuum_robot',
};

// ── Environment selector keys (none / cyber / dystopian) ────────────────────
export const ENVIRONMENT_KEYS = {
  none:           null,
  cyber_city:     'cyber_city_bg',
  dystopian_city: 'dystopian_city_bg',
};

export function getModelEntry(modelKey) {
  if (!modelKey) return null;
  return MODEL_REGISTRY[modelKey] || null;
}
