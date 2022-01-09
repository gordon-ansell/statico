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
const express = require('express');

/**
 * Statico express server.
 */
class ServerExpress
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
     * The server itself.
     * @member {object}
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
     * @return {object}
     */
    start()
    {
        syslog.trace("Site path: " + this.#sitePath, 'Server');

        syslog.notice(`Attempting to start serving via Express from: ${this.#sitePath}.`);
        syslog.trace("Address: " + this.#address, 'Server');
        syslog.trace("Port: " + this.#port, 'Server');

        this.#server = express();

        this.#server.use('/', express.static(this.#sitePath));

        this.#server.listen(this.#port, () => {
            syslog.notice(`Statico Express server running at ${this.#address}.`)
        });

        return this.#server;
    }

    /**
     * Stop the server.
     * 
     * 
     */
    stop()
    {
        if (this.#server) {
            this.#server.close(()=>{
                syslog.notice(`Statico server shut down.`);
                delete this.#server;
            });
        }
    }
}

module.exports = ServerExpress;