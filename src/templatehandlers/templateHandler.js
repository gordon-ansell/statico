/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require("path");
const fs = require('fs');
const { fsutils, syslog } = require('gajn-framework');
const TemplatePathUrl = require('../templatePathUrl');
const debug = require('debug')('Statico:TemplateHandler'),
      debugf = require('debug')('Full.Statico:TemplateHandler'),
      debugd = require('debug')('DryRun.Statico');

/**
 * Base template handler.
 */
class TemplateHandler
{
    /**
     * Configs.
     * @member {Config}
     */
    config = {};

    /**
     * Constructor.
     * 
     * @param   {Config}      config         Configs.
     * 
     * @return  {TemplateHandler}
     */
    constructor(config)
    {
        this.config = config;
    }

    /**
     * Get the layout dir.
     * 
     * @return {string}
     */
    get layoutDir()
    {
        return this.config.layoutDir;
    }

    /**
     * Get the layout path.
     * 
     * @return {string}
     */
    get layoutPath()
    {
        return path.join(this.config.sitePath, this.config.layoutDir);
    }

    /**
     * Get the site path.
     * 
     * @return {string}
     */
    get sitePath()
    {
       return this.config.sitePath;
    }

    /**
     * Write a file.
     * 
     * @param   {string}    buffer      Buffer to write.
     * @param   {string}    ofn         Output file name.
     * @param   {string}    fp          Input file path.
     * 
     * @return  {void}
     */
    writeFile(buffer, ofn, fp)
    {
        if (this.config.processArgs.argv.dryrun) {
            debugd(`Write: %s`, ofn);
        } else {
            fsutils.mkdirRecurse(path.dirname(ofn));
            fs.writeFileSync(ofn, buffer);
        }
        let op = TemplatePathUrl.sh(ofn);
         syslog.info(`Wrote ${fp.replace(this.config.sitePath, '')} ===> ${op.replace(this.config.sitePath, '')}.`);
    }
}

module.exports = TemplateHandler;
