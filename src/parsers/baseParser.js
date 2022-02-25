/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');
const { syslog, fsutils } = require('gajn-framework');
const StaticoError = require('../staticoError');
const TemplatePathUrl = require('../templatePathUrl');
const debug = require('debug')('Statico:BaseParser'),
      debugf = require('debug')('FStatico:BaseParser');

/**
 * Base parser class.
 */
class BaseParser
{
    /**
     * Configs.
     * @member {object}
     */
    config = null;

    /**
     * Constructor.
     * 
     * @param   {object}    config      Configs.
     * 
     * @return  {TemplateParser}
     */
    constructor(config)
    {
        this.config = config;
    }

    /**
     * Copy a file.
     * 
     * @param   {string}    filePath    Where the file is.
     * 
     * @return  
     */
    async _copyFile(filePath)
    {
        let base = path.join(this.config.sitePath, this.config.outputPath);
        let op = path.join(this.config.outputPath, filePath.replace(this.config.sitePath, ''));

        if (path.dirname(op).includes('gordonansell.com/_site/Users')) {
            syslog.error(`Spurious directory creation on behalf of ${filePath}`);
            throw new StaticoError(`Hold on, we're creating a spurious directory: ${path.dirname(base)}`);
        }
        fsutils.mkdirRecurse(path.dirname(op));
        fsutils.copyFile(filePath, op);

        debug(`Copied file ${TemplatePathUrl.sh(filePath)} ===> ${TemplatePathUrl.sh(op)}.`);
    }
 

}

module.exports = BaseParser;
