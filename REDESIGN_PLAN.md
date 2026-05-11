# AegisAI — План редизайна

> Цель: сделать проект визуально мощным и современным, чтобы дипломная тема "AI-Based Red Teaming Framework for LLMs in Smart Home & IoT" раскрылась во всём своём величии. Главное — реалистичные, **впечатляющие 3D-атаки** + подключение **бесплатных LLM-моделей** для живой демонстрации.

---

## 1. Текущее состояние (audit)

### Frontend — что уже есть

| Файл | LOC | Состояние | Решение |
|---|---|---|---|
| `pages/index.jsx` | 87 | Академическая текстовая главная — без 3D, скучная | **Переделать**: добавить cinematic 3D hero |
| `pages/battle.jsx` | 505 | Хорошая, но слишком "cyber-1990" зелено-чёрный | **Сохранить логику**, обновить визуал |
| `pages/dashboard.jsx` | 508 | Recharts, нормально | **Полировка** (glassmorphism cards) |
| `pages/agents.jsx` | 419 | Большая, текстовая | **Добавить** мини-3D превью каждого агента |
| `pages/attacks.jsx` | 789 | **Раздут**, дублирует agents.jsx | **Объединить** с `/agents` ИЛИ оставить как Attack Taxonomy с фильтрами |
| `pages/team.jsx` | 276 | Нормальная, но иногда дипломную команду показывают, иногда нет | **Сохранить** |
| `pages/documentation.jsx` | 342 | Текст диплома | **Сохранить + улучшить вёрстку** |
| `pages/_app.jsx` | 13 | OK | Сохранить |

### Components — что есть

| Файл | LOC | Состояние | Решение |
|---|---|---|---|
| `SmartHome3D.jsx` | 661 | Хороший фундамент: дом, агенты, beam, shield | **Перевернуть**: postprocessing, разные эффекты атак на каждую тактику, neon volumetric lighting |
| `HomeHero3D.jsx` | 117 | **Не используется нигде** (мёртвый код) | **Удалить или использовать** на главной как hero |
| `AgentAvatar.jsx` | 119 | OK | Сохранить, добавить glassmorphism |
| `AttackAnimation.jsx` | 94 | Базовая 2D-анимация | Возможно удалить, всё ушло в SmartHome3D |
| `BattleResult.jsx` | 234 | Модальное окно итогов | Полировка |
| `LiveLogs.jsx` | 89 | Лог справа в /battle | OK |
| `LLMSwitcher.jsx` | 99 | Переключатель моделей | **Расширить** под бесплатные модели |
| `NavBar.jsx` | 70 | Простая академическая | Полировка (sticky blur) |
| `RiskMeter.jsx` | 155 | Полукруглый метр | OK |

### Backend — что есть

Backend в хорошем состоянии (см. `PROJECT_ANALYSIS.md`). Нужны небольшие изменения только в `llm/multi_client.py` для **подключения бесплатных провайдеров**.

---

## 2. Что выкинуть (мусор)

1. ❌ `frontend/components/HomeHero3D.jsx` — **не импортируется нигде**, дублирует функциональность `SmartHome3D`. Удалить или переиспользовать на главной.
2. ❌ `frontend/components/AttackAnimation.jsx` — после редизайна SmartHome3D с tactic-specific эффектами он не нужен.
3. ⚠️ `frontend/pages/attacks.jsx` (789 LOC) — дублирует `/agents`. Нужно решить: **оставить как Attack Taxonomy** (фильтр по тактикам OWASP LLM Top 10) или удалить.
4. ❌ Дублирующиеся импорты `Link from 'next/link'` без использования в нескольких файлах (минор).

---

## 3. Что переделать (главное)

### 3.1 Главная страница `/` — Cinematic Hero

**Сейчас:** только текст, badge, заголовок, описание, список глав диплома.

**Будет:**
- **Full-screen 3D hero**: камера медленно облетает дом, 5 агентов парят вокруг, между ними проскакивают цветные молнии-атаки. Включить **postprocessing**: bloom, chromatic aberration, vignette. Hero занимает первый экран.
- Скролл вниз → прозрачные glassmorphism-карточки с целью / описанием / структурой диплома.
- Stats counter секция: "5 AI-агентов · 22 тактик · 7 IoT-устройств · 4 LLM-провайдера" с анимацией набора цифр.
- Призыв к действию: большая cinematic кнопка `▶ START LIVE BATTLE`.

