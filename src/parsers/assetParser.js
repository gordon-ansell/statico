/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog } = require('gajn-framework');
const BaseParser = require('./baseParser');

/**
 * Asset parser class.
 */
class AssetParser extends BaseParser
{
    /**
     * Constructor.
     * 
     * @param   {object}    config      Configs.
     * 
     * @return  {TemplateParser}
     */
    constructor(config)
    {
        super(config);
    }

    /**
     * See if an asset is filtered.
     * 
     * @param   {string}    assetPath   Path to the asset.
     * 
     * @return  {boolen}
     */
    isAssetFiltered(assetPath)
    {
        if (!this.config.assetFilters) {
            return false;
        }

        let af = this.config.assetFilters;

        if (af.justCopyDirs) {
            for (let item of af.justCopyDirs) {
                if (assetPath.startsWith(item)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Parser run.
     * 
     * @param   {string[]}  files       Files to parse.
     * @param   {boolean}   skip        Skip actual processing.
     * 
     * @return
     */
    async parse(files, skip = false)
    {
        let totalItems = files.length;
        let count = 0;
        await syslog.printProgress(0);

        await Promise.all(files.map(async element => {
            let trimmed = element.replace(this.config.sitePath, '');
            let ext = path.extname(element).substr(1);
            if (this.config.assetHandlers.hasHandlerForExt(ext) && !this.isAssetFiltered(trimmed))  {
                try {
                    syslog.debug(`About to parse asset ${trimmed}.`, 'Statico.run')
                    let process = true;
                    if (!skip) {
                        this.config.events.emit('statico.preparseassetfile', trimmed);
                        process = false;
                        if (this.config.processArgs.argv.clean || this.config.doNotCacheAssetExts.includes(ext)) {
                            process = true;
                        } else if (this.config.cacheAssets) {
                            process = this.config.assetCacheHandler.check(trimmed);
                        }
                    }
                    if (process) {
                        let handler = this.config.assetHandlers.getHandlerForExt(ext);
                        await handler.process(element, skip);
                        syslog.info(`Handled asset: ${trimmed}.`);
                    }
                } catch (e) {
                    syslog.error(`Failed to process asset ${trimmed}: ${e.message}`);
                }
            } else {
                this._copyFile(element);
            }
            count++;
            await syslog.printProgress((count / totalItems) * 100);
        }));

        if (this.config.cacheAssets) {
            this.config.assetCacheHandler.saveMap();
        }
        await syslog.endProgress();
    }

}

module.exports = AssetParser;
