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
        // This is necessary to avoid infinite loops with zero-width matches
        //if (m.index === regex.lastIndex) {
        //    regex.lastIndex++;
        //}

        if (m) {
            //syslog.warning(`index ${m.index} | ${regex.lastIndex}`);
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
                /*
                let rep = '';
                let commaSp = link.split(',');
                let newLink;
                for (let singleUrl of commaSp) {
                    let spaceSp = singleUrl.trim().split(' ');
                    newLink = absurl(spaceSp[0].trim(), base);
                    syslog.warning(`===> converted ${spaceSp[0]} to ${newLink} from ${singleUrl}`)
                    if ('' != rep) {
                        rep += ', ';
                    }
                    rep += newLink + ' ' + spaceSp[1].trim();
                }
                syslog.warning(`replacing ${link} with ${newLink} (srcset)`)
                ret = ret.replace(link, newLink);
                */

            } else {
                links.push(link.trim());
                /*
                let newLink = absurl(link, base);
                ret = ret.replace(link, newLink);
                syslog.warning(`replacing ${link} with ${newLink} (single)`)
                */
            }
        }

    }

    links = Array.from([... new Set(links)]);
    //srcsets = Array.from([... new Set(srcsets)]);

    //syslog.inspect(links, "warning");
    //syslog.inspect(ret, "warning");

    for (let l of links) {
        ret = string.replaceAll(ret, l, absurl(l, base));
        //syslog.inspect(ret, "warning");
    }


    //syslog.inspect(srcsets, "warning");

    //while (ret.includes(base + base)) {
    //    ret = ret.replace(base + base, base);
    //}

    return ret;
}

module.exports = htmlabsurlFilter;