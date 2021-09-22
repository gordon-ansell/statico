/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const syslog = require('gajn-framework/src/logger/syslog');
const { URL } = require('url');

/**
 * Absolute URL filter. Make a relative URL an absolute URL.
 */
function absurlFilter(url, base)
{
    if (url.trim().substring(0,4) == 'http') {
        if (url.trim().startsWith(base + base)) {
            syslog.error(`Double base error (*) in absurlFilter: ${url.trim()}`);
        }
        return url.trim();
    }

    let ret = (new URL(url.trim(), base.trim())).toString();
    if (ret.startsWith(base + base)) {
        syslog.error(`Double base error in absurlFilter: ${ret}`);
    }
    return ret;
}

module.exports = absurlFilter;