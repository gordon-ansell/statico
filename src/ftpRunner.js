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
const fs = require('fs');
const debug = require("debug")('Statico:FtpRunner');
const bftp = require("basic-ftp");

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
     * Storage for files to upload.
     * @member {string[]}
     */
    #ftpFiles = [];

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
            this.cfg[sp[1].toLowerCase()] = process.env[item];
        }
        debug("%O", this.cfg);
    }

    /**
     * Run the upload.
     *
     * @return  {void}
     */
    async upload()
    {
        if (('live' in this.cfg) && true === this.cfg.live) {
            syslog.notice("Will attempt to FTP the necessary files.");
        } else {
            syslog.notice("FTP running in test mode.")
        }

        // Checks.
        for (let item of ['host', 'port', 'user', 'pass']) {
            if (!(item in this.cfg)) {
                throw new StaticoFtpError(`No FTP '${item}' config parameter found.`);
            }
        }

        if (!('sources' in this.cfg) || this.cfg.sources.length == 0) {
            syslog.error(`FTP has been requested but no sources are specified.`);
            return;
        }

        if (this.cfg.sources.length !== this.cfg.dests.length) {
            this.error(`Number of source paths does not match number of dest paths for FTP.`)
        }

        // Setup.
        let now = new Date();

        // Subtract hours.
        if (!this.cfg.hours) {
            this.cfg.hours = 24;
        }

        // Create time period.
        now.setHours(now.getHours() - this.cfg.hours);
        syslog.notice(`Will FTP source files changed in the last ${this.cfg.hours} hours, since: ${now.toISOString()}.`);

        // Run.

        // Start the loop.
        let count = 0;
        for (let dir of this.cfg.sources) {
            syslog.info(`FTP is reading directory: ${dir}`);
            await this._parseFTPDir(dir, now, count);
            count = count + 1;
        }

        // Count the files.
        count = 0;
        for (let idx in this.#ftpFiles) {
            count = count + this.#ftpFiles[idx].length;
        }
        if (count == 0) {
            syslog.notice(`No files to FTP.`);
            return;
        } else {
            syslog.notice(`${count} files to FTP.`);
        }

        // Set up the FTP client.
        const client = new bftp.Client();
        if (this.cfg.verbose) {
            client.ftp.verbose = this.cfg.verbose;
        }

        // Connect.
        let dets = {
            host: this.cfg.host,
            user: this.cfg.user,
            password: this.cfg.pass,
        }
        for (let poss of ['secure', 'port']) {
            if (this.cfg[poss]) {
                dets[poss] = this.cfg[poss];
            }
        }

        // Try access.
        try {
            await client.access(dets)
        } catch (err) {
            syslog.error(`FTP connection error: ${err}`);
            return 0;
        }

        for (let count in this.#ftpFiles) {
            let files = this.#ftpFiles[count];
            let destDir = this.cfg.dests[count];
            for (let file of files) {
                let destFile = path.join(destDir, path.dirname(file), path.basename(file));
                if (!this.cfg.live) {
                    syslog.notice(`${file} ==> ${destFile}`);
                } else {
                    try {
                        syslog.info(`Uploading ${file} to ${destFile}`);
                        await client.uploadFrom(file, destFile);
                    } catch (err) {
                        syslog.error(`FTP transfer error: ${err}`);
                    }
                }
            }
        }

        client.close();
    }

    /**
     * Parse and FTP directory.
     * 
     * @param   string  dir         Directory. 
     * @param   Date    dt          Date time.
     */
    async _parseFTPDir(dir, dt, count)
    {
        let entries = fs.readdirSync(dir);
        this.#ftpFiles[count] = [];
        let t = dt.getTime();

        await Promise.all(entries.map(async entry => {

            let filePath = path.join(dir, entry);
            //debug(`filePath: %s, %d`, filePath, dt.getTime());
            let stats = fs.statSync(filePath);

            if (stats.isFile()) {
                if (!entry.startsWith('.')) {
                    if (stats.mtimeMs > t) {
                        this.#ftpFiles[count].push(filePath);
                    }
                }
            } else if (stats.isDirectory()) {
                await this._parseFTPDir(filePath, dt, count);
            }

        }));
    }
}

module.exports = FtpRunner;