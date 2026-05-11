# AegisAI — Master Plan v2 (7 требований)

> Бэкенд перезапущен с ключами. Groq + OpenRouter + Gemini теперь активны.
> Этот план закрывает все 7 требований пользователя для финального диплома.

---

## ❶ Все атаки отображаются полно: attack → result → tactics

**Текущее состояние:** на `/battle` есть thought bubble, live logs, attack ticker — но без полной развёрнутой истории раунда.

**План:**
- **AttackCard** компонент — большая glassmorphism-карточка, появляется в центре экрана при каждом раунде:
  - 🎯 Агент + его LLM модель (иконка + badge с цветом провайдера)
  - 📜 Prompt preview (typewriter анимация с syntax-подсветкой)
  - 🛡️ LLM-ответ (JSON в читаемом виде)
  - ⚖️ Policy verdict (violations + severity)
  - 💥 IoT result (breach ✅ / blocked ❌) + какое устройство
  - 📈 Δ Risk score с анимацией
- **Round History панель** справа вместо просто logs: timeline раундов с expandable деталями
- Каждая атака сохраняется и доступна для "воспроизведения" одним кликом

---

## ❷ AI-агенты "совершенствуются" — эволюция и история

**Текущее:** в `attack_memory` (SQLite) есть raw attacks, агенты выбирают тактики по win rate. Нет видимой эволюции.

**План (backend):**
- Таблица `agent_evolutions`: `agent_name`, `version`, `unlocked_tactic`, `trigger_event`, `timestamp`
- Правила эволюции:
  - После 10 заблокированных атак → агент "учится" новой тактике (переносит вес от неудачных к новым)
  - После 3 успешных атак → агент **усиливает** успешную тактику (+20% вес)
  - После battle_end → агент апгрейд: новая версия, новая тактика из pool
- Endpoint `GET /api/agents/{name}/evolution` — вся история эволюции агента

**План (frontend):**
- `/agents/[name]` — персональная страница агента:
  - 🕰 Timeline версий (v0.1 → v0.3 → v1.0 …) как горизонтальная дорожка с unlock-событиями
  - 📊 Per-tactic success rate graph (live из backend)
  - 💡 Current evolution level + progress bar к следующему апгрейду
  - 🎨 Мини-3D превью агента на странице
- В `/battle` справа над лог-панелью — **Agent Progress Bar** для активного агента: "XP to next evolution: 7/10 blocks"

---

## ❸ Smart home совершенствуется — история защит и апгрейдов

**Текущее:** дом статичен, policy engine работает, но нет истории апгрейдов.

**План (backend):**
- Таблица `home_upgrades`: `timestamp`, `upgrade`, `unlock_trigger`, `description`
- Триггеры апгрейдов:
  - После 5 заблокированных prompt injection → "Enhanced Policy Engine v2"
  - После 3 заблокированных social engineering → "Context Validation Module"
  - После 2 блоков network attacks → "Network Firewall Upgrade"
  - После battle win → "Defense Protocol v{N+1}"
- Новый endpoint `GET /api/home/upgrades` + `GET /api/home/attack-history`
- Каждое обновление реально усиливает policy_engine (добавляются новые patterns)

**План (frontend):**
- `/home` (новая страница) или вкладка в `/dashboard`:
  - 🏠 3D-превью дома с визуальной индикацией активных защит (светящиеся щиты вокруг устройств)
  - 📜 Upgrade log (timeline с иконками типа "Unlocked: Chain-of-Thought Detector")
  - 🎯 Per-device attack counter (сколько раз атаковали front_door, camera, …)
  - 📊 Attack-vs-defense графики

---

## ❹ Красивые 3D объекты и анимации (не прямые линии!)

**Проблема:** сейчас часть эффектов атак — простые `<line>` с базовыми лучами. Нужны реальные 3D-объекты и анимации.

**План — улучшения по каждому эффекту атаки:**

