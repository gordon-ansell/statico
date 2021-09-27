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
 * Statico server.
 */
class Server
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
     * @return {Server}
     */
    start()
    {
        let sitePath = this.#sitePath;
        let address = this.#address;
        let port = this.#port;

        syslog.trace("Site path: " + sitePath, 'Server');

        syslog.notice("Attempting to start serving from: " + sitePath);
        syslog.trace("Address: " + address, 'Server');
        syslog.trace("Port: " + port, 'Server');

        this.#server = http.createServer(function (request, response) {
        
            let filePath = sitePath + request.url;
            syslog.trace("Request URL: " + request.url, 'Server');
            syslog.trace("Raw file path: " + filePath, 'Server');

            if (fs.lstatSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }
            syslog.trace("File path modified: " + filePath, 'Server');

            /*
            if (filePath == (sitePath + '/')) {
                filePath = sitePath + '/index.html';
            }

            let extname = String(path.extname(filePath)).toLowerCase();

            if ('' == extname) {
                try {
                    if (fs.lstatSync(filePath).isDirectory()) {
                        filePath = path.join(filePath, 'index.html');
                    }
                } catch (err) {
                    filePath += '/index.html';
                }
            }
            */
        
            let extname = String(path.extname(filePath)).toLowerCase();
            
            let mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.wav': 'audio/wav',
                '.mp4': 'video/mp4',
                '.woff': 'application/font-woff',
                '.ttf': 'application/font-ttf',
                '.eot': 'application/vnd.ms-fontobject',
                '.otf': 'application/font-otf',
                '.wasm': 'application/wasm'
            };
        
            let contentType = mimeTypes[extname] || 'application/octet-stream';
        
            let dispTypes = {
                '.png': 'inline',
                '.jpg': 'inline',
                '.jpeg': 'inline',
                '.webp': 'inline',
                '.gif': 'inline',
                '.svg': 'inline'
            };

            let dispType = dispTypes[extname] || '';

            syslog.debug("Serving up: " + request.url + "\n => " + filePath + "\n => as " + contentType, 'Server');

            fs.readFile(filePath, function(error, content) {
                if (error) {
                    if(error.code == 'ENOENT') {
                        syslog.warning("404, page not found.");
                        fs.readFile(sitePath + '/404/index.html', function(error, content) {
                            response.writeHead(404, { 'Content-Type': contentType });
                            response.end(content, 'utf-8');
                        });
                    } else {
                        syslog.error("500, strange error.")
                        response.writeHead(500);
                        response.end('Sorry, check with the site admin for error: ' + error.code + '.\n');
                    }
                }
                else {
                    if ('' != dispType) {
                        response.writeHead(200, { 'Content-Type': contentType });
                        response.writeHead(200, { 'Content-Disposition': dispType });
                    } else {
                        response.writeHead(200, { 'Content-Type': contentType });
                    }
                    response.end(content, 'utf-8');
                }
            });
        
        }).listen(port);

        syslog.notice("Server running at: " + address);    
        
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
            this.#server.close();
        }
    }
}

module.exports = Server;