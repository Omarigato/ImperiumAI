import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    lang: 'en',
    nav: {
      home: 'Home',
      simulation: 'Simulation',
      results: 'Results',
      documentation: 'Documentation',
    },
    home: {
      badge: 'AegisAI Research Framework',
      titleLine1: 'AI-Based Red Teaming Framework',
      titleLine2: 'for Smart Home & IoT LLMs',
      titleRu: 'Фреймворк красной команды на основе ИИ для LLM в умном доме и IoT',
      titleKz: 'Ақылды үй мен IoT жүйелеріндегі LLM үшін ЖИ негізіндегі Red Teaming фреймворкі',
      goal: 'Research Goal',
      goalText:
        'Development of an AI-Based Red Teaming Framework for automated security testing of Large Language Models integrated into Smart Home and IoT environments. The framework employs a multi-agent adversarial system, policy engine, and risk scoring to identify and analyse vulnerabilities.',
      description: 'Brief Description',
      descText:
        'AegisAI simulates coordinated adversarial attacks against LLMs controlling IoT devices, evaluates model responses through a Policy Engine, assigns quantitative risk scores, and logs all results for academic analysis.',
      structure: 'Thesis Structure',
      structureItems: [
        { num: '1', title: 'Introduction', sub: 'Relevance, goals, research methods, scientific novelty' },
        { num: '2', title: 'Literature Review', sub: 'LLMs in IoT · Red Teaming · Smart Home Security' },
        { num: '3', title: 'Framework Architecture', sub: 'Agent System · IoT Simulator · Policy Engine · Risk Scoring' },
        { num: '4', title: 'Experimental Results', sub: 'Attack scenarios · LLM configurations · Statistical analysis' },
        { num: '5', title: 'Conclusion', sub: 'Findings · Limitations · Future research directions' },
      ],
      startBtn: 'Start Simulation',
      dashboardBtn: 'View Results',
      logsBtn: 'Documentation',
    },
    docs: {
      title: 'Documentation',
      subtitle: 'AegisAI — Red Teaming Framework for LLMs in Smart Home & IoT',
    },
    theme: { dark: 'Dark', light: 'Light', bw: 'B/W' },
  },
  ru: {
    lang: 'ru',
    nav: {
      home: 'Главная',
      simulation: 'Симуляция',
      results: 'Результаты',
      documentation: 'Документация',
    },
    home: {
      badge: 'Исследовательский фреймворк AegisAI',
      titleLine1: 'Фреймворк красной команды на основе ИИ',
      titleLine2: 'для LLM в умном доме и IoT',
      titleRu: 'AI-Based Red Teaming Framework for Smart Home & IoT LLMs',
      titleKz: 'Ақылды үй мен IoT жүйелеріндегі LLM үшін ЖИ негізіндегі Red Teaming фреймворкі',
      goal: 'Цель исследования',
      goalText:
        'Разработка фреймворка красной команды на основе ИИ для автоматизированного тестирования безопасности больших языковых моделей, интегрированных в системы умного дома и IoT. Фреймворк использует многоагентную состязательную систему, механизм политик и оценку рисков для выявления уязвимостей.',
      description: 'Краткое описание',
      descText:
        'AegisAI моделирует скоординированные атаки против LLM, управляющих устройствами IoT, оценивает ответы моделей через механизм политик, присваивает количественные оценки рисков и фиксирует результаты для научного анализа.',
      structure: 'Структура работы',
      structureItems: [
        { num: '1', title: 'Введение', sub: 'Актуальность, цели, методы исследования, научная новизна' },
        { num: '2', title: 'Обзор литературы', sub: 'LLM в IoT · Красные команды · Безопасность умного дома' },
        { num: '3', title: 'Архитектура фреймворка', sub: 'Агентная система · IoT-симулятор · Механизм политик · Оценка рисков' },
        { num: '4', title: 'Экспериментальные результаты', sub: 'Сценарии атак · Конфигурации LLM · Статистический анализ' },
        { num: '5', title: 'Заключение', sub: 'Выводы · Ограничения · Направления будущих исследований' },
      ],
      startBtn: 'Запустить симуляцию',
      dashboardBtn: 'Просмотр результатов',
      logsBtn: 'Документация',
    },
    docs: {
      title: 'Документация',
      subtitle: 'AegisAI — фреймворк Red Teaming для LLM в умном доме и IoT',
    },
    theme: { dark: 'Тёмная', light: 'Светлая', bw: 'Ч/Б' },
  },
  kz: {
    lang: 'kz',
    nav: {
      home: 'Басты бет',
      simulation: 'Симуляция',
      results: 'Нәтижелер',
      documentation: 'Құжаттама',
    },
    home: {
      badge: 'AegisAI Зерттеу Фреймворкі',
      titleLine1: 'ЖИ негізіндегі Red Teaming фреймворкі',
      titleLine2: 'Ақылды үй мен IoT жүйелеріндегі LLM үшін',
      titleRu: 'Фреймворк красной команды на основе ИИ для LLM в умном доме и IoT',
      titleKz: 'AI-Based Red Teaming Framework for Smart Home & IoT LLMs',
      goal: 'Зерттеу мақсаты',
      goalText:
        'Ақылды үй мен IoT ортасына біріктірілген үлкен тілдік модельдердің қауіпсіздігін автоматтандырылған тексеруге арналған ЖИ негізіндегі Red Teaming фреймворкін әзірлеу. Фреймворк осалдықтарды анықтау үшін көп агентті жауынгер жүйесін, саясат механизмін және тәуекел бағалауын пайдаланады.',
      description: 'Қысқаша сипаттама',
      descText:
        'AegisAI IoT құрылғыларын басқаратын LLM-ге қарсы үйлестірілген шабуылдарды модельдейді, саясат механизмі арқылы модель жауаптарын бағалайды, сандық тәуекел ұпайларын береді және барлық нәтижелерді ғылыми талдау үшін тіркейді.',
      structure: 'Жұмыс құрылымы',
      structureItems: [
        { num: '1', title: 'Кіріспе', sub: 'Өзектілік, мақсаттар, зерттеу әдістері, ғылыми жаңалық' },
        { num: '2', title: 'Әдебиет шолуы', sub: 'IoT-тегі LLM · Red Teaming · Ақылды үй қауіпсіздігі' },
        { num: '3', title: 'Фреймворк архитектурасы', sub: 'Агент жүйесі · IoT симуляторы · Саясат механизмі · Тәуекел бағалауы' },
        { num: '4', title: 'Эксперименттік нәтижелер', sub: 'Шабуыл сценарийлері · LLM конфигурациялары · Статистикалық талдау' },
        { num: '5', title: 'Қорытынды', sub: 'Тұжырымдар · Шектеулер · Болашақ зерттеу бағыттары' },
      ],
      startBtn: 'Симуляцияны бастау',
      dashboardBtn: 'Нәтижелерді көру',
      logsBtn: 'Құжаттама',
    },
    docs: {
      title: 'Құжаттама',
      subtitle: 'AegisAI — Ақылды үй мен IoT-тегі LLM үшін Red Teaming фреймворкі',
    },
    theme: { dark: 'Күңгірт', light: 'Ашық', bw: 'Қ/А' },
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = translations[lang];
  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