| Тактика | Текущее | Upgrade |
|---|---|---|
| `direct_injection` | прямой `<line>` | **TubeGeometry** пульсирующий канал + плазменные частицы + shockwave при попадании |
| `nested_injection` | сфера внутри сферы | **3D-свёрнутая** бумага-оригами разворачивается в полёте, открывая красное ядро |
| `chain_of_thought_exploit` | 4 круга | **4 floating 3D-кубиков** с номерами 1-2-3-4, связанных дугами из частиц, разваливаются после попадания |
| `role_confusion / context_fog` | сферы | **Volumetric fog** particle system + маска с надписью "AI" поворачивается к камере |
| `memory_poisoning` | плоские boxes | **3D-свитки** (papyrus-like) с fake chat logs, падают и разбиваются |
| `token_forgery` | box | **Реалистичные JWT-токены** (card geometry с QR-декалом), крутятся и взрываются |
| `multi_step_attack` | 3 линии | **Последовательные ракеты** с огненным хвостом, стартуют с задержкой |
| `incremental_trust / boundary_erosion` | ring waves | **Медленно нарастающие волны** с постепенным размытием защитной сферы устройства |
| `jailbreak_roleplay` | torus knot | **Театральная маска** (actual mask geometry) с "actor_mode: true" |
| `dns_spoofing / mitm` | boxes | **Сетевые пакеты** (detailed packet geometry) перехватываются 3D-MITM-роутером |
| `arp_poisoning` | spheres | **Network graph** с узлами и рёбрами, один узел "отравляется" и становится красным |

**Кроме эффектов атак:**
- Дом: заменить примитивные `<box>` на `<RoundedBox>` + bevels, добавить decals (спутник-антенна, door sensor, LED-маркеры)
- Агенты: вместо humanoid-box'ов сделать **crystal-like figures** с иcтёкающими полигонами, у каждого агента уникальный силуэт
- Взрывы: заменить частицы `<sphere>` на **instanced mesh** с rotation/scale за кадр, добавить screen-space shake при breach
- Defense shield: dome → **Fresnel shader**, видно силовые линии

**Performance:**
- `instancedMesh` для всех агентов + устройств
- `useMemo` для геометрий
- Убрать Noise effect (самый тяжёлый)
- `dpr={[1, 1.5]}` на Canvas
- Lazy-load heavy effects только когда они активны

---

## ❺ Идеальное логирование

**Текущее:** есть LiveLogs справа, но без фильтров и структуры.

**План:**
- **LogLevel chips** сверху лога: `[ALL] [ATTACK] [LLM] [POLICY] [IOT] [RISK] [SYSTEM]` (одно-клик фильтрация)
- **Search bar** (fuzzy match)
- **Copy line button** и **export JSON** кнопки
- Каждая строка — expandable: click → full payload с pretty JSON
- Colour-coded не только текст, но и боковая полоска по уровню
- Timestamp с миллисекундами
- **Logs sync** с backend: когда raised shield / countermeasures → отдельный "event stream" выделяется цветом
- `/logs` страница (full-screen) с аналогичным UI + пагинация + загрузка из SQLite (в новой таблице `battle_logs`)

**Backend:**
- Таблица `battle_logs`: `id`, `battle_id`, `round`, `timestamp`, `level`, `source`, `message`, `payload_json`
- Endpoint `GET /api/logs?battle_id=…&level=…&limit=…`

---

## ❻ Аналитика (усиление `/dashboard`)

**План:**
- **Heatmap "Agent × Target"** — сколько успешных атак / total, с цветом от зелёного к красному
- **Timeline risk score** по всем battles (area chart с brushing)
- **LLM-провайдер сравнение**: success rate каждого агента в зависимости от используемой LLM (новая фича с multi-LLM!)
  - Bar: `ShadowInjector на Groq Llama: 64% breach rate` vs `на Gemini: 32% breach rate` — **это научная новизна!**
