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
            allowPaths: undefined,
            ignorePaths: ['_', 'node_modules', '_conv', '_drafts', '_data'],
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
        imageExts: ['jpg', 'jpeg', 'png', 'webp'],
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
        taxonomyTypes: ['tags'],
        collectionSpec: {
            tags: true,
            type: true
        },
        frontMatterOptions: {excerpt: false},
        paginationDefaults: {
            size: 10,
        },
        incrementalTolerance: 3600,
        watcher: {
            livereload: true,
            ignores: [
                path.join(configData.sitePath, 'node_modules'),
                path.join(configData.sitePath, '_conv'),
                path.join(configData.sitePath, '_site'),
                path.join(configData.sitePath, '_tmp'),
                path.join(configData.sitePath, 'assets/_generatedImages'),
                path.join(configData.sitePath, 'package.*'),
                /(^|[\/\\])\../,
            ]
        },
        ftp: {
            live: false,
            ignoreHours: false,
            verbose: false,
            hours: 24,
            sources: [
                configData.outputPath
            ],
            dests: [
                "/public_html"
            ]            
        },
        schemaDefs: {
            publisher: {
                _id: 'publisher',
                _type: 'Organization',
                image: {
                    type: 'ImageObject',
                    create: 'global',
                    ref: true
                },
                logo: {
                    type: 'ImageObject',
                    create: 'global',
                    ref: true
                },
                url: {
                    qualify: true
                }
            },
            website: {
                _id: 'website',
                _type: 'WebSite',
                _shouldHave: ['name', 'url'],
                name: 'site.title',
                description: 'site.description',
                url: 'cfg.hostname',
                publisher: 'ref.publisher'
            }
        }
    }
}