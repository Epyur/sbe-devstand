# AGENTS.md — sbe-devstand (Стенд разработки)

Клиентский плагин-стенд для разработки SBE-плагинов **вне реестра**. Без своего
сервера: публикует `sbe-devstand` в мост `window.SBE` и раздаёт другим плагинам
read-only доступ к боевым LLM/Базе знаний/почте через центральный `dev-gateway`,
плюс адрес и токен локального сервиса для отработки записи.

Дизайн — `docs/superpowers/specs/2026-10-02-sbe-devstand-design.md`, план —
`docs/superpowers/plans/2026-10-02-sbe-devstand-plan.md`. Плагин **в реестр ЦУП
не входит** и ставится вручную; в `sbe-apstore` для него добавлен лишь `dev` в
белый список выдачи токенов.

## Статус

**v0.1.0 (2026-10-02) — создан.** Каркас: мост-сервис `SbeDevstandApi`,
клиент `dev-gateway`, раздел настроек (профиль, интеграции, локальный стенд,
справка). Локальный комплект `sbe-devstand-kit` — отдельный репозиторий.
`npx tsc --noEmit` EXIT=0, `npm run build` OK. Реальное подключение к
боевому шлюзу проверяется после его деплоя.

## Структура

- `src/main.ts` — `SbeDevstandPlugin`: `publishService`/`unpublishService`,
  настройки.
- `src/services/dev-client.ts` — `DevClient` (реализует `SbeDevstandApi`):
  `getToken('dev')` через `sbe-apstore`, `requestUrl` на `/api/dev/*`,
  обработка 401/403/404, фильтрация выключенных интеграций.
- `src/ui/settings-tab.ts` — разделы: Профиль (`whoami`), Интеграции (LLM/KB/
  почта — вкл/выкл + проверка), Локальный стенд (адрес, токен), Справка.
- `src/types/settings.ts` — `SbeDevstandSettings`.
- `src/styles.css` — `tn-devstand-*`.

## Ключевые решения

- Только свободные зависимости; импорты sbe-core относительные
  (`../../sbe-core/src/...` из `src/`, `../../../sbe-core/src/...` из
  `src/services|ui/`).
- `local` — только адрес и токен из настроек; писать должен сам плагин
  разработчика в свой локальный сервис.
- Новость в ЦУП (`announceUpdate`) сознательно не подключена: плагин вне
  реестра, в `dev`-приложении новости не публикуются.

## Правила

- `catch(e: unknown)` + `errorMessage()`; `requestUrl()`; без `any`; классы
  `tn-*`; UI на русском; автор — Полищук Евгений (polishchuk@tn.ru).
- Коммиты/пуши — по явной команде.
