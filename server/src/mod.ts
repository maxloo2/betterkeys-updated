import https from 'https';
import { DependencyContainer } from 'tsyringe';

import { ItemHelper } from '@spt-aki/helpers/ItemHelper';
import { PreAkiModLoader } from '@spt-aki/loaders/PreAkiModLoader';
import { BaseClasses } from '@spt-aki/models/enums/BaseClasses';
import { IPostAkiLoadMod } from '@spt-aki/models/external/IPostAkiLoadMod';
import { IPostDBLoadMod } from '@spt-aki/models/external/IPostDBLoadMod';
import { IPreAkiLoadMod } from '@spt-aki/models/external/IPreAkiLoadMod';
import { LogTextColor } from '@spt-aki/models/spt/logging/LogTextColor';
import { IDatabaseTables } from '@spt-aki/models/spt/server/IDatabaseTables';
import { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { DynamicRouterModService } from '@spt-aki/services/mod/dynamicRouter/DynamicRouterModService';
import { JsonUtil } from '@spt-aki/utils/JsonUtil';
import { VFS } from '@spt-aki/utils/VFS';

import _package from '../package.json';

class BetterKeys implements IPostDBLoadMod, IPreAkiLoadMod, IPostAkiLoadMod {
  private config = require('../config/config.json');
  private modPath = 'user/mods/maxloo2-betterkeys-updated';
  private router: DynamicRouterModService;
  private vfs: VFS;
  private modLoader: PreAkiModLoader;
  private jsonUtil: JsonUtil;
  private path = require('path');
  private logger: ILogger;
  private mod;
  private _constants;
  private dbVersions;
  private localeVersions;
  private itemHelper: ItemHelper;

  public preAkiLoad(container: DependencyContainer): void {
    this.logger = container.resolve<ILogger>('WinstonLogger');
    this.jsonUtil = container.resolve<JsonUtil>('JsonUtil');
    this.router = container.resolve<DynamicRouterModService>(
      'DynamicRouterModService'
    );
    this.itemHelper = container.resolve<ItemHelper>('ItemHelper');
    this.mod = require('../package.json');
    this.hookRoutes();
  }

  public postAkiLoad(container: DependencyContainer): void {
    this.modLoader = container.resolve<PreAkiModLoader>('PreAkiModLoader');
  }

  public postDBLoad(container: DependencyContainer): void {
    const database = container
      .resolve<DatabaseServer>('DatabaseServer')
      .getTables();
    this.vfs = container.resolve<VFS>('VFS');
    this._constants = this.jsonUtil.deserialize(
      this.vfs.readFile(`${this.modPath}/db/_constants.json`)
    );
    this.dbVersions = this.jsonUtil.deserialize(
      this.vfs.readFile(`${this.modPath}/db/_versions.json`)
    );
    this.localeVersions = this.jsonUtil.deserialize(
      this.vfs.readFile(`${this.modPath}/locale/_versions.json`)
    );

    if (this.config.enableAutoUpdate) {
      this.update(
        this.localeVersions,
        'locale',
        Object.keys(this.localeVersions),
        database,
        false
      );

      this.update(
        this.dbVersions,
        'db',
        Object.keys(this.dbVersions),
        database,
        true
      );
    } else {
      this.loadDatabase(database);
    }
  }

  public loadDatabase(database: IDatabaseTables): void {
    const ItemHelper = this.itemHelper;
    const config = this.config;
    const mapIds: Record<string, any> = this._constants.maps;

    const keysWithInfo: string[] = [];

    mapIds.forEach(({ name: mapName, id: mapId }) => {
      const keyInfoFile: Record<string, any> = this.jsonUtil.deserialize(
        this.vfs.readFile(`${this.modPath}/db/${mapName}.json`)
      );

      for (const keyId in keyInfoFile.Keys) {
        if (config.backgroundColor) {
          if (
            config.yellowMarkedKeys &&
            this._constants.markedKeys.includes(keyId)
          ) {
            database.templates.items[keyId]._props.BackgroundColor = 'yellow';
          } else {
            const color =
              config.backgroundColors[
                database.locales.global['en'][`${mapId} Name`]
              ];

            database.templates.items[keyId]._props.BackgroundColor = color;
          }
        }

        if (config.descriptionInfo) {
          for (const lang in database.locales.global) {
            const description =
              database.locales.global[lang][`${keyId} Description`];

            let locale: Record<string, any> = this.jsonUtil.deserialize(
              this.vfs.readFile(`${this.modPath}/locale/en.json`)
            );

            if (this.vfs.exists(`${this.modPath}/locale/${lang}.json`)) {
              locale = this.jsonUtil.deserialize(
                this.vfs.readFile(`${this.modPath}/locale/${lang}.json`)
              );
            }

            const dbLocale: Record<string, string> =
              database.locales.global[lang];

            const keyInfo =
              `${locale.mapString}: ${dbLocale[`${mapId} Name`]}.` +
              `${BetterKeys.getRequiredForExtracts(config, keyId, keyInfoFile, locale)}` +
              `${BetterKeys.getRequiredInQuests(config, keyId, keyInfoFile, locale, dbLocale)}` +
              `${BetterKeys.getBehindTheLock(config, keyId, keyInfoFile, locale)}`;

            database.locales.global[lang][`${keyId} Description`] =
              keyInfo + '\n\n' + description;
          }
        }

        keysWithInfo.push(keyId);
      }

      this.logger.info(
        `[${_package.name}] Loaded: ${database.locales.global.en[`${mapId} Name`]}`
      );
    });

    const keysWithoutInfo = Object.entries(database.templates.items).filter(
      (item) => {
        const id = item[0];

        return (
          ItemHelper.isOfBaseclasses(id, [
            BaseClasses.KEY,
            BaseClasses.KEY_MECHANICAL,
            BaseClasses.KEYCARD,
          ]) && !keysWithInfo.includes(id)
        );
      }
    );

    keysWithoutInfo.forEach((key) => {
      const keyId = key[0];

      for (const stringId in database.locales.global) {
        if (config.backgroundColor) {
          database.templates.items[keyId]._props.BackgroundColor = 'black';
        }

        if (config.descriptionInfo) {
          const description =
            database.locales.global[stringId][`${keyId} Description`];

          database.locales.global[stringId][`${keyId} Description`] =
            `Junk: this key/ keycard is not used anywhere.` +
            '\n\n' +
            description;
        }
      }
    });

    this.logger.logWithColor(
      `[${_package.name}-${_package.version}] Added info and background colors to all keys/ keycards`,
      LogTextColor.GREEN
    );
  }

  private update(
    versions,
    folder: string,
    array: string[],
    database: IDatabaseTables,
    updateDatabasePostLoad: boolean
  ) {
    https
      .get(`${this.config.github}/server/${folder}/_versions.json`, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            let b = false;
            const json = JSON.parse(body);
            for (const i in array) {
              if (json[array[i]] > versions[array[i]]) {
                this.updateFile(folder, array[i]);
                versions[array[i]] = json[array[i]];
                if (!b) b = true;
              }
            }

            if (b) {
              this.vfs.removeFile(`${this.modPath}/${folder}/_versions.json`);
              this.vfs.writeFile(
                `${this.modPath}/${folder}/_versions.json`,
                body
              );
              this.logger.logWithColor(
                `[${_package.name}][${folder}] Update finished`,
                LogTextColor.GREEN
              );
              if (updateDatabasePostLoad) this.loadDatabase(database);
            } else {
              this.logger.logWithColor(
                `[${_package.name}][${folder}] No Updates`,
                LogTextColor.GREEN
              );
              if (updateDatabasePostLoad) this.loadDatabase(database);
            }
          } catch (error) {
            this.logger.error(error.message);
          }
        });
      })
      .on('error', (error) => {
        this.logger.error(error.message);
      });
  }

  private updateFile(folder: string, file: string): void {
    if (this.vfs.exists(`${this.modPath}/${folder}/${file}.json`)) {
      https
        .get(`${this.config.github}/server/${folder}/${file}.json`, (res) => {
          let body = '';

          res.on('data', (chunk) => {
            body += chunk;
          });

          res.on('end', () => {
            try {
              this.vfs.removeFile(`${this.modPath}/${folder}/${file}.json`);
              this.vfs.writeFile(
                `${this.modPath}/${folder}/${file}.json`,
                body
              );
              this.logger.info(`[${_package.name}] Updated: ${file}`);
            } catch (error) {
              this.logger.error(error.message);
            }
          });
        })
        .on('error', (error) => {
          this.logger.error(error.message);
        });
    }
  }

  private hookRoutes(): void {
    this.router.registerDynamicRouter(
      'betterkeys-updated',
      [
        {
          url: '/betterkeys-updated/GetInfo',
          action: (url, info, sessionId, output) => {
            return this.getModInfo(url, info, sessionId, output);
          },
        },
      ],
      'betterkeys-updated'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getModInfo(
    url: string,
    info: any,
    sessionId: string,
    output: string
  ): string {
    const modOutput = {
      status: 1,
      data: null,
    };

    modOutput.data = {
      ..._package,
      ...{ path: this.path.resolve(this.modLoader.getModPath('BetterKeys')) },
    };
    modOutput.status = 0;

    return this.jsonUtil.serialize(modOutput);
  }

  static getRequiredForExtracts(
    config,
    keyId: string,
    keyInfoFile: Record<string, any>,
    locale: Record<string, any>
  ): string {
    if (config.requriedForExtract) {
      let extractList = '';

      for (const extract of keyInfoFile.Keys[keyId].Extract) {
        extractList = extractList + extract + ', ';
      }

      const requiredForExtracts: string =
        extractList.length > 0
          ? extractList.substring(0, extractList.length - 2)
          : `${locale.no}`;

      return `${locale.requriedForExtract}: ${requiredForExtracts}.\n`;
    } else {
      return '';
    }
  }

  static getBehindTheLock(
    config,
    keyId: string,
    keyInfoFile: Record<string, any>,
    locale: Record<string, any>
  ): string {
    if (config.behindTheLoock) {
      let lootList = '';

      for (const lootId of keyInfoFile.Keys[keyId].Loot) {
        lootList = lootList + locale[lootId] + ', ';
      }

      const behindTheLock: string =
        lootList.length > 0
          ? lootList.substring(0, lootList.length - 2)
          : `${locale.no}`;

      return `${locale.behindTheLock}: ${behindTheLock}.\n`;
    } else {
      return '';
    }
  }

  static getRequiredInQuests(
    config,
    keyId: string,
    keyInfoFile: Record<string, any>,
    locale: Record<string, any>,
    dbLocale: Record<string, string>
  ): string {
    if (config.requiredInQuests) {
      let questList = '';

      for (const questId of keyInfoFile.Keys[keyId].Quest) {
        questList = questList + dbLocale[`${questId} name`] + ', ';
      }

      const requiredInQuests =
        questList.length > 0
          ? questList.substring(0, questList.length - 2)
          : `${locale.no}`;

      return `${locale.requiredInQuests}: ${requiredInQuests}.\n`;
    } else {
      return '';
    }
  }
}

module.exports = { mod: new BetterKeys() };
