/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');

/**
 * Default configuration.
 */

module.exports = function(configData) {
    
    return {
        // Filters used when parsing filesystem.
        fsParserFilters: {
            allowPaths: ['_posts'],
            ignorePaths: ['_', 'node_modules', '_conv', '_drafts'],
            ignoreDirs: ['.git', '_generatedImages'],
            allowFiles: [],
            ignoreFiles: ['.', '_', 'package.json', 'package-lock.json'],
            ignoreFilesFirst: undefined,
            ignoreExts: ['.sh'],
        },
        templateHandlerDefaults: {
            nunjucks: {
                exts: ['njk'],
                engineOptions: {autoescape: false, throwOnUndefined: true, lstripBlocks: true, trimBlocks: true},
                userOptions: {
                    templateOptions: {handler: 'nunjucks', handlerExt: 'njk'}
                }
            },
            markdown: {
                exts: ['md', 'markdown'],
                engineOptions: {html: true, xhtmlOut: true},
                userOptions: {
                    templateOptions: {handler: 'nunjucks', handlerExt: 'njk', linkify: false}, 
                    parseMdFirst: false, 
                    frontMatterOptions: {exceprt: true}, 
                    defaultLayout: 'post'
                }
            }
        },
        preprocessors: {},
        layoutDir: '_layouts',
        ignoreParts: ["^\\d{4}-\\d{2}-\\d{2}-"],
        layoutProcessor: 'nunjucks',
        indexName: 'index',
        outputSuffix: '.html',
        assetExts: ['jpg', 'jpeg', 'png', 'webp', 'scss'],
        //parse: 'early',
        modes: {
            dev: {
                hostname: "localhost:8081",
                ssl: false
            }
        },
        userData: {
            parse: 'early'
        },
        lazyload: true,
        figureClass: 'respimg',
        dateFields: ['date'],
        dispDate: "dS mmmm yyyy",
        dispTime: "HH:MM",
        taxonomyTypes: ['cats', 'tags'],
        collectionSpec: {
            tags: true,
            type: true,
            cats: true
        },
        frontMatterOptions: {excerpt: false},
        paginationDefaults: {
            size: 10,
        },
        watcher: {
            ignores: [
                path.join(configData.sitePath, 'node_modules'),
                path.join(configData.sitePath, '_conv'),
                path.join(configData.sitePath, '_site'),
                path.join(configData.sitePath, '_tmp'),
                path.join(configData.sitePath, '_generatedImages'),
                path.join(configData.sitePath, 'package.*'),
                /(^|[\/\\])\../,
            ]
        }
    }
}