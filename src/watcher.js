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
     * Do the watch.
     * 
     * 
     * @return 
     */
    watch()
    {
        let ignores = this.config.watcherIgnores;
        /*
        let ignores = [
            path.join(this.config.sitePath, 'node_modules'),
            path.join(this.config.sitePath, '_conv'),
            path.join(this.config.sitePath, '_site'),
            path.join(this.config.sitePath, '_tmp'),
            path.join(this.config.sitePath, '_generatedImages'),
            /(^|[\/\\])\../,
        ];
        */

        syslog.inspect(ignores, "warning");

        const ch = chokidar.watch(this.config.sitePath, {
            ignored: ignores,
            ignoreInitial: true
        });

        syslog.notice('Starting file watcher ...');
        this.config.watching = true;

        ch.on('all', (event, path) => {
            syslog.debug(`${event} on ${path}`);
            this.statico.process(path);
            if (null !== this.server && this.config.processArgs.argv.servesync) {
                syslog.notice(`Telling browsersync to refresh.`);
                this.server.reload('*.*');
            }
        })
    }
}

module.exports = Watcher;