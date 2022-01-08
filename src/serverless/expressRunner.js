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
    /**
     * Runs express.
     *
     * @return  {number}  Return code.
     */
    run(input)
    {
        const app = express();
        const port = 3000;

        app.get('/', (req, res) => {
            res.sendFile(path.join(input, '_sl', 'contact', 'form', 'index.html'))
       });
          
        app.listen(port, () => {
            syslog.notice(`Statico serverless listening at http://localhost:${port}`)
        });

        return 0;
    }
}

module.exports = ExpressRunner;
 