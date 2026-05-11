import { motion } from 'framer-motion';
import { BookOpen, Library, Beaker, FileText, ChevronRight } from 'lucide-react';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

const THESIS_EN = [
  { num: '1', title: 'Introduction', items: ['Relevance of the research topic', 'Research goal and objectives', 'Object and subject of research', 'Research methods', 'Scientific novelty', 'Practical significance'] },
  { num: '2', title: 'Literature Review & Theoretical Foundations', items: ['2.1 Large Language Models: architecture and capabilities', '2.2 LLMs in IoT and Smart Home systems', '2.3 Red Teaming concept and methodology', '2.4 Security threats in Smart Home environments', '2.5 Existing frameworks for LLM security testing', 'Chapter conclusions'] },
  { num: '3', title: 'Framework Architecture & Methodology', items: ['3.1 Why Gemini was selected as the LLM under test', '3.2 Agent system design and adversarial roles', '3.3 IoT device simulator', '3.4 Policy Engine: rule definition and enforcement', '3.5 Risk scoring methodology and metrics justification', '3.6 Experimental procedure design', 'Chapter conclusions'] },
  { num: '4', title: 'Experimental Results', items: ['4.1 Attack scenarios and configurations', '4.2 LLM response analysis per attack category', '4.3 Risk score distributions and statistics', '4.4 Successful vs. unsuccessful attack breakdown', '4.5 Comparative analysis across LLM configurations', '4.6 Charts, tables, and visual summaries', 'Chapter conclusions'] },
  { num: '5', title: 'Conclusion', items: ['Summary of main findings', 'Assessment of goal achievement', 'Framework limitations', 'Directions for future research'] },
  { num: '6', title: 'References', items: ['Scientific articles on LLM security', 'IoT and Smart Home security standards', 'Red Teaming literature', 'LLM technical documentation', 'IoT protocol and architecture sources'] },
];

const THESIS_RU = [
  { num: '1', title: 'Введение', items: ['Актуальность темы исследования', 'Цель и задачи исследования', 'Объект и предмет исследования', 'Методы исследования', 'Научная новизна', 'Практическая значимость'] },
  { num: '2', title: 'Обзор литературы и теоретические основы', items: ['2.1 Большие языковые модели: архитектура и возможности', '2.2 LLM в системах IoT и умного дома', '2.3 Концепция и методология Red Teaming', '2.4 Угрозы безопасности в системах умного дома', '2.5 Существующие фреймворки тестирования безопасности LLM', 'Выводы по главе'] },
  { num: '3', title: 'Архитектура фреймворка и методология', items: ['3.1 Обоснование выбора Gemini в качестве тестируемой LLM', '3.2 Проектирование агентной системы и ролей', '3.3 Симулятор IoT-устройств', '3.4 Механизм политик: определение и исполнение правил', '3.5 Методология оценки рисков и обоснование метрик', '3.6 Дизайн эксперимента', 'Выводы по главе'] },
  { num: '4', title: 'Экспериментальные результаты', items: ['4.1 Сценарии атак и конфигурации', '4.2 Анализ ответов LLM по категориям атак', '4.3 Распределение оценок рисков и статистика', '4.4 Успешные и неуспешные атаки', '4.5 Сравнительный анализ конфигураций LLM', '4.6 Графики, таблицы и визуальные сводки', 'Выводы по главе'] },
  { num: '5', title: 'Заключение', items: ['Основные выводы', 'Оценка достигнутой цели', 'Ограничения фреймворка', 'Направления будущих исследований'] },
  { num: '6', title: 'Список литературы', items: ['Научные статьи по безопасности LLM', 'Стандарты безопасности IoT и умного дома', 'Литература по Red Teaming', 'Техническая документация LLM', 'Источники по протоколам и архитектуре IoT'] },
];

