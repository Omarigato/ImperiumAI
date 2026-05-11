# AegisAI – 3D models directory

This folder is served by Next.js as `/models/*` at runtime. Drop your `.glb`
or `.gltf` files here and they will be auto-loaded by
`frontend/components/ModelAsset.jsx` through the registry in
`frontend/lib/modelRegistry.js`.

If a file is **missing**, the scene does **not** crash — `ModelAsset` falls
back to a stylised low-poly primitive of the same role colour. This means the
project always runs, even without any assets committed.

---

## Expected file names

The registry currently looks for these files:

```
house.glb
smart_door.glb           (front door)
smart_lock.glb
garage_door.glb
security_camera.glb      (camera_system)
baby_monitor.glb
security_panel.glb
alarm.glb

window_sensor.glb
motion_sensor.glb
smoke_detector.glb

thermostat.glb
water_valve.glb
power_meter.glb
smart_light.glb          (lights)

smart_tv.glb
smart_speaker.glb
voice_assistant.glb

router.glb
vacuum_robot.glb

agent_robot.glb          (ShadowInjector)
agent_mech.glb           (PrivilegeReaper / NetworkPhantom)
agent_drone.glb          (ContextPhantom / SilentEscalator)

car.glb                  (optional yard prop)
tree.glb                 (optional yard prop)
```

The mapping from a device id (`smart_lock`, `voice_assistant`, …) or a
red-team agent name (`ShadowInjector`, `ContextPhantom`, …) to one of these
files is defined in `frontend/lib/modelRegistry.js`. **Add the file here AND
update the registry only if you want a different file name.**

---

## File format priority

Use these formats, in this order:

1. **.glb** — preferred (single self-contained binary glTF).
2. **.gltf** — fine, but make sure the `.bin` / texture sidecars are next to it.
3. .fbx / .obj / .blend — must be **converted to .glb in Blender** before use.

> `react-three-fiber` + `useGLTF` only loads glTF. Don't drop raw `.fbx`,
> `.obj`, `.dae`, `.stl` here — they won't render.

---

## Where to get free models

Use only assets you can actually **download** as glTF / FBX / OBJ. The list:

- [Sketchfab — downloadable free models](https://sketchfab.com/3d-models?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b)
- [Poly Pizza](https://poly.pizza/)
- [Kenney.nl](https://www.kenney.nl/assets) (CC0, low-poly stylised — great for IoT props)
- [Quaternius](https://quaternius.com/) (CC0)
- [Free3D](https://free3d.com/) (filter by `.glb` / `.fbx` / `.obj` only)

### Conversion (Blender, free)

`File → Import → <fbx/obj/dae>` → `File → Export → glTF 2.0 (.glb)`.

Recommended export settings:
- Format: **glTF Binary (.glb)**
- Include: **Selected Objects** (avoid exporting the cameras / lights)
- Mesh: **Apply Modifiers**, **UVs**, **Normals**
- Compression: **Draco** (smaller files; r3f handles it).

---

## ❌ Sketchfab iframe embeds — NOT supported

Sketchfab provides an `<iframe>` viewer. That iframe is just a hosted web
page; it is **not** a 3D asset and cannot be added to a `react-three-fiber`
`<Canvas>`.

Inside three.js you need an actual mesh – which is what
`THREE.GLTFLoader` (used by `useGLTF`) produces.

**If a Sketchfab model has no "Download 3D Model" button, you cannot use it
here.** Pick a model that is explicitly marked *downloadable*.

---

## Licensing checklist

Before committing a model, check:

- [ ] License allows redistribution (CC0 / CC-BY / MIT-style free use).
- [ ] If CC-BY: add the original creator + URL to `LICENSES.md` (create one
      if it doesn't exist) and to the relevant entry in `modelRegistry.js`.
- [ ] No copyrighted brand characters (Iron Man, Pikachu, etc.).

---

## How a model is rendered (developer summary)

```jsx
import ModelAsset from '../components/ModelAsset';

<ModelAsset
  modelKey="security_camera"   // matches modelRegistry.js
  fallback="camera"            // used if file is missing
  tint="#a855f7"               // role colour
  isActive={activeAttack?.target === 'camera_system'}
  isBreached={device.status === 'compromised'}
  onPointerOver={...}
  onPointerOut={...}
  onClick={...}
/>
```

The `ModelAsset` component wraps `useGLTF` in a `Suspense` + an error
boundary, so any I/O error simply yields the fallback primitive without
crashing the page.
