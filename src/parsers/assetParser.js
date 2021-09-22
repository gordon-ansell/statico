/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog, progress } = require('gajn-framework');
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
     * Parser run.
     * 
     * @param   {string[]}  files       Files to parse.
     * 
     * @return
     */
    async parse(files)
    {
        let totalItems = files.length;
        let count = 0;
        progress.printProgress(0);

        await Promise.all(files.map(async element => {
            let trimmed = element.replace(this.config.sitePath, '');
            let ext = path.extname(element).substr(1);
            if (this.config.assetHandlers.hasHandlerForExt(ext))  {
                try {
                    syslog.debug(`About to parse asset ${trimmed}.`, 'Statico.run')
                    this.config.events.emit('statico.preparseassetfile', trimmed);
                    let process = false;
                    if (this.config.processArgs.argv.clean || this.config.doNotCacheAssetExts.includes(ext)) {
                        process = true;
                    } else if (this.config.cacheAssets) {
                        process = this.config.assetCacheHandler.check(trimmed);
                    }
                    if (process) {
                        let handler = this.config.assetHandlers.getHandlerForExt(ext);
                        await handler.process(element);
                        syslog.info(`Handled asset: ${trimmed}.`);
                    }
                } catch (e) {
                    syslog.error(`Failed to process asset ${trimmed}: ${e.message}`);
                }
            } else {
                this._copyFile(element);
            }
            count++;
            progress.printProgress((count / totalItems) * 100);
        }));

        if (this.config.cacheAssets) {
            this.config.assetCacheHandler.saveMap();
        }
        progress.endProgress();
    }

}

module.exports = AssetParser;