const THESIS_KZ = [
  { num: '1', title: 'Кіріспе', items: ['Зерттеу тақырыбының өзектілігі', 'Зерттеудің мақсаты мен міндеттері', 'Зерттеудің объектісі мен пәні', 'Зерттеу әдістері', 'Ғылыми жаңалық', 'Практикалық маңыздылығы'] },
  { num: '2', title: 'Әдебиет шолуы және теориялық негіздер', items: ['2.1 Үлкен тілдік модельдер: архитектура мен мүмкіндіктер', '2.2 IoT және ақылды үй жүйелеріндегі LLM', '2.3 Red Teaming тұжырымдамасы мен әдіснамасы', '2.4 Ақылды үй жүйелерінің қауіпсіздік қауіптері', '2.5 LLM қауіпсіздігін тексеруге арналған бар фреймворктер', 'Тарау бойынша тұжырымдар'] },
  { num: '3', title: 'Фреймворк архитектурасы мен әдіснамасы', items: ['3.1 Gemini таңдауын негіздеу', '3.2 Агент жүйесін жобалау', '3.3 IoT құрылғы симуляторы', '3.4 Саясат механизмі: ережелерді анықтау және орындау', '3.5 Тәуекел бағалау әдіснамасы мен көрсеткіштерін негіздеу', '3.6 Эксперимент жүргізу тәртібі', 'Тарау бойынша тұжырымдар'] },
  { num: '4', title: 'Эксперименттік нәтижелер', items: ['4.1 Шабуыл сценарийлері мен конфигурациялар', '4.2 Шабуыл санаттары бойынша LLM жауаптарын талдау', '4.3 Тәуекел ұпайларының үлестірімі мен статистикасы', '4.4 Сәтті және сәтсіз шабуылдар', '4.5 LLM конфигурацияларын салыстырмалы талдау', '4.6 Диаграммалар, кестелер және визуалды жиынтықтар', 'Тарау бойынша тұжырымдар'] },
  { num: '5', title: 'Қорытынды', items: ['Негізгі тұжырымдар', 'Мақсатқа жетуді бағалау', 'Фреймворктің шектеулері', 'Болашақ зерттеу бағыттары'] },
  { num: '6', title: 'Пайдаланылған әдебиеттер тізімі', items: ['LLM қауіпсіздігі бойынша ғылыми мақалалар', 'IoT және ақылды үй қауіпсіздігі стандарттары', 'Red Teaming бойынша әдебиет', 'LLM техникалық құжаттамасы', 'IoT протоколдары мен архитектурасы бойынша деректер'] },
];

const THESIS_MAP = { en: THESIS_EN, ru: THESIS_RU, kz: THESIS_KZ };

const METHODOLOGY = {
  en: [
    { q: 'Why Gemini?', a: 'Gemini provides multimodal reasoning capabilities and API access suitable for adversarial prompt testing. Its instruction-following behaviour and context window make it representative of modern LLMs deployed in IoT control scenarios.' },
    { q: 'Why a multi-agent approach?', a: 'Real-world red team exercises are conducted by groups with complementary roles. A multi-agent architecture reflects realistic attack coordination and enables studying emergent behaviours.' },
    { q: 'Risk Score metric justification', a: 'The risk score aggregates attack severity, device criticality, policy violation type, and response evasion rate into a single 0–100 value, enabling consistent, reproducible comparison.' },
    { q: 'Experimental procedure', a: 'Each attack scenario is run N times with fixed random seeds. Results are logged, aggregated, and compared across LLM temperature settings and policy configurations.' },
  ],
  ru: [
    { q: 'Почему Gemini?', a: 'Gemini обеспечивает мультимодальное рассуждение и API-доступ, подходящий для состязательного тестирования подсказок. Его поведение при выполнении инструкций и контекстное окно делают его репрезентативным для современных LLM, используемых в IoT.' },
    { q: 'Почему многоагентный подход?', a: 'Реальные операции красной команды проводятся группами с дополняющими ролями. Многоагентная архитектура отражает реалистичную координацию атак и позволяет изучать эмерджентное поведение.' },
    { q: 'Обоснование метрики Risk Score', a: 'Оценка риска объединяет серьёзность атаки, критичность устройства, тип нарушения политики и скорость уклонения от ответа в единое значение 0–100.' },
    { q: 'Процедура эксперимента', a: 'Каждый сценарий атаки выполняется N раз с фиксированными случайными семенами. Результаты логируются, агрегируются и сравниваются.' },
  ],
  kz: [
    { q: 'Неліктен Gemini?', a: 'Gemini жан-жақты пайымдау мүмкіндіктерін және IoT басқару сценарийлерінде қолданылатын заманауи LLM-ді бейнелейтін API қолжетімділікті қамтамасыз етеді.' },
    { q: 'Неліктен көп агентті тәсіл?', a: 'Нақты Red Team операциялары толықтырушы рөлдері бар топтармен жүргізіледі. Көп агентті архитектура шабуылдың нақты үйлестірілуін көрсетеді.' },
    { q: 'Тәуекел ұпайы көрсеткішін негіздеу', a: 'Тәуекел ұпайы шабуыл ауырлығын, құрылғы маңыздылығын, саясатты бұзу түрін және жауаптан жалтару жылдамдығын 0–100 бір мәнге біріктіреді.' },
    { q: 'Эксперимент жүргізу тәртібі', a: 'Әр шабуыл сценарийі бекітілген кездейсоқ тұқымдармен N рет орындалады. Нәтижелер тіркеледі, жинақталады және салыстырылады.' },
  ],
};

