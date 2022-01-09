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
const bodyParser = require("body-parser");

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
     * @member {express}
     */
    #server = null;

    /**
     * Constructor.
     * 
     * @param   {string}    sitePath    Where to serve from.
     * @param   {string}    address     Address to serve from.
     * @param   {int}       port        Port to serve on.
     * 
     * @return  {ServerExpress}
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
     * @return {express}
     */
    start()
    {
        syslog.trace("Site path: " + this.#sitePath, 'Server');

        syslog.notice(`Attempting to start serving via Express from: ${this.#sitePath}.`);
        syslog.trace("Address: " + this.#address, 'Server');
        syslog.trace("Port: " + this.#port, 'Server');

        this.#server = express();

        this.#server.use(express.urlencoded());

        this.#server.post('/sl/contact/form', (req, res) => {
            syslog.inspect(req.body, 'warning');
            res.send('You have mail.')
        });            

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
            syslog.notice(`Statico Express server shutting down.`);
        }
    }
}

module.exports = ServerExpress;