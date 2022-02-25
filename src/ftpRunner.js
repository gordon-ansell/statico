/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, fsutils, string } = require('gajn-framework');
const StaticoError = require('./staticoError');
const path = require('path');
const matter = require('gray-matter');
const fs = require('fs');
const debug = require("debug")('Statico:FtpRunner');

class StaticoFtpError extends StaticoError {};

/**
 * Statico FTP runner.
 */
class FtpRunner
{
    /**
     * Relevant configs.
     * @member {object}
     */
    cfg = null;

    /**
     * Constructor.
     * 
     * @param   {object}    config  Configs.
     * 
     * @return  {FtpRunner}
     */
    constructor(config)
    {
        if (!('ftp' in config)) {
            throw new StaticoFtpError(`No FTP configs found.`);
        }
        this.cfg = config.ftp;

        for (let item of ['FTP_HOST', 'FTP_PORT', 'FTP_USER', 'FTP_PASS']) {
            if (!process.env[item]) {
                throw new StaticoFtpError(`No ${item} environment variable specified.`);
            }
            let sp = item.split('_');
            this.cfg[sp[1].toLowerCase()] = process.end[item];
        }
        debug("%O", this.cfg);
    }

    /**
     * Run the upload.
     *
     * @return  {void}
     */
    upload()
    {
    }

}

module.exports = FtpRunner;