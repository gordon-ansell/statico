/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, string } = require('gajn-framework');
const absurl = require('./absurlFilter');

/**
 * HTML URL filter. Make all relative URLs found into absolute URLs.
 */
function htmlabsurlFilter(content, base)
{
    let ret = content;
    let regex = /(srcset|src|href)="(.*?)"/gmi;
    let m;
    let srcsets = [];
    let links = [];
    while ((m = regex.exec(content)) !== null) {

        if (m) {
            let htmlParam = m[1];
            let link = m[2];
            if ('srcset' == htmlParam) {
                let commaSp = link.trim().split(',');
                for (let item of commaSp) {
                    if (item.trim().includes(' ')) {
                        let spaceSp = item.trim().split(' ');
                        if (spaceSp.length > 1) {
                            let lastBit = spaceSp[spaceSp.length - 1];
                            if ('w' == lastBit[lastBit.length - 1]) {
                                spaceSp.pop();
                            }
                        }
                        links.push(spaceSp.join(' ')); 
                    } else {
                        links.push(item.trim());
                    }
                }

            } else {
                links.push(link.trim());
            }
        }

    }

    links = Array.from([... new Set(links)]);

    for (let l of links) {
        syslog.error("Replacing " + l + " with " + absurl(l, base));
        ret = string.replaceAll(ret, l, absurl(l, base));
    }

    return ret;
}

module.exports = htmlabsurlFilter;