/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const express = require('express');
const { syslog } = require('gajn-framework');

/**
 * Express runner class.
 */
class ExpressRunner
{
    run()
    {
        const app = express();
        const port = 3000;

        app.get('/', (req, res) => {
            res.send('Hello World!')
        });
          
        app.listen(port, () => {
            syslog.notice(`Statico serverless listening at http://localhost:${port}`)
        })
    }
}

module.exports = ExpressRunner;
 