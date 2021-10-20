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
function htmlabsurlFilter(content, base, noimages = false)
{
    let ret = content;
    let regex = /(srcset|src|href)="(.*?)"/gmi;
    if (noimages) {
        regex = /(href)="(.*?)"/gmi;
    }
    let m;
    let srcsets = [];
    let links = [];
    while ((m = regex.exec(content)) !== null) {

        if (m) {
            let htmlParam = m[1];
            let link = m[2];
            if (!link.trim().startsWith('http') && !link.trim().startsWith('https')) {
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

    }

    links = [... new Set(links)];

    syslog.inspect(links, "warning");

    for (let l of links) {
        ret = string.replaceAll(ret, l, absurl(l, base));
    }

    if (ret.includes(base.trim() + base.trim())) {
        syslog.error(`URL returned from htmlabsurlFilter contains double base.`)
        ret = string.replaceAll(ret, base.trim() + base.trim(), base.trim());
    }

    return ret;
}

module.exports = htmlabsurlFilter;