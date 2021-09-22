/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog, fsutils, string } = require('gajn-framework');
const StaticoError = require('./staticoError');
const path = require('path');
const matter = require('gray-matter');
const fs = require('fs');

class StaticoCollectionError extends StaticoError {};

/**
 * Statico converter.
 */
class Converter
{
    path = null;
    config = null;

    /**
     * Constructor.
     */
    constructor(path, config)
    {
        this.path = path;
        this.config = config;
    }

    async convertImages()
    {
        let entries = fs.readdirSync(this.path);

        await Promise.all(entries.map(async entry => {

            syslog.notice(`Processing ${entry}`);

            let filePath = path.join(this.path, entry);
            syslog.notice(`Filepath ${filePath}`);
            let stats = fs.statSync(filePath);

            if (stats.isFile()) {
                let ext = path.extname(filePath);
                let base = path.basename(filePath, ext);
                let sp = base.split('-');

                if (sp[sp.length - 1].endsWith('w')) { // && this.is_numeric(sp[sp.length - 2]) && this.is_numeric(sp[sp.length - 3])) {
                    sp.pop();
                }
        
                let op = path.join(this.path, 'converted', sp.join('-') + ext);
                fsutils.copyFile(filePath, op);
            }

        }));

    }

    async convert()
    {
        let entries = fs.readdirSync(this.path);
 
        await Promise.all(entries.map(async entry => {

            syslog.notice(`Processing ${entry}`);

            let filePath = path.join(this.path, entry);
            syslog.notice(`Filepath ${filePath}`);
            let stats = fs.statSync(filePath);

            if (stats.isFile() && path.extname(filePath) == '.md') {
                try {
                    this.convertSingle(entry);
                } catch (e) {
                    syslog.error(`Error with ${entry}: ${e.message}`);
                }
            }

        }));

    }

    is_numeric(str){
        return /^\d+$/.test(str);
    }

    processImage(m, ret, fm = false) 
    {
        let spec;

        if (!fm) {
            if (!ret._images) {
                return ret;
            }
            if (!ret._images[m[1]]) {
                return ret;
            }

            spec = ret._images[m[1]];
        } else {
            spec = ret._images[m];
        }

        if (typeof spec == "string") {
            if (spec.includes('|')) {
                let sp = spec.split('|');
                let n = {};
                for (let item of sp) {
                    if (item.includes('=')) {
                        let br = item.split('=');
                        n[br[0].trim()] = br[1].trim();
                    } else {
                        n.url = item.trim();
                    }
                }
                spec = n;
            } else {
                spec = {
                    url: spec
                };
            }
        }

        let ok = ['url', 'title', 'alt', 'caption', '@itemprop', 'class'];
        for (let idx in spec) {
            if (!ok.includes(idx)) {
                try {
                    delete spec[idx];
                } catch (e) {
                    syslog.inspect(m, "warning");
                    syslog.error(`Problem deleting '${idx}' of spec'`);
                }
            }
        }

        if (!spec.alt) {
            if (spec.title) {
                spec.alt = spec.title;
            } else if (spec.caption) {
                spec.alt =spec.caption;
            } else {
                spec.alt = '';
            }
        }

        if (!spec.title && spec.caption) {
            spec.title = spec.caption;
        }

        spec['@itemprop'] = "image";

        let op = '![' + spec.alt + '](';
        delete spec.alt;

        let dir = path.dirname(spec.url);
        let base = path.basename(spec.url, path.extname(spec.url));
        let sp = base.split('-');

        if (sp[sp.length - 1].endsWith('w')) { // && this.is_numeric(sp[sp.length - 2]) && this.is_numeric(sp[sp.length - 3])) {
            sp.pop();
        }

        let url = path.join(dir, sp.join('-') + path.extname(spec.url)).replace('/assets/posts/', '/assets/images/posts/');

        op += url;

        delete spec.url;

        if (0 == Object.keys(spec).length) {
            op += ')';
        } else if (spec.title && 1 == Object.keys(spec).length) {
            op += ' "' + spec.title + '")';
        } else {
            let additional = "";
            for (let item of Object.keys(spec)) {
                if ("" != additional) {
                    additional += '|';
                }
                additional += item + '=' + spec[item];
            }
            op += ' "' + additional + '")';
        }

        return op;
    }

