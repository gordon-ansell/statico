/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const { syslog } = require('js-framework');
const path = require('path');
const chokidar = require('chokidar');
const { exit } = require('process');

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
    async _run(/*filePath*/)
    {
        if (this.q.length > 0) {
            let files = [];
            let builtScss = false;
            let layoutChange = false;

            for (let file of this.q) {
                let ext = path.extname(file);

                if (file.startsWith(path.join(this.config.sitePath, this.config.layoutDir))) {
                    syslog.notice(`Layout change detected - must rebuild everything.`);
                    layoutChange = true;
                    break;
                } else if (!builtScss && '.scss' === ext && this.config.scssBuild) {
                    let tmp = this.config.scssBuild;
                    //filePath = [];
                    for (let item of tmp) {
                        files.push(path.join(this.config.sitePath, item));
                    }
                    builtScss = true;
                } else {
                    files.push(file);
                }
            }

            this.q = [];

            if (layoutChange) {
                this.statico.process();
            } else if (files.length > 0) {
                this.statico.process(files);
            }

        }

        /*
        let ext = path.extname(filePath);

        if ('.scss' == ext && this.config.scssBuild) {
            let tmp = this.config.scssBuild;
            filePath = [];
            for (let item of tmp) {
                filePath.push(path.join(this.config.sitePath, item));
            }
        }

        this.statico.process(filePath);
        if (null !== this.server && this.config.processArgs.argv.servesync) {
            syslog.notice(`Telling browsersync to refresh.`);
            this.server.reload('*.*');
        }
        */
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

        let watchDelay;
        let watchExecute = async (filePath) => {
            try {
                this.q.push(filePath);
                clearTimeout(watchDelay);

                await new Promise((resolve, reject) => {
                    watchDelay = setTimeout(async () => {
                        this._run().then(resolve, reject);
                    }, 0);
                });
            } catch (e) {
                syslog.error(`Watcher error: ${e.message}`);
            }
        }

        ch.on('change', async (filePath) => {
            syslog.notice(`File changed: ${filePath}`);
            await watchExecute(filePath);
            //await this._run(filePath);
        });

        ch.on('add', async (filePath) => {
            syslog.notice(`File added: ${filePath}`);
            await watchExecute(filePath);
            //await this._run(filePath);
        });

        process.on('SIGINT', () => {
            this.server.stop();
            ch.close();
            process.exit(0);
        });
    }
}

module.exports = Watcher;