## Аудит и план развития `/Users/alexandrungurenko/Downloads/agent_vibes-main`

### Краткое summary
Проект уже реализует рабочий desktop GUI для Claude Code CLI (Electron + React + TS) с чатом, onboarding, историей сессий, скиллами и базовыми мерами безопасности IPC.  
Ключевые зоны роста: довести до продакшн-качества UX (убрать заглушки, добавить поиск), закрыть критичный security-пробел с внешними ссылками, улучшить наблюдаемость выполнения инструментов Claude и усилить продукт функционально (Git-context, diff approval, skills hub).

---

## ЭТАП 1: Разведка структуры

### Дерево проекта (основное)
```text
/Users/alexandrungurenko/Downloads/agent_vibes-main
├─ package.json
├─ electron.vite.config.ts
├─ tailwind.config.js
├─ src
│  ├─ main
│  │  ├─ index.ts
│  │  ├─ ipc-handlers.ts
│  │  ├─ claude-manager.ts
│  │  ├─ sessions-store.ts
│  │  ├─ settings-store.ts
│  │  └─ skills-scanner.ts
│  ├─ preload
│  │  └─ index.ts
│  └─ renderer
│     ├─ index.html
│     └─ src
│        ├─ App.tsx
│        ├─ components/**
│        ├─ hooks/**
│        ├─ lib/**
│        ├─ styles/globals.css
│        └─ types/**
├─ resources/icon.*
└─ out/** (сборка)
```

### Паспорт проекта
| Параметр | Значение |
|---|---|
| Языки | TypeScript, HTML, CSS |
| Фреймворки/библиотеки | Electron 33, React 18, electron-vite, Tailwind CSS, shadcn/ui (Radix), motion, react-markdown, Shiki, electron-updater |
| Архитектура | Desktop монолит с 3-слойной схемой Electron: `main` + `preload` + `renderer`, связь через IPC |
| Тип приложения | Desktop GUI для Claude Code CLI |
| Хранение данных | Локальные JSON-файлы в `~/.vibes-agent` |
| Транспорт/интеграция | Spawn CLI `claude` (NDJSON stream), GitHub Releases для auto-update |

**Итог этапа 1:** стек и архитектура зрелые для итеративного развития без переписывания.

---

## ЭТАП 2: Глубокий анализ кодовой базы

### Сущности/модели
| Сущность | Где |
|---|---|
| `ChatMessage`, `ToolUseInfo`, `ClaudeEvent`, `PlanStatus`, `SessionStatus` | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/types/claude.ts` |
| `AppSettings` (`appearance/chat/model`) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/types/settings.ts` |
| `SessionData`, `SessionMeta` | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/sessions-store.ts` |
| `SkillInfo` | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/skills-scanner.ts` |

### Реализованные “API-эндпоинты” (IPC)
`claude:*`, `dialog:*`, `sessions:*`, `settings:*`, `data:*`, `fs:*`, `skills:*`, `cli:*`  
Реализация: `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts`  
Bridge: `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/preload/index.ts`