const REFERENCES = [
  'OWASP. (2023). OWASP Top 10 for Large Language Model Applications. OWASP Foundation.',
  'Perez, E., & Ribeiro, M. T. (2022). Ignore Previous Prompt: Attack Techniques For Language Models. arXiv:2211.09527.',
  'Greshake, K., et al. (2023). Not What You\u2019ve Signed Up For: Compromising Real-World LLM-Integrated Applications. arXiv:2302.12173.',
  'ETSI. (2020). ETSI EN 303 645 – Cyber Security for Consumer Internet of Things. ETSI.',
  'NIST. (2018). Framework for Improving Critical Infrastructure Cybersecurity, Version 1.1. NIST.',
  'Brown, T., et al. (2020). Language Models are Few-Shot Learners. NeurIPS 2020.',
  'Anthropic. (2022). Constitutional AI: Harmlessness from AI Feedback. arXiv:2212.08073.',
  'Bhatt, U., et al. (2023). Purple Llama CyberSecEval. arXiv:2312.04724.',
  'Deng, G., et al. (2023). Jailbreaker: Automated Jailbreak Across Multiple LLM Chatbots. arXiv:2307.08715.',
  'IoT Analytics. (2023). State of IoT 2023.',
  'Liu, Y., et al. (2023). Prompt Injection Attacks and Defenses in LLM-Integrated Applications. arXiv:2310.12815.',
  'Zou, A., et al. (2023). Universal and Transferable Adversarial Attacks on Aligned Language Models. arXiv:2307.15043.',
];

const LABELS = {
  en: { struct: 'Thesis Structure', methodology: 'Methodology & Justification', refs: 'References', chapter: 'Chapter' },
  ru: { struct: 'Структура дипломной работы', methodology: 'Методология и обоснование', refs: 'Список литературы', chapter: 'Глава' },
  kz: { struct: 'Диплом жұмысының құрылымы', methodology: 'Әдіснама және негіздеме', refs: 'Пайдаланылған әдебиеттер тізімі', chapter: 'Тарау' },
};

export default function DocumentationPage() {
  const { lang, t } = useLang();
  const thesis = THESIS_MAP[lang];
  const methodology = METHODOLOGY[lang];
  const labels = LABELS[lang];

  return (
    <div className="wv">
      <NavBar />

      <div className="wv-page">
        {/* Header */}
        <div className="wv-page-header">
          <div>
            <div className="wv-eyebrow" style={{ marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={11} /> documentation
            </div>
            <h1 className="wv-h1">{t.docs.title}</h1>
            <p className="wv-body" style={{ marginTop: 8, maxWidth: 760 }}>
              {t.docs.subtitle}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="wv-grid" style={{ marginBottom: 16 }}>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Chapters</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{thesis.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Methodology Q&amp;A</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{methodology.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">References</div>
              <div className="wv-kpi-value" style={{ marginTop: 12 }}>{REFERENCES.length}</div>
            </div>
          </div>
          <div className="wv-col-3">
            <div className="wv-card">
              <div className="wv-eyebrow">Languages</div>
              <div className="wv-kpi-value normal" style={{ marginTop: 12 }}>3</div>
            </div>
          </div>
        </div>

        {/* Thesis structure */}
        <div className="wv-card" style={{ marginBottom: 16 }}>
          <div className="wv-eyebrow" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText size={11} /> {labels.struct}
          </div>

          <div className="wv-grid">
            {thesis.map((chapter, ci) => (
              <motion.div
                key={chapter.num}
                className="wv-col-6"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.05 }}
              >
                <div style={{
                  padding: 16,
                  background: 'var(--wv-bg)',
                  border: '1px solid var(--wv-border)',
                  borderRadius: 12,
                  height: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span className="wv-mono" style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--wv-cyan-soft)',
                      color: 'var(--wv-cyan)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13,
                    }}>{chapter.num}</span>
                    <div>
                      <div className="wv-mono" style={{ fontSize: 10, color: 'var(--wv-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {labels.chapter} {chapter.num}
                      </div>
                      <div className="wv-h4">{chapter.title}</div>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {chapter.items.map((item, ii) => (
                      <li key={ii} className="wv-body" style={{
                        fontSize: 13,
                        paddingLeft: 12,
                        borderLeft: '2px solid var(--wv-border)',
                        display: 'flex', alignItems: 'flex-start', gap: 6,
                      }}>
                        <ChevronRight size={12} style={{ marginTop: 3, color: 'var(--wv-text-2)', flex: '0 0 12px' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="wv-card" style={{ marginBottom: 16 }}>
          <div className="wv-eyebrow" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Beaker size={11} /> {labels.methodology}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {methodology.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  padding: 16,
                  background: 'var(--wv-bg)',
                  border: '1px solid var(--wv-border)',
                  borderLeft: '3px solid var(--wv-cyan)',
                  borderRadius: 10,
                }}
              >
                <div className="wv-h4" style={{ marginBottom: 8 }}>{item.q}</div>
                <div className="wv-body" style={{ fontSize: 13, lineHeight: 1.7 }}>{item.a}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="wv-card">
          <div className="wv-eyebrow" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Library size={11} /> {labels.refs}
          </div>

          <ol style={{
            listStyle: 'decimal',
            paddingLeft: 32,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {REFERENCES.map((ref, idx) => (
              <li key={idx} className="wv-body" style={{ fontSize: 13, lineHeight: 1.7 }}>{ref}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
