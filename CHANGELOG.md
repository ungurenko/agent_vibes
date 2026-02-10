# Changelog

Все значимые изменения в этом проекте будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

## 2026-02-10 — Аудит безопасности и исправление уязвимостей

### Исправлено
- Закрыта уязвимость path traversal в `fs:getImageDataUrl` — чтение файлов ограничено temp-директорией и путями из нативного диалога
- Закрыта уязвимость path traversal в session ID — добавлена regex-валидация `/^[a-zA-Z0-9_-]+$/` во всех функциях sessions-store
- Закрыта уязвимость перечисления файловой системы через `fs:pathExists` — допустимы только пути в `$HOME` и `$TMPDIR`
- Устранена race condition в `ClaudeManager.execute()` — добавлен promise-based execution lock
- Устранена утечка ресурсов: readline interface теперь закрывается в `stop()`
- Исправлен баг с перезаписью callback'ов при множественных вызовах execute() — callback'и захватываются в момент вызова
- Исправлено несоответствие типов `selectImages` между preload и global.d.ts

### Добавлено
- Добавлен Content Security Policy (CSP) meta-тег в `index.html`
- Добавлен `ErrorBoundary` компонент — предотвращает белый экран при ошибках рендера
- Добавлена санитизация HTML от Shiki через DOMPurify (`dangerouslySetInnerHTML`)
- Добавлена валидация расширений файлов в `fs:saveClipboardImage` (allowlist: jpg, png, gif, webp, bmp)
- Добавлен таймаут 5 сек для `execSync` вызовов в `cli:checkInstalled` и `resolveClaudePath`
- Добавлено логирование ошибок вместо silent catch в 7 местах (sessions-store, settings-store, ipc-handlers)

### Изменено
- Включён OS-level sandbox для renderer (`sandbox: true`)
- Убран `shell: true` из spawn-вызовов npm install и claude login
- Фильтрация `process.env` для дочерних процессов — передаются только необходимые переменные (PATH, HOME, SHELL и др.)
- Убран unsafe fallback в preload (прямое присвоение `window.*` при отключённом contextIsolation) — заменён на throw
- URL GitHub Releases вынесен из хардкода в константу с поддержкой env var

## 2026-02-10 — Режим плана (Plan Mode)

### Добавлено
- Реализован Plan Mode — режим, в котором Claude сначала составляет план, а выполняет только после одобрения
- Добавлен тип `PlanStatus` и поля `isPlan`/`planStatus` в `ChatMessage`
- Добавлена кнопка-тоггл Plan Mode в InputArea с amber-подсветкой при активации
- Добавлен amber badge «Режим плана» над полем ввода при включённом режиме
- Добавлены кнопки «Одобрить и выполнить» и «Отклонить» под сообщениями-планами
- Добавлены визуальные состояния планов: badge pending/approved/rejected, зелёная граница для одобрённых, пониженная прозрачность для отклонённых
- Добавлены функции `approvePlan` и `rejectPlan` в хук `useClaude`
- Реализована автоматическая отправка system prompt с инструкцией plan mode в CLI

### Изменено
- Расширен `sendMessage` в `useClaude` — поддержка 6-го аргумента `isPlanMode`
- Обновлён `ChatWindow` — проброс обработчиков планов в `MessageBubble`
- Обновлён `App.tsx` — состояние `planModeEnabled`, обработчики одобрения/отклонения, сброс при новом чате
- Изменён placeholder поля ввода при активном Plan Mode

## 2026-02-10 — Onboarding wizard и исправление авторизации

### Добавлено
- Реализован пошаговый onboarding wizard (Step1CLI, Step2Auth, Step3Project, Step4Complete)
- Добавлены IPC-каналы для проверки CLI (`cli:checkInstalled`), авторизации (`cli:checkAuth`), установки (`cli:install`) и входа (`cli:login`)
- Добавлен preload bridge для onboarding (`window.cli`, `window.onboarding`)
- Добавлен хук `useOnboarding` для управления состоянием wizard

### Исправлено
- Исправлена проверка авторизации: убран несуществующий `claude auth status`, заменён на чтение `~/.claude.json` с проверкой ключа `oauthAccount`
- Исправлен fallback: убраны проверки несуществующих ключей (`oauthToken`, `apiKey`, `sessionKey`)
- Исправлена команда входа: убран несуществующий `claude login`, заменён на `claude` без аргументов
- Исправлена fallback-инструкция в UI: `claude login` → `claude`

### Изменено
- Переработан `App.tsx` для интеграции onboarding wizard перед основным интерфейсом
- Обновлён `ChatWindow.tsx` для поддержки состояния onboarding
- Обновлён `WelcomeScreen.tsx` для интеграции с новым flow

### Удалено
- Удалён устаревший компонент `OnboardingWelcome.tsx`

## [1.0.0] - 2026-02-10

### Added
- Чат-интерфейс для общения с Claude Code CLI
- Поддержка тёмной темы с переключателем
- Frosted glass дизайн с анимациями
- Выбор рабочего проекта через нативный диалог
- Выбор модели Claude (Sonnet 4.5, Opus 4.6, Haiku 4.5)
- Визуализация активности инструментов
- Отображение стоимости запросов
- История сессий с группировкой по датам
- Поиск по сессиям
- Подсветка синтаксиса кода (Shiki)
- macOS нативный window style
- Сворачиваемый sidebar (52px/260px)

[Unreleased]: https://github.com/ungurenko/Claude_visial_agent/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ungurenko/Claude_visial_agent/releases/tag/v1.0.0