### UI-страницы/экраны
| Экран | Файл |
|---|---|
| Главный чат (sidebar + chat + input + statusbar) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/App.tsx` |
| Welcome screen с подсказками | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/WelcomeScreen.tsx` |
| Onboarding (CLI setup, Auth, Project setup) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/onboarding/*` |
| Модалка настроек (Appearance/Chat/Model/Data) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/settings/*` |

### Бизнес-логика (фактически есть)
| Домен | Функциональность |
|---|---|
| Chat orchestration | Запуск Claude, потоковое чтение NDJSON, состояния `idle/thinking/executing/done/error`, стоп генерации |
| Plan mode | Генерация плана, approve/reject в UI, отдельная отправка на выполнение |
| Sessions | Создание/переключение/удаление/переименование, in-memory cache + disk persist, лимит 100 сессий |
| Skills | Скан локальных skills из `~/.claude/skills` и `~/.vibes-agent/skills`, активация через UI и slash |
| Attachments | Выбор изображений, paste из буфера, безопасный read через allowlist path |
| Onboarding | Проверка/установка CLI, проверка авторизации, выбор проекта |
| Updates | Auto-update через GitHub releases в production |

### Внешние интеграции
- Claude CLI (`spawn`, `which claude`, `claude --version`, `claude login`)  
- npm registry (`npm install -g @anthropic-ai/claude-code`)  
- GitHub Releases (`electron-updater`)  
- OS filesystem (`~/.vibes-agent`, temp dir, dialogs)

### Middleware / hooks / утилиты
- Hooks: `useClaude`, `useSessions`, `useSettings`, `useProject`, `useSkills`, `useOnboarding`, `useKeyboardShortcuts`  
- Утилиты: `cn`, `getHighlighter`  
- Middleware в web-смысле нет (не HTTP-приложение)

**Итог этапа 2:** функциональный MVP+ уже есть; ядро продукта работает, но есть заметные продуктовые и quality-пробелы.

---

## ЭТАП 3: Пробелы и слабые места

| Приоритет | Проблема | Доказательство |
|---|---|---|
| 🔴 критично | Небезопасное открытие внешних ссылок без allowlist протоколов | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/index.ts:34` |
| 🔴 критично | Тумблер темы фактически не применяется: `useTheme` не подключён в app root | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useTheme.ts:6`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/main.tsx:9` |
| 🔴 критично | Неполная модель tool lifecycle: `tool_result` не обрабатывается, статусы инструментов не закрываются поштучно | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useClaude.ts:105` |
| 🟡 важно | Несколько UI-заглушек без поведения (кнопки в header/sidebar/statusbar) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/App.tsx:221`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/Sidebar.tsx:208`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/StatusBar.tsx:44` |
| 🟡 важно | Нет проектных тестов (unit/integration/e2e) | в `src` отсутствуют `*.test.*`/`*.spec.*` |
| 🟡 важно | Восстановление последнего проекта ломается для директорий вне `$HOME/$TMPDIR` | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:199`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useProject.ts:14` |
| 🟡 важно | Синхронный FS в main-процессе (`readFileSync/writeFileSync`) масштабируется слабо при больших историях/файлах | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/sessions-store.ts`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/settings-store.ts`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:267` |
| 🟡 важно | Сохранение перед `beforeunload` не гарантировано (асинхронный IPC без подтверждения) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useClaude.ts:85` |
| 🟡 важно | Документация/чейнджлог частично расходится с текущим кодом | `/Users/alexandrungurenko/Downloads/agent_vibes-main/CHANGELOG.md` |
| 🟢 желательно | Смешение RU/EN строк интерфейса (`No threads`) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/Sidebar.tsx:259` |
| 🟢 желательно | Нет поиска по истории/тредам (хотя в UI есть задел под фильтр) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/Sidebar.tsx:212` |
| 🟢 желательно | Есть неиспользуемые элементы (`ThemeToggle`, `ProjectSelector`) | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/ThemeToggle.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/ProjectSelector.tsx` |

**Итог этапа 3:** главные риски — безопасность внешних ссылок, недоработанный инструментальный трекинг, неактивная тема и отсутствие тестов.

---

## ЭТАП 4: Генерация новых функций

### 🏗️ Категория A — быстрые победы (1–2 часа)

| 📌 Название | 📝 Описание | 🎯 Ценность | 🔧 Реализация | 📦 Зависимости | ⚡ Сложность | 🔗 Связь с текущим кодом |
|---|---|---|---|---|---|---|
| Безопасные внешние ссылки | Разрешать только `https/http/mailto`, для прочих схем показывать подтверждение | Снижает риск открытия вредоносных URI из AI-ответов | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/index.ts` | Нет | Низкая | Использует текущий `setWindowOpenHandler` |
| Реальное применение темы | Подключить `useTheme` на уровне root, синхронизировать class `dark` | Исправляет сломанную пользовательскую настройку | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/main.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useTheme.ts` | Нет | Низкая | Опирается на существующие settings |
| Поиск тредов в Sidebar | Добавить строку поиска + фильтрацию по title/project | Быстрый доступ к нужному чату | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/Sidebar.tsx` | Нет (или `fuse.js` опционально) | Низкая | Развивает уже имеющийся UI-фильтр |
| Оживить кнопки-заглушки | Кнопки `Обновить`, `Стандартные разрешения`, `Создать git-репозиторий` привязать к действиям/диалогам | Убирает “пустой” интерфейс, повышает доверие | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/App.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/Sidebar.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/StatusBar.tsx`, `main/preload/global types` | Нет | Низкая | Использует существующий IPC-каркас |

### 🚀 Категория B — сильные фичи (1–3 дня)

| 📌 Название | 📝 Описание | 🎯 Ценность | 🔧 Реализация | 📦 Зависимости | ⚡ Сложность | 🔗 Связь с текущим кодом |
|---|---|---|---|---|---|---|
| Timeline инструментов Claude | Показ lifecycle каждого tool call: running/done/error + tool_result + длительность | Прозрачность действий агента и проще дебаг | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useClaude.ts`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/ToolActivity.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/types/claude.ts` | Нет | Средняя | Расширяет текущий `currentTools` |
| Полнотекстовый поиск по истории | Поиск не только по названию треда, но и по содержимому сообщений | Сильно ускоряет работу с накопленной историей | `renderer sidebar/hooks`, `sessions-store`, `ipc-handlers`, `preload`, `global.d.ts` | `fuse.js` (рекомендуется) | Средняя | Использует существующее disk storage сессий |
| Git Context Panel | Визуальный блок: текущая ветка, изменённые файлы, быстрый “добавить контекст в промпт” | Повышает качество ответов по текущим изменениям | `main ipc + child_process git`, `preload`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/StatusBar.tsx`, `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/App.tsx` | Нет | Средняя | Логично продолжает статусбар и git-заглушки |

### 💎 Категория C — стратегические возможности (неделя+)

| 📌 Название | 📝 Описание | 🎯 Ценность | 🔧 Реализация | 📦 Зависимости | ⚡ Сложность | 🔗 Связь с текущим кодом |
|---|---|---|---|---|---|---|
| Diff Approval Workflow | Перед применением изменений показывать file/hunk preview и дать approve/reject granularly | Главный trust feature для безопасного “автокодинга” | Новые IPC для diff/patch, новые экраны review, расширение plan-mode потока | `diff`/`diff2html` (рекомендуется) | Высокая | Естественное развитие Plan Mode и ToolActivity |
| Skills Hub | Менеджер скиллов: установка, обновление, enable-профили по проектам | Ускоряет повторяемые сценарии и создаёт ecosystem эффект | `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/skills-scanner.ts`, новые IPC `skills:install/update/remove`, UI в settings | возможно `simple-git` или git CLI | Высокая | Базовый `skills:list` уже есть |
| Фоновые задачи и очередь | Долгие задачи в background с прогрессом, retry и уведомлениями | Повышает продуктивность на больших задачах | Новый task-runner модуль в main, очереди, UI “Runs”, нотификации | `p-queue` (рекомендуется) | Высокая | Продолжает текущую модель `claude:execute` |

**Итог этапа 4:** есть сбалансированный портфель фич: быстрые исправления доверия/UX, затем ощутимое усиление core-продукта, затем дифференцирующие функции.

---

## ЭТАП 5: Дорожная карта

### 1) Приоритетный порядок (все фичи)
1. A1 Безопасные внешние ссылки  
2. A2 Реальное применение темы  
3. A4 Оживить кнопки-заглушки  
4. A3 Поиск тредов в Sidebar  
5. B1 Timeline инструментов Claude  
6. B3 Git Context Panel  
7. B2 Полнотекстовый поиск по истории  
8. C1 Diff Approval Workflow  
9. C2 Skills Hub  
10. C3 Фоновые задачи и очередь

### 2) Логика порядка
- Сначала закрываем риски и “ломающие доверие” пробелы (security + неработающие базовые UX-части).  
- Потом улучшаем core loop “запрос → выполнение → прозрачный результат”.  
- Затем добавляем глубокие функции продуктивности и масштабирования.

### 3) Зависимости между фичами
- `A1` независима и должна идти первой.  
- `A2` независима, но нужна до UX-полировки.  
- `B1` является базой для `C1`.  
- `B3` желательно до `C1`, чтобы diff-review имел git-контекст.  
- `C2` слабо зависит от `B2` (можно параллелить), но лучше после стабилизации UI.  
- `C3` лучше после `B1`, чтобы переиспользовать event-модель прогресса.

### 4) Визуальная roadmap (текст)
```roadmap
Wave 1 (день 1):      [A1] -> [A2] -> [A4] -> [A3]
Wave 2 (дни 2-4):     [B1] -> [B3] -> [B2]
Wave 3 (неделя+):     [C1] -> [C2] -> [C3]
```

**Итог этапа 5:** реалистичный порядок с минимальным риском и максимальным продуктовым эффектом на каждом шаге.

---

## Предлагаемые изменения публичных интерфейсов (API/types)
- Новый IPC: `app:openExternalSafe(url)`, `app:checkForUpdates`, `app:getPermissionsInfo`.  
- Новый IPC: `git:status`, `git:diffSummary`, `git:initRepo`.  
- Новый IPC: `sessions:search(query, scope)`.  
- Новый IPC: `skills:install`, `skills:update`, `skills:remove` (для C2).  
- Расширение типов: `ToolUseInfo` (`startedAt`, `finishedAt`, `result`, `error`), новый `ToolResultEvent` mapping в `useClaude`.  
- Обновление `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/preload/index.ts` и `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/types/global.d.ts` под новые каналы.

---

## Тест-кейсы и сценарии приемки
1. Security: клик по `https://` открывается, `file://`/кастомные схемы блокируются или требуют подтверждения.  
2. Theme: переключение light/dark/system мгновенно меняет UI и переживает перезапуск.  
3. Sidebar search: поиск фильтрует треды по названию и проекту, не ломает группировку.  
4. Tool timeline: для сценария с `Read/Grep/Edit` отображаются статусы, результаты и ошибки по каждому tool.  
5. Git panel: корректно показывает branch + changed files; graceful fallback вне git-репо.  
6. Sessions search: находит по содержимому сообщений, открывает нужную сессию по клику.  
7. Diff approval: без approve изменения не применяются; reject оставляет чат консистентным.  
8. Background queue: параллельные задания не теряют прогресс после рестарта приложения.

---

## Явные допущения и выбранные дефолты
- Сохраняем текущий стек и архитектуру Electron (без backend-сервера).  
- Совместимость macOS-first остаётся приоритетом.  
- Хранилище остаётся локальным (`~/.vibes-agent`) на этапах A/B.  
- Claude CLI и формат `stream-json` считаются стабильным контрактом.  
- Критичные security/UX исправления выполняются до больших продуктовых инициатив.