### 3.2 Battle `/battle` — Современная Battle Arena

**Сохраняем:** WebSocket-логику, агентов слева, логи справа, кнопки Shield/Countermeasures.

**Меняем:**
- Заменить cyber-1990 зелёный на **neon dark** палитру: глубокий navy `#0a0e1a`, акценты `#00d4ff` (cyan), `#ff3b6b` (red), `#a855f7` (violet). Glassmorphism везде.
- 3D-сцена — **на весь экран как фон**. UI — прозрачные плавающие панели сверху (HUD-стиль).
- Убрать резкие границы `border-cyan-900/30` → заменить на `backdrop-blur` + полупрозрачные стенки.
- Risk Meter — сделать **полукруглую неоновую дугу** с пульсирующим свечением при росте.
- Active agent label — превратить в плавающий "callout" с tactic-specific иконкой.
- Thought bubble — **сделать стильнее** (glassmorphism + typewriter эффект на тексте промпта).

### 3.3 SmartHome3D — Ядро визуала

**Главное улучшение проекта.** Сейчас все атаки — одинаковый кривой beam от агента к устройству. Нужно сделать **5 разных стилей атак для 5 агентов** + **5 разных эффектов на 5 разных тактик**. Это и продемонстрирует тему диплома "разные типы атак на LLM".

#### 3.3.1 Постобработка (общее ощущение качества)
Добавить `@react-three/postprocessing`:
- **Bloom** — мощное свечение от агентов и устройств
- **ChromaticAberration** — на момент атаки
- **Vignette** — кинематографичность
- **Noise** — лёгкий зернистый эффект
- **GodRays** от directional света → **volumetric lighting**

#### 3.3.2 Tactic-specific визуальные эффекты атак

| Агент | Тактика | Визуал |
|---|---|---|
| **ShadowInjector** (red) | `direct_injection` | Прямой красный лазерный луч с искрами на устройстве |
| ShadowInjector | `nested_injection` | Луч обвивается вокруг невинного синего пакета — как троянский конь |
| ShadowInjector | `chain_of_thought_exploit` | Цепочка из 4 светящихся узлов "Step 1→2→3→4" над домом |
| **ContextPhantom** (purple) | `role_confusion` | Фиолетовый туман окутывает устройство, маска "AI" над ним |
| ContextPhantom | `memory_poisoning` | Фрагменты "истории чата" падают как искры на устройство |
| ContextPhantom | `semantic_drift` | Слова "policy" → "guideline" → "suggestion" плывут к устройству |
| **PrivilegeReaper** (orange) | `admin_impersonation` | Оранжевая корона над агентом, fake "ROOT" badge на устройстве |
| PrivilegeReaper | `token_forgery` | 3D-токен (как карта с QR) летит к устройству и разбивается |
| PrivilegeReaper | `multi_step_attack` | Несколько последовательных лучей с разной задержкой |
| **SilentEscalator** (cyan) | `incremental_trust` | Тонкие cyan-волны постепенно нарастают, почти невидимы |
| SilentEscalator | `jailbreak_roleplay` | "🎭" символ материализуется, луч "actor mode" |
| SilentEscalator | `boundary_erosion` | Защитная сфера устройства теряет частицы |
| **NetworkPhantom** (green) | `dns_spoofing` | Зелёные пакеты летят, перехватываются, перенаправляются |
| NetworkPhantom | `mitm_interception` | 3D-фигура "посередине" между агентом и устройством |
| NetworkPhantom | `arp_poisoning` | Сетевой граф с "отравленным" узлом, мигающим красным |

Каждый эффект — отдельный React-компонент `<DirectInjectionEffect />`, `<DnsSpoofingEffect />` и т.д. Главный `SmartHome3D` выбирает нужный эффект на основе `activeAttack.tactic`.