    processVideo(m, ret) 
    {
        if (!ret._videoLinks) {
            syslog.error('No _videoLinks');
            return ret;
        }
        if (!ret._videoLinks[m[1]]) {
            syslog.error(`No _videoLinks.${m[1]}`);
            return ret;
        }

        let spec = ret._videoLinks[m[1]];

        /*
        let ok = ['url', 'title', 'alt', 'caption', '@itemprop'];
        for (let idx in spec) {
            if (!ok.includes(idx)) {
                delete spec[idx];
            }
        }
        */

        spec['@itemprop'] = "video";

        //[//]: # (@videolink | youtube | id=Mldhcedp0Lc | name=Jennifer Thompson, powerlifter. | uploadDate=2018-01-09 | caption=Jennifer Thomson working out.)

        let op = '[//]: # (@videolink | youtube';

        for (let idx in spec) {
            if ('tag' == idx) {
                op += ' | id=' + spec.tag;
            } else {
                op += ' | ' + idx + '=' + spec[idx];
            }
        }

        op += ')';

        return op;
    }

    async convertSingle(entry)
    {
        let filePath = path.join(this.path, entry);

        let raw; 
        try {
            //raw = fs.readFileSync(filePath, 'utf8');
            raw = string.tabsToSpaces(fs.readFileSync(filePath, 'utf8').split('\r\n').join('\n'));        
        } catch (e) {
            throw new StaticoTemplateFileError(`Cannot read file ${filePath}: ${e.message}.`, null, e);
        }

        let ret = {};

        let extracted = matter(raw.replace(/\t/g, '  '), this.config.frontMatterOptions);

        for(let field of ['content', 'excerpt']) {
            if (field in extracted) {
                ret[field] = extracted[field];
            }
        }
        if ('data' in extracted) {
            for (let field in extracted.data) {
                ret[field] = extracted.data[field];
            }
        }

        if (ret.name) {
            ret.title = ret.name;
            delete ret.name;
        }

        if (ret.abstract) {
            ret.excerpt = ret.abstract;
            delete ret.abstract;
        }

        if (ret.datePublished) {
            ret.date = ret.datePublished;
            delete ret.datePublished;
        }

        if (ret._summary) {
            ret.leader = ret._summary;
            delete ret._summary;
        }

        if (ret.significant) {
            delete ret.significant;
        }

        if (ret._layout) {
            if ('citation' == ret._layout) {
                ret.excerpt = ret.description;
                delete ret._layout;
            } else if ('briefly' == ret._layout) {
                ret.excerpt = ret.description;
                delete ret._layout; 
            }
        }

        if (ret.keywords) {
            let cats = [];
            let tags = [];

            let catNamesFirst = ['Tech', 'Weight Training', 'Entertainment', 'Writing', 'Society','RTM','Science'];
            let catNamesOther = ['Review', 'How-To', 'Opinion', 'News', 'Citation','Disquisition'];

            for (let f of catNamesFirst) {
                if (ret.keywords.includes(f)) {
                    cats.push(f);
                }
            }
            for (let f of catNamesOther) {
                if (ret.keywords.includes(f)) {
                    cats.push(f);
                }
            }

            for (let kw of ret.keywords) {
                if (!catNamesFirst.includes(kw) && !catNamesOther.includes(kw) && 'briefly' != kw) {
                    tags.push(kw);
                }
            }

            ret.cats = cats;
            ret.tags = tags;
            delete ret.keywords;
        }

        let citation = '';
        if (ret.citation) {
            citation = `[//]: # (@citeblock | !externalLink`;
            ret.externalLink = ret.citation.url;
            let t;
            if (ret.citation.title) {
                t = ret.citation.title;
            } else if (ret.citation.name) {
                t = ret.citation.name;
            } else if (ret.citation.headline) {
                t = ret.citation.headline;
            }
            if (t) {
                citation += ` | title=${t}`;
            }
            if (ret.citation.author) {
                if (ret.citation.author.name) {
                    citation += ` | author=${ret.citation.author.name}`;
                }
                if (ret.citation.author.url) {
                    citation += ` | authorurl=${ret.citation.author.url}`;
                }
            }
            if (ret.citation._site) {
                if (ret.citation._site.name) {
                    citation += ` | site=${ret.citation._site.name}`;
                }
                if (ret.citation._site.url) {
                    citation += ` | siteurl=${ret.citation._site.url}`;
                }
            }

            citation = '\n\n' + citation + ')';
            delete ret.citation;
        }

        let newContent = ret.content;

        // Images.

        const regex = /\(\(\(respimg\-(.+?)\)\)\)/g;
        let m;
        while ((m = regex.exec(ret.content)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            if (m) {
                let rep = this.processImage(m, ret);
                newContent = string.replaceAll(newContent, m[0], rep);
                if (ret._images && ret._images[m[1]]) {
                    delete ret._images[m[1]];
                }
            }
        }

        let extra = '';
        if (ret._images && Object.keys(ret._images).length > 0) {
            for (let idx in ret._images) {
                if (ret._images[idx].iconImage) {
                    ret.excerptImage = ret._images[idx].url.replace('/assets/posts/', '/assets/images/posts/');
                } else {
                    extra += '\n' + this.processImage(idx, ret, true) + '\n';
                }
                delete ret._images[idx];
            }
        }

        if ('' != extra) {
            extra = '\n\nSPARE IMAGES\n' + extra;
        }

        delete ret._importProducts;
        delete ret._images;

        let newContent2 = newContent;
    
        // Links.
        const regex2 = /\(\(\((.+?)\|(.+?)\)\)\)/g;
        while ((m = regex2.exec(newContent)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex2.lastIndex) {
                regex2.lastIndex++;
            }
    
            if (m) {
                if (m[2].includes('|')) {
                    let sp = m[2].split('|');
                    let md = `[${m[1]}](${sp[0]} "${sp[1]}")`;
                    //let l1 = this.link(m[1], sp[0], sp[1]);
                    //let l2 = this.link(m[1], this.qualify(sp[0]), sp[1]);
                    newContent2 = newContent2.replace(m[0], md);
                    //htmlRss = htmlRss.replace(m[0], l2);
                } else {
                    let md = `[${m[1]}](${m[2]})`;
                    //let l1 = this.link(m[1], m[2]);
                    //let l2 = this.link(m[1], this.qualify(m[2]));
                    newContent2 = newContent2.replace(m[0], md);
                    //htmlRss = htmlRss.replace(m[0], l2);
                }
            }
        }

        let newContent3 = newContent2;

        // Videos

        const regex3 = /\(\(\(video\-(.+?)\)\)\)/g;
        while ((m = regex3.exec(newContent2)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex3.lastIndex) {
                regex3.lastIndex++;
            }

            if (m) {
                let rep = this.processVideo(m, ret);
                newContent3 = string.replaceAll(newContent3, m[0], rep);
            }
        }
        delete ret._videoLinks;
    

        // Write out.

        if (!fs.existsSync(path.join(this.path, 'converted'))) {
            fsutils.mkdirRecurse(path.join(this.path, 'converted'))
        }

        let op = path.join(this.path, 'converted', entry);

        delete ret.content;

        let stringified = matter.stringify(newContent3 + citation + extra, ret);

        fs.writeFileSync(op, stringified);
        syslog.notice(`Wrote ${op}`);
    }

}

module.exports = Converter;