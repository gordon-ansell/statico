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

        fsutils.mkdirRecurse(path.dirname(base));
        fsutils.copyFile(filePath, op);

        syslog.debug(`Copied file ${TemplatePathUrl.sh(filePath)} ===> ${TemplatePathUrl.sh(op)}.`);
    }
 

}

module.exports = BaseParser;
