# specification — sbe-devstand

## Назначение

Клиентский (без своего сервера) плагин-стенд для разработки SBE-плагинов вне
реестра. Даёт read-only доступ к боевым сервисам через центральный
`dev-gateway` и адрес/токен локального сервиса для отработки записи.

## Мост `window.SBE`

Публикует сервис `sbe-devstand` (тип `SbeDevstandApi` из `sbe-core/src/types.ts`)
в `onload`, снимает в `onunload`.

Поверхность:

| Метод | Что делает |
|---|---|
| `whoami()` | `{ email, role, services }` — кто подключён и что доступно |
| `getServices()` | `{ llm, kb, mailer }` — включённые на шлюзе сервисы |
| `llm.models()` | список моделей (`GET /api/dev/llm/models`) |
| `llm.complete(system, user, opts?)` | генерация (`POST /api/dev/llm/chat/completions`) |
| `kb.search(q)` | поиск (`GET /api/dev/kb/search?q=`) |
| `kb.note(id)` | заметка (`GET /api/dev/kb/notes/{id}`) |
| `kb.folders()` | папки (`GET /api/dev/kb/folders`) |
| `mailer.pull()` | письма с телом — `{ emails: [...] }` (`GET /api/dev/mailer/sync/pull`) |
| `local` | `{ url, token }` локального сервиса (из настроек) |

## Внешние вызовы

- Токен `dev`: `getService('sbe-apstore').auth.getToken('dev')`.
- Запросы: `requestUrl()` на `${apiUrl}/api/dev/*` с `Authorization: Bearer`.
- `apiUrl` по умолчанию `https://epyur.fvds.ru`.
- 401 → просьба войти в ЦУП; 403 → доступ не выдан администратором;
  404 → ручка не в белом списке.

## Настройки (`data.json`)

`apiUrl`, `integrations { llm, kb, mailer }`, `localUrl`, `localToken`.

## Зависимости

Только `obsidian` (dev). Сборка — esbuild, `styles.css` склеивается из
`sbe-core/src/design/tokens.css` + `components.css` + `src/styles.css`.