- **Tactic effectiveness over time** — линии с трендом (агент учится)
- **Blocked-vs-succeeded pie** для каждой severity
- **Session stats**: total battles, total rounds, avg risk, avg rounds per battle
- **Export CSV** кнопка

Все карточки в glass-panel с анимациями Framer Motion.

---

## ❼ Оптимизации (фикс лагов)

**Обнаруженные проблемы:**
- На `/` два больших Canvas (hero) + постпроцессинг + noise → главный виновник
- SmartHome3D в `/battle` тоже с полным постпроцессингом
- `useFrame` в каждом эффекте атаки (много хуков)
- Нет dpr limiter
- AmbientStars с 200 точками постоянно вращается

**План оптимизаций:**
1. **Hero на `/`:** уменьшить stars 200→80, snizить postprocess intensity, `dpr={[1, 1.4]}`, `frameloop="always"` только когда видно (`useInView`)
2. **Убрать Noise** из постпроцессинга (самый тяжёлый)
3. **Убрать ChromaticAberration** с `/` (оставить на `/battle` только)
4. **Lazy рендер** AttackEffect — только когда activeAttack != null
5. **instancedMesh** для sparks / fragments в эффектах
6. **Canvas `dpr={[1, 1.5]}`** везде
7. **shadow-mapSize=[512, 512]** вместо 1024 для hero (детали не видны)
8. **Level of detail (LOD)** — когда камера далеко, упрощать геометрии
9. **GPU query** для поддержки postprocessing (если устройство слабое — отключаем)
10. **`powerPreference: 'high-performance'`** в GL настройках
11. Сократить `useFrame` хуки: один главный в `useFrame` раздающий время, остальные читают из ref
12. **React.memo** на статичные компоненты (House, PerimeterFence, AmbientParticles)

---

## 📋 Порядок реализации (фаза за фазой)

### Phase A (Оптимизация — **срочно**)
A1. Фикс лагов на `/` (dpr, убрать Noise, уменьшить stars, lazy postprocess)
A2. Оптимизация `/battle` SmartHome3D (memo, instancedMesh, убрать лишние useFrame)
A3. Проверка на dev-сервере с тротлингом CPU

### Phase B (Backend — эволюция и история)
B1. Таблицы `agent_evolutions`, `home_upgrades`, `battle_logs` в SQLite
B2. Логика эволюции агентов (в run_round)
B3. Логика апгрейдов дома (в run_round на блоках)
B4. Новые endpoints: evolution, upgrades, logs
B5. Broadcast `agent_evolved` / `home_upgraded` WebSocket events

### Phase C (Frontend — AttackCard + улучшенные логи)
C1. **AttackCard** компонент с раскрытой информацией атаки
C2. **LogsPanel v2** с фильтрами, search, expandable items
C3. **Round Timeline** справа вместо сырых логов

### Phase D (3D upgrades — красивые объекты)
D1. TubeGeometry + plasma для direct_injection
D2. Origami unfolding для nested_injection
D3. 3D-кубики для chain_of_thought
D4. Volumetric fog для context effects
D5. Realistic packets + MITM router для network attacks
D6. Improved shield dome (Fresnel)
D7. RoundedBox + decals для дома
D8. Crystal figures для агентов

### Phase E (Pages — agents + home + dashboard)
E1. `/agents/[name]` — персональная страница агента с timeline + stats
E2. `/home` или dashboard-tab — smart-home history + upgrades
E3. `/dashboard` — heatmap + LLM comparison + timeline
E4. `/logs` — полноэкранный logs page

### Phase F (Полировка)
F1. Мелкая анимация + микровзаимодействия
F2. Loading states + skeleton screens
F3. Mobile breakpoints
F4. Финальный build + проверка

---

## Что сделаем прямо сейчас (Phase A)

Начнём с **оптимизаций** чтобы убрать лаги, потом по порядку B → C → D → E.
