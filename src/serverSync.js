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

/**
 * Statico sync server.
 */
class ServerSync
{
    /**
     * Site path.
     * @member {string}
     */
    #sitePath = null;

    /**
     * Address.
     * @member {string}
     */
    #address = null;

    /**
     * Port.
     * @member {int}
     */
    #port = 8081;

    /**
     * Server itself.
     * @member {browsersync}
     */
    #server = null;

    /**
     * Constructor.
     * 
     * @param   {string}    sitePath    Where to serve from.
     * @param   {string}    address     Address to serve from.
     * @param   {int}       port        Port to serve on.
     * 
     * @return  {Server}
     */
    constructor(sitePath, address, port = 8081)
    {
        this.#sitePath = sitePath;
        this.#address = address;
        this.#port = port;
    }

    /**
     * Start the server.
     * 
     * @return {Server}
     */
    start()
    {
        this.#server = require("browser-sync").create();

        let host = this.#address.replace('http://', '').replace('https://', '');
        if (host.includes(':')) {
            let sp = host.split(':');
            sp.pop();
            host = sp.join(':');
        }

        this.#server.init({
            server: this.#sitePath,
            port: this.#port,
            host: host
        });

        syslog.notice("Server running at: " + this.#address);    
    }

    /**
     * Reload.
     * 
     * @param   {string[]}  files   Files to reload.
     * 
     */
    reload(files)
    {
        this.#server.reload(files);
    }

    /**
     * Stop the server.
     */
    stop()
    {
        if (this.#server) {
            this.#server.exit();
        }
    }
}

module.exports = ServerSync;