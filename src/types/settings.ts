/** Настройки плагина «Стенд разработки». */
export interface SbeDevstandSettings {
  /** Базовый адрес стека (dev-gateway и ЦУП). */
  apiUrl: string;
  /** Включённые интеграции боевого контура (только чтение). */
  integrations: {
    llm: boolean;
    kb: boolean;
    mailer: boolean;
  };
  /** Локальный сервис разработчика — сюда идёт запись, пока плагин вне реестра. */
  localUrl: string;
  /** Токен локального auth-service для локального сервиса. */
  localToken: string;
}

export const DEFAULT_SETTINGS: SbeDevstandSettings = {
  apiUrl: 'https://epyur.fvds.ru',
  integrations: { llm: true, kb: true, mailer: true },
  localUrl: 'http://localhost:8080',
  localToken: '',
};
