# bug_codex

## Summary
- Обнаружено 7 потенциальных багов: `P1 = 3`, `P2 = 2`, `P3 = 2`.
- Критичные риски: проверка путей (security), гонка состояния при переключении сессий, нестабильный onboarding login flow.
- Отчёт ниже фиксирует приоритет, локации, риск, сценарии воспроизведения и идеи исправления.

## Findings

### P1-01: Path prefix bypass через `startsWith`
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:24`
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:163`
- Risk:
  - Проверка `resolved.startsWith(baseDir)` допускает ложноположительный матч для путей с тем же префиксом (например, `/Users/alex` и `/Users/alex-other`), что может ослаблять файловые ограничения.

### P1-02: Race condition при `switchSession`
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/hooks/useClaude.ts:313`
- Risk:
  - Асинхронная загрузка старой сессии может завершиться позже и перезаписать состояние уже выбранной новой сессии (перепрыгивание сообщений/статуса).

### P1-03: Риск нерабочей авторизации onboarding (`spawn('claude', [])`)
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:330`
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/onboarding/Step2Auth.tsx:35`
- Risk:
  - Логин-поток может зависать/таймаутиться без корректного интерактивного режима, если CLI ожидает другой сценарий запуска.

### P2-01: Необработанная ошибка при paste неподдерживаемого image MIME
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/InputArea.tsx:199`
- Risk:
  - `window.fs.saveClipboardImage(...)` может отклонить промис (например, для `image/svg+xml`), а в `handlePaste` нет `try/catch`; возможен unhandled rejection и деградация UX.

### P2-02: Рост `allowedImagePaths` без очистки
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:15`
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/ipc-handlers.ts:183`
- Risk:
  - Накопление путей со временем увеличивает память и сохраняет лишние разрешения на чтение файлов, которые уже не нужны.

### P3-01: Несоответствие `appId` и `setAppUserModelId`
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/package.json:16`
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/main/index.ts:55`
- Risk:
  - Разные идентификаторы (`com.vibes.agent` vs `com.vibes-agent`) могут приводить к непредсказуемому платформенному поведению (часть OS-интеграций/обновлений/ярлыков).

### P3-02: Потенциальный UI-jank из-за `setTimeout` без cleanup
- Location:
  - `/Users/alexandrungurenko/Downloads/agent_vibes-main/src/renderer/src/components/ChatWindow.tsx:73`
- Risk:
  - При частом потоке сообщений накапливаются запланированные таймеры автоскролла, что может вызывать подёргивания и лишнюю работу main thread.

## Repro
1. Проверить path-bypass сценарии с путями вида `<home-prefix>-other/...` и убедиться, что они не проходят в `fs:pathExists`/`fs:getImageDataUrl`.
2. Быстро переключать сессии `A↔B` и проверить, не “перепрыгивает” ли контент на неактуальную сессию.
3. Пройти onboarding auth и убедиться, что логин стабильно завершается без таймаута.
4. Вставить в поле ввода изображение с неподдерживаемым MIME (например, `image/svg+xml`) и проверить отсутствие unhandled rejection.
5. Многократно выбирать изображения и проверить, ограничивается ли `allowedImagePaths`.
6. Проверить единообразие `app id` в рантайме и упаковке.
7. Дать длинный поток сообщений и проверить, что автоскролл не создаёт накопление таймеров/дёргания.

## Fix idea
1. Для path-check заменить `startsWith` на безопасную проверку принадлежности директории (`path.relative`, нормализация, проверка границ сегментов).
2. В `switchSession` добавить request token/version guard и применять результат только если token актуален.
3. Для onboarding login использовать официальный интерактивный auth flow CLI (с корректным режимом запуска/PTY) и явно обрабатывать сценарии таймаута/отмены.
4. Обернуть paste flow в `try/catch`, показывать пользователю понятную ошибку и не допускать unhandled promise rejection.
5. Для `allowedImagePaths` ввести cleanup (TTL, prune после отправки, очистка при закрытии/смене сессии).
6. Унифицировать идентификатор приложения в одном значении и переиспользовать его в `package.json` и main process.
7. В `ChatWindow` хранить id таймера и очищать его в cleanup эффекта; альтернативно перейти на `requestAnimationFrame`.
