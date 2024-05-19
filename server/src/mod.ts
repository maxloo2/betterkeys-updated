import { DependencyContainer } from 'tsyringe';

import { ItemHelper } from '@spt-aki/helpers/ItemHelper';
import { BaseClasses } from '@spt-aki/models/enums/BaseClasses';
import { IPostDBLoadMod } from '@spt-aki/models/external/IPostDBLoadMod';
import { LogTextColor } from '@spt-aki/models/spt/logging/LogTextColor';
import { IDatabaseTables } from '@spt-aki/models/spt/server/IDatabaseTables';
import { DatabaseServer } from '@spt-aki/servers/DatabaseServer';
import { VFS } from '@spt-aki/utils/VFS';

import { ILogger } from '@spt-aki/models/spt/utils/ILogger';
import _package from '../package.json';

class Mod implements IPostDBLoadMod {
  private modPath = 'user/mods/maxloo2-betterkeys-updated';
  private container: DependencyContainer;

  public postDBLoad(container: DependencyContainer): void {
    this.container = container;

    const database = container
      .resolve<DatabaseServer>('DatabaseServer')
      .getTables();

    const vfs = container.resolve<VFS>('VFS');

    const config = JSON.parse(
      vfs.readFile(`${this.modPath}/config/config.json`)
    );

    if (config.enableAutoUpdate) {
      this.autoUpdate(config);
      this.main(database, config);
    } else {
      this.main(database, config);
    }
  }

  public main(database: IDatabaseTables, config: Record<string, any>): void {
    const vfs = this.container.resolve<VFS>('VFS');
    const logger = this.container.resolve<ILogger>('WinstonLogger');
    const ItemHelper = this.container.resolve<ItemHelper>('ItemHelper');

    const _constants = JSON.parse(
      vfs.readFile(`${this.modPath}/db/_constants.json`)
    );

    const keysWithInfo: string[] = [];

    const mapIds: Record<string, any> = _constants.maps;
    mapIds.forEach(({ name: mapName, id: mapId }) => {
      const keyInfoFile: Record<string, any> = JSON.parse(
        vfs.readFile(`${this.modPath}/db/${mapName}.json`)
      );

      for (const keyId in keyInfoFile.Keys) {
        const keyItem = database.templates.items[keyId];

        if (config.backgroundColor) {
          if (
            config.yellowMarkedKeys &&
            _constants.markedKeys.includes(keyId)
          ) {
            keyItem._props.BackgroundColor = 'yellow';
          } else {
            const color =
              config.backgroundColors[
                database.locales.global['en'][`${mapId} Name`]
              ];

            keyItem._props.BackgroundColor = color;
          }
        }

        if (config.descriptionInfo) {
          for (const lang in database.locales.global) {
            const description =
              database.locales.global[lang][`${keyId} Description`];

            let modLocale: Record<string, any>;

            if (!vfs.exists(`${this.modPath}/locales/${lang}.json`)) {
              modLocale = JSON.parse(
                vfs.readFile(`${this.modPath}/locales/en.json`)
              );
            } else {
              modLocale = JSON.parse(
                vfs.readFile(`${this.modPath}/locales/${lang}.json`)
              );
            }

            const dbLocale: Record<string, string> =
              database.locales.global[lang];

            const obj = {
              config,
              keyId,
              keyInfoFile,
              dbLocale,
              modLocale,
            };

            const keyInfo =
              `${modLocale.mapString}: ${dbLocale[`${mapId} Name`]}.\n` +
              `${Mod.getRequiredForExtracts(obj)}` +
              `${Mod.getRequiredInQuests(obj)}${Mod.getBehindTheLock(obj)}`;

            database.locales.global[lang][`${keyId} Description`] =
              keyInfo + '\n' + description;
          }
        }

        keysWithInfo.push(keyId);
      }

      logger.info(
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

    logger.logWithColor(
      `[${_package.name}-${_package.version}] Added info and background colors to all keys/ keycards`,
      LogTextColor.GREEN
    );
  }

  private autoUpdate(config: Record<string, any>) {}

  static getRequiredForExtracts(obj: {
    config: Record<string, any>;
    keyId: string;
    keyInfoFile: Record<string, any>;
    modLocale: Record<string, any>;
    dbLocale: Record<string, string>;
  }): string {
    const { config, keyId, keyInfoFile, modLocale } = obj;
    if (config.requriedForExtract) {
      let extractList = '';

      for (const extract of keyInfoFile.Keys[keyId].Extract) {
        extractList = extractList + extract + ', ';
      }

      const requiredForExtracts: string =
        extractList.length > 0
          ? extractList.substring(0, extractList.length - 2)
          : `${modLocale.no}`;

      return `${modLocale.requriedForExtract}: ${requiredForExtracts}.\n`;
    } else {
      return '';
    }
  }

  static getRequiredInQuests(obj: {
    config: Record<string, any>;
    keyId: string;
    keyInfoFile: Record<string, any>;
    modLocale: Record<string, any>;
    dbLocale: Record<string, string>;
  }): string {
    const { config, keyId, keyInfoFile, dbLocale, modLocale } = obj;

    if (config.requiredInQuests) {
      let questList = '';

      for (const questId of keyInfoFile.Keys[keyId].Quest) {
        questList = questList + dbLocale[`${questId} name`] + ', ';
      }

      const requiredInQuests =
        questList.length > 0
          ? questList.substring(0, questList.length - 2)
          : `${modLocale.no}`;

      return `${modLocale.requiredInQuests}: ${requiredInQuests}.\n`;
    } else {
      return '';
    }
  }

  static getBehindTheLock(obj: {
    config: Record<string, any>;
    keyId: string;
    keyInfoFile: Record<string, any>;
    modLocale: Record<string, any>;
    dbLocale: Record<string, string>;
  }): string {
    const { config, keyId, keyInfoFile, modLocale } = obj;
    if (config.behindTheLoock) {
      let lootList = '';

      for (const lootId of keyInfoFile.Keys[keyId].Loot) {
        lootList = lootList + modLocale[lootId] + ', ';
      }

      const behindTheLock: string =
        lootList.length > 0
          ? lootList.substring(0, lootList.length - 2)
          : `${modLocale.no}`;

      return `${modLocale.behindTheLock}: ${behindTheLock}.\n`;
    } else {
      return '';
    }
  }
}

module.exports = { mod: new Mod() };
