import { requestUrl, RequestUrlResponse } from 'obsidian';
import { getService } from '../../../sbe-core/src/bridge';
import type {
  DevstandLocal,
  DevstandWhoami,
  SbeDevstandApi,
  SbeLlmModel,
} from '../../../sbe-core/src/types';
import type { SbeDevstandSettings } from '../types/settings';

/**
 * Клиент центрального dev-gateway. Токен `dev` берётся у ЦУП (как любой
 * SBE-плагин), запросы идут на `/api/dev/*`. Шлюз сам выписывает токены
 * целевых сервисов на email разработчика — наружу они не отдаются.
 */
export class DevClient implements SbeDevstandApi {
  constructor(private readonly getSettings: () => SbeDevstandSettings) {}

  get local(): DevstandLocal {
    const s = this.getSettings();
    return { url: s.localUrl, token: s.localToken };
  }

  private async token(): Promise<string> {
    const apstore = await getService('sbe-apstore');
    return apstore.auth.getToken('dev');
  }

  /** Единая расшифровка статусов шлюза/целевого сервиса в понятные сообщения. */
  private ensureOk(res: RequestUrlResponse): void {
    if (res.status === 401) {
      throw new Error('Стенд: нет доступа. Войдите в ЦУП (получите и активируйте ключ).');
    }
    if (res.status === 403) {
      throw new Error('Стенд: доступ не выдан. Попросите администратора выдать роль в приложении «Стенд».');
    }
    if (res.status === 404) {
      throw new Error('Стенд: этот вызов недоступен (ручка не входит в белый список).');
    }
    if (res.status >= 400) {
      throw new Error(`Стенд: ошибка ${res.status}.`);
    }
  }

  private async call(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<unknown> {
    const s = this.getSettings();
    let url = s.apiUrl.replace(/\/+$/, '') + path;
    if (query) {
      const params = new URLSearchParams(query).toString();
      if (params) url += `?${params}`;
    }
    const res = await requestUrl({
      url,
      method,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      throw: false,
    });
    this.ensureOk(res);
    // Не-JSON ответ (например, шаблон письма — DOCX) парсить как JSON нельзя:
    // иначе Obsidian бросает ошибку разбора и подставляет в неё куски бинарника.
    const contentType = String(res.headers['content-type'] ?? '');
    if (contentType && !/json/i.test(contentType)) {
      throw new Error(`Стенд: сервис вернул не JSON (${contentType.split(';')[0].trim()}).`);
    }
    const data: unknown = res.json;
    return data;
  }

  private requireIntegration(key: keyof SbeDevstandSettings['integrations']): void {
    if (!this.getSettings().integrations[key]) {
      throw new Error(`Стенд: интеграция «${key}» выключена в настройках плагина.`);
    }
  }

  async whoami(): Promise<DevstandWhoami> {
    return (await this.call('GET', '/api/dev/whoami')) as DevstandWhoami;
  }

  async getServices(): Promise<Record<string, boolean>> {
    const data = (await this.call('GET', '/api/dev/services')) as { services?: Record<string, boolean> };
    return data.services ?? {};
  }

  readonly llm = {
    models: async (): Promise<SbeLlmModel[]> => {
      this.requireIntegration('llm');
      // LLM-центр отдаёт провайдерский ответ в форме `{ data: [...] }` (как у
      // OpenAI), а не голый массив.
      const data = (await this.call('GET', '/api/dev/llm/models')) as { data?: SbeLlmModel[] };
      return Array.isArray(data.data) ? data.data : [];
    },
    complete: async (
      system: string,
      user: string,
      opts?: { model?: string; temperature?: number },
    ): Promise<string> => {
      this.requireIntegration('llm');
      // Модель: явная в вызове → выбранная в настройках → пусто (решит сервер).
      const model = opts?.model ?? (this.getSettings().llmModel || undefined);
      const body: Record<string, unknown> = {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      };
      if (model) body.model = model;
      if (opts?.temperature !== undefined) body.temperature = opts.temperature;
      const data = (await this.call('POST', '/api/dev/llm/chat/completions', body)) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content ?? '';
    },
  };

  readonly kb = {
    search: async (query: string): Promise<unknown> => {
      this.requireIntegration('kb');
      return await this.call('GET', '/api/dev/kb/search', undefined, { q: query });
    },
    note: async (id: string): Promise<unknown> => {
      this.requireIntegration('kb');
      return await this.call('GET', `/api/dev/kb/notes/${encodeURIComponent(id)}`);
    },
    folders: async (): Promise<unknown> => {
      this.requireIntegration('kb');
      return await this.call('GET', '/api/dev/kb/folders');
    },
  };

  readonly mailer = {
    /** Письма с телом: `{ emails: [...] }` (форма серверного Email). */
    pull: async (): Promise<{ emails: unknown[] }> => {
      this.requireIntegration('mailer');
      return (await this.call('GET', '/api/dev/mailer/sync/pull')) as { emails: unknown[] };
    },
  };
}
