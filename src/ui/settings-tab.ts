import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import { errorMessage } from '../../../sbe-core/src/utils/errors';
import type SbeDevstandPlugin from '../main';

export class SbeDevstandSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: SbeDevstandPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Стенд разработки' });
    containerEl.createEl('p', {
      text:
        'Плагин вне реестра читает боевые LLM, Базу знаний и почту через центральный шлюз ' +
        '(только чтение) и отрабатывает запись на локальном сервисе. Доступ к стенду выдаёт ' +
        'администратор ролью в приложении «Стенд».',
      cls: 'tn-devstand-hint',
    });

    new Setting(containerEl)
      .setName('Адрес стека')
      .setDesc('Адрес dev-gateway и ЦУП. Обычно не меняется.')
      .addText(t => t
        .setPlaceholder('https://epyur.fvds.ru')
        .setValue(this.plugin.settings.apiUrl)
        .onChange(async v => {
          this.plugin.settings.apiUrl = v.trim();
          await this.plugin.saveSettings();
        }));

    // Профиль
    containerEl.createEl('h3', { text: 'Профиль' });
    const profile = containerEl.createDiv({ cls: 'tn-devstand-status' });
    profile.setText('Нажмите «Проверить», чтобы узнать свой доступ.');
    new Setting(containerEl).addButton(b => b
      .setButtonText('Проверить доступ')
      .onClick(async () => {
        profile.setText('Проверяем…');
        try {
          const me = await this.plugin.dev.whoami();
          profile.setText(`Вы вошли как ${me.email}. Роль в стенде: ${me.role || 'нет'}.`);
        } catch (e) {
          profile.setText(errorMessage(e));
        }
      }));

    // Интеграции
    containerEl.createEl('h3', { text: 'Интеграции (только чтение)' });
    for (const key of ['llm', 'kb', 'mailer'] as const) {
      new Setting(containerEl)
        .setName({ llm: 'LLM', kb: 'База знаний', mailer: 'Почта' }[key])
        .addToggle(t => t
          .setValue(this.plugin.settings.integrations[key])
          .onChange(async v => {
            this.plugin.settings.integrations[key] = v;
            await this.plugin.saveSettings();
          }));
    }
    new Setting(containerEl)
      .addButton(b => b
        .setButtonText('Проверить LLM')
        .onClick(async () => {
          try {
            const models = await this.plugin.dev.llm.models();
            new Notice(`LLM: доступных моделей — ${models.length}.`);
          } catch (e) {
            new Notice(errorMessage(e));
          }
        }))
      .addButton(b => b
        .setButtonText('Проверить Базу знаний')
        .onClick(async () => {
          try {
            await this.plugin.dev.kb.folders();
            new Notice('База знаний: доступна.');
          } catch (e) {
            new Notice(errorMessage(e));
          }
        }))
      .addButton(b => b
        .setButtonText('Проверить почту')
        .onClick(async () => {
          try {
            const data = await this.plugin.dev.mailer.pull();
            new Notice(`Почта: доступна, писем — ${data.emails.length}.`);
          } catch (e) {
            new Notice(errorMessage(e));
          }
        }));

    // Локальный стенд
    containerEl.createEl('h3', { text: 'Локальный стенд (запись)' });
    containerEl.createEl('p', {
      text:
        'Пока плагин вне реестра, данные пишутся в локальный сервис (комплект dev_stand). ' +
        'Укажите его адрес и токен, полученный скриптом bootstrap-local-token.',
      cls: 'tn-devstand-hint',
    });
    new Setting(containerEl)
      .setName('Адрес локального сервиса')
      .addText(t => t
        .setPlaceholder('http://localhost:8080')
        .setValue(this.plugin.settings.localUrl)
        .onChange(async v => {
          this.plugin.settings.localUrl = v.trim();
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('Токен локального сервиса')
      .addText(t => {
        t.inputEl.type = 'password';
        t.setValue(this.plugin.settings.localToken)
          .onChange(async v => {
            this.plugin.settings.localToken = v.trim();
            await this.plugin.saveSettings();
          });
      });

    // Справка
    containerEl.createEl('h3', { text: 'Справка' });
    containerEl.createEl('p', {
      text:
        'В своём плагине получите сервис так: const dev = await getService(\'sbe-devstand\'); ' +
        'затем dev.llm.complete(...), dev.kb.search(...), dev.mailer.pull(). Адрес и токен ' +
        'локального сервиса — в dev.local. Подробнее — в руководстве docs/sbe-devstand-guide.md.',
      cls: 'tn-devstand-help',
    });
  }
}
