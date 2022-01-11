/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

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
     * Configs.
     */
    #config = null;

    /**
     * Site path.
     * @member {string}
     */
    #sitePath = null;

    /**
     * Output path.
     * @member {string}
     */
    #outputPath = null;

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
     * Dynamic data.
     * @member {object}
     */
    #dynamicData = {}

    /**
     * Statico caller instance.
     * @member {Statico}
     */
    #statico = null;

    /**
     * Constructor.
     * 
     * @param   {Config}    config      Configs.
     * @param   {Statico}   statico     Statico caller instance.    
     * @param   {int}       port        Port to serve on.
     * 
     * @return  {ServerExpress}
     */
    constructor(config, statico, port = 8081)
    {
        this.#config = config;
        this.#outputPath = path.join(this.#config.outputPath);
        this.#sitePath = path.join(this.#config.sitePath);
        this.#address = this.#config.hostname;
        this.#statico = statico;
        this.#port = port;
        this.#dynamicData = this.#config.dynamicData;
    }

    /**
     * Process dynamic stuff.
     * 
     * @param   {string}    dKey    Dynamic key. 
     * @param   {object}    body    Body of request.
     * 
     * @return  {string|false}
     */
    async processDynamic(dKey, body)
    {
        // Grab dynamic data fields from front matter.
        let cf = this.#dynamicData[dKey];

        // Find the relevant script.
        if (!cf.script) {
            syslog.error(`No dynamic -> script specified for ${dKey}.`);
            return false;
        }

        let sp = path.join(this.#sitePath, '_dynamic', 'scripts', cf.script);

        if (!fs.existsSync(sp)) {
            syslog.error(`No dynamic script found at ${sp}, for ${dKey}.`);
            return false;
        }

        // Call the function.
        let dfunc = require(sp);
        let result = await dfunc.call(this.#statico, this.#config, {body: body});

        return result;

    }

    /**
     * Start the server.
     * 
     * @return {express}
     */
    start()
    {
        syslog.trace("Site path: " + this.#outputPath, 'Server');

        syslog.notice(`Attempting to start serving via Express from: ${this.#outputPath}.`);
        syslog.trace("Address: " + this.#address, 'Server');
        syslog.trace("Port: " + this.#port, 'Server');

        this.#server = express();

        this.#server.use(express.urlencoded({ extended: true }));

        for (let key in this.#dynamicData) {
            this.#server.post(key, async (req, res) => {
                let result = await this.processDynamic(key, req.body);
                await res.send(result);
            });            
        }

        /*
        this.#server.post('/sl/contact/form', (req, res) => {
            syslog.inspect(req.body, 'warning');
            res.send('You have mail.')
        });
        */            

        this.#server.use('/', express.static(this.#outputPath));

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