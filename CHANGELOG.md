# Changelog

Все значимые изменения в этом проекте будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и этот проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

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
