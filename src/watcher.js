/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const { syslog } = require('gajn-framework');
const path = require('path');
const chokidar = require('chokidar');

/**
 * Statico watcher.
 */
class Watcher
{
    /**
     * Config class.
     * @member {Config}
     */
    config = null;

    /**
     * Statico class.
     * @member {Statico}
     */
    statico = null;

    /**
     * Server class.
     * @member {ServerSync}
     */
    server = null;

    /**
     * File queue.
     * @member {string[]}
     */
    q = [];

    /**
     * Constructor.
     * 
     * @param   {Config}        config      Config object.
     * @param   {Statico}       statico     Main statico thing.
     * @param   {ServerSync}    server      Server.
     * 
     * @return  {Watcher}
     */
    constructor(config, statico, server = null)
    {
        this.config = config;
        this.statico = statico;
        this.server = server;
    }

    /**
     * The actual watch run.
     */
    async _run(path)
    {
        let ext = path.extname(path);

        if ('.scss' == ext && this.config.scssBuild) {
            let tmp = this.config.scssBuild;
            path = [];
            for (let item in tmp) {
                path.push(path.join(this.config.sitePath, path));
            }
        }

        this.statico.process(path);
        if (null !== this.server && this.config.processArgs.argv.servesync) {
            syslog.notice(`Telling browsersync to refresh.`);
            this.server.reload('*.*');
        }
    }

    /**
     * Do the watch.
     * 
     * 
     * @return 
     */
    async watch()
    {
        let watcherCfg = this.config.watcher;

        let ignores = watcherCfg.ignores || [];

        const ch = chokidar.watch(this.config.sitePath, {
            ignored: ignores,
            ignoreInitial: true
        });

        syslog.notice('Starting file watcher ...');
        this.config.watching = true;

        ch.on('change', async (path) => {
            syslog.notice(`File changed: ${path}`);
            await this._run(path);
        });

        ch.on('add', async (path) => {
            syslog.notice(`File added: ${path}`);
            await this._run(path);
        });

        process.on('SIGINT', () => {
            this.server.stop();
            ch.close();
            process.exit(0);
        });
    }
}

module.exports = Watcher;