#### 3.3.3 Улучшения сцены
- **Skybox / environment** — заменить пустой фон на ночной cyberpunk skybox (`@react-three/drei` Environment preset `night`).
- **Анимация камеры** — медленный orbit при простое.
- **Реалистичные тени** — увеличить shadow map size до 2048, добавить contact shadows.
- **Domе/decals** — добавить детали на доме: спутниковая антенна, неоновая вывеска.
- **Анимированный дождь матрицы** на фоне (опционально, если не убьёт fps).

### 3.4 Dashboard `/dashboard`

- Обернуть карточки в **glassmorphism**: `backdrop-blur-xl bg-white/5 border-white/10`.
- Графики Recharts — заменить тёмный фон на градиент.
- Добавить **heatmap "agent vs target"** — какой агент успешнее против какого устройства.
- KPI карточки сверху — добавить sparkline за последние 20 раундов.

### 3.5 Agents `/agents`

- Каждая карточка агента: **встроенный мини-3D-превью** с фигурой агента (используем тот же AgentFigure из SmartHome3D, но только один агент в маленьком canvas).
- Tactic chips → click → раскрывается визуальное описание тактики с GIF-style 3D превью соответствующего эффекта.
- Stat bars: "stealth / aggression / success rate" — анимированные.

### 3.6 Documentation `/documentation`

- Добавить **table of contents** слева (sticky).
- Code blocks с syntax highlighting.
- В разделах — встроенные диаграммы (mermaid через @mermaid-js).

---

## 4. Подключение бесплатных LLM-агентов

Сейчас в `backend/llm/multi_client.py` подключены: OpenAI, Gemini, DeepSeek, Simulation. Из них **бесплатных нет** (Gemini Flash имеет бесплатный лимит, но это ограничено).

### Что добавить (всё реально бесплатно, с открытой регистрацией):

| Провайдер | Бесплатно? | Модели | Скорость |
|---|---|---|---|
| **Groq** | ✅ Да, free tier (не нужна карта) | Llama 3.1/3.3 70B, Mixtral 8x7B, Gemma2 | ⚡ ~500 ток/с (самый быстрый) |
| **OpenRouter free models** | ✅ Да, ряд моделей с суффиксом `:free` | Llama 3.1 8B, Gemma 2 9B, Mistral 7B, Qwen 2.5 | средняя |
| **Google Gemini Flash** | ✅ Free tier (15 RPM) | gemini-2.0-flash | быстрая |
| **HuggingFace Inference** | ✅ Free tier | Llama, Mistral открытые модели | медленная |
| **Together AI** | ✅ $1 кредитов при регистрации | Llama, Mixtral | средняя |

### План интеграции

1. В `backend/llm/multi_client.py` добавить классы:
   - `GroqClient` (OpenAI-совместимый API: `https://api.groq.com/openai/v1`)
   - `OpenRouterClient` (OpenAI-совместимый: `https://openrouter.ai/api/v1`)
2. В `LLMProvider` enum добавить `GROQ`, `OPENROUTER`.
3. В `_PROVIDERS` добавить новые классы.
4. В `_auto_detect()` приоритет: **Groq → Gemini → OpenRouter → OpenAI → DeepSeek → Simulation**. Так демо запустится бесплатно у любого пользователя, у которого есть хотя бы Groq API key (бесплатный).
5. Frontend `LLMSwitcher.jsx` — добавить новые провайдеры с иконками.
6. `.env.example` — обновить:
   ```
   GROQ_API_KEY=        # Free at https://console.groq.com
   OPENROUTER_API_KEY=  # Free at https://openrouter.ai
   GEMINI_API_KEY=      # Free at https://aistudio.google.com
   OPENAI_API_KEY=      # Optional (paid)
   DEEPSEEK_API_KEY=    # Optional (paid)
   ```

### Бонус: использовать **разные LLM как разных агентов** (highlight для диплома)

Сейчас агенты используют одну активную LLM. Можно сделать так, чтобы:
- ShadowInjector атаковал через Groq Llama 3.3
- ContextPhantom — через Gemini
- PrivilegeReaper — через OpenRouter Mistral
- и т.д.

А **защитник** (smart-home AI) — отдельная модель. Это даёт реальный multi-LLM red-teaming → научно ценнее для диплома.

---

## 5. Технологический стек (что добавить)

### Frontend
```bash
npm install @react-three/postprocessing leva           # Postprocessing + dev controls
npm install gsap @studio-freight/lenis                # Smooth scroll + advanced animations
npm install react-icons                                # Hero icons вместо emoji
npm install @fontsource/space-grotesk                  # Современный шрифт
```

### Backend
Никаких новых тяжёлых зависимостей не нужно — `openai` пакет уже умеет работать с любым OpenAI-совместимым endpoint (Groq, OpenRouter).

---

## 6. Дизайн-система (gold standard)

| Параметр | Значение |
|---|---|
| **Фон** | `#0a0e1a` (deep navy) с edge gradient `#1a1f2e` |
| **Glassmorphism panel** | `bg-white/[0.03] backdrop-blur-2xl border-white/10` |
| **Primary (cyan)** | `#00d4ff` |
| **Danger (red-pink)** | `#ff3b6b` |
| **Violet (agents)** | `#a855f7` |
| **Success (green)** | `#10ffac` |
| **Шрифт основной** | Space Grotesk (заголовки) + Inter (текст) |
| **Шрифт mono** | JetBrains Mono (логи, код) |
| **Скругления** | `rounded-2xl` для карточек, `rounded-full` для кнопок |
| **Тени** | `shadow-[0_8px_32px_rgba(0,212,255,0.15)]` (neon glow) |
| **Transition** | `transition-all duration-500 ease-out` |

---

## 7. План работ (по приоритету)

### Фаза 1 — Фундамент (что сделаем первым)
1. ✅ Удалить мёртвый код (`AttackAnimation.jsx` если не нужен; решить про `HomeHero3D.jsx`)
2. ✅ Установить зависимости: postprocessing, gsap, шрифты
3. ✅ Обновить `globals.css` — новая дизайн-система
4. ✅ Подключить **Groq** и **OpenRouter** в backend (бесплатные LLM)

### Фаза 2 — 3D Cinematic
5. ✅ Добавить postprocessing к `SmartHome3D` (bloom + chromatic aberration + vignette)
6. ✅ Создать 5 tactic-specific визуальных эффектов (по одному стартовому на агента)
7. ✅ Улучшить освещение, тени, environment

### Фаза 3 — Страницы
8. ✅ Переделать `/` — cinematic hero с 3D + scroll-driven sections
9. ✅ Обновить `/battle` — новая палитра, glassmorphism HUD
10. ✅ Обновить `/dashboard` — glass cards + heatmap
11. ✅ Обновить `/agents` — мини-3D превью каждого агента
12. ✅ Обновить `LLMSwitcher` под новые провайдеры

### Фаза 4 — Полировка
13. ✅ Расширить tactic-specific эффекты до всех 22 тактик
14. ✅ Multi-LLM mode (разные агенты — разные модели)
15. ✅ Финальная вёрстка `/documentation`

---

## 8. Что вы получите в итоге

- **Главная страница**, которая бьёт по глазам с первой секунды — кинематографичный 3D дом с летающими агентами и атаками.
- **Live battle arena** в стиле AAA-игры: 5 уникальных типов визуальных атак, каждая отражает конкретную LLM-уязвимость.
- **Бесплатно работающая демонстрация** — комиссия диплома сможет нажать "START BATTLE" и увидеть реальные атаки через **Groq Llama** или **Gemini** без необходимости платить.
- **Multi-LLM red teaming** — если включите бонусный режим, разные агенты атакуют через разные модели (научная новизна для диплома).

---

## Вопросы к тебе перед стартом

1. **HomeHero3D.jsx** — удалить или использовать на главной? (Я бы переиспользовал и расширил.)
2. **Страница `/attacks` (789 LOC)** — оставить как Attack Taxonomy или объединить с `/agents`?
3. **Multi-LLM mode** (разные агенты — разные модели) — делаем как основной режим или как опциональный bonus?
4. **Бесплатные LLM** — тебе ОК если я **сразу подключу Groq + OpenRouter** в код? (Тебе только нужно будет получить API-ключи на их сайтах — это 1 минута, регистрация бесплатная, без карты.)
5. **Языки** — оставляем EN/RU/KZ как сейчас (ты молодец что добавил казахский — для диплома в Казахстане это важно)?

После твоих ответов начну реализацию по фазам, коммитя по этапам, чтобы можно было откатиться в любой момент.
