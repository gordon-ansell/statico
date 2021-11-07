/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const TemplateHandler = require('./templateHandler');
//const MarkdownIt = require('markdown-it');

const showdown = require('showdown');
const footnotes = require('@webdesigndecal/showdown-footnotes');

const { syslog, string } = require('gajn-framework');
const striptags = require("striptags");
const TemplateFile = require('../templateFile');
const StaticoTemplateHandlerError = require('./staticoTemplateHandlerError');
const beautify = require('js-beautify').html;

class StaticoMarkdownTemplateHandlerError extends StaticoTemplateHandlerError {}

/**
 * Markdown template handler.
 */
class MarkdownTemplateHandler extends TemplateHandler
{
    /**
     * Template engine.
     * @member {object}
     */
    #engine = null;

    /**
     * Preprocessors.
     * @member {object[]}
     */
    #preprocessors = [];

    /**
     * Constructor.
     * 
     * @param   {Config}    config      Global config object.
     * 
     * @return  {MarkdownTemplateHandler}
     */
    constructor(config)
    {
        super(config);

        let opts = this.config.templateHandlers.getHandlerField('markdown', 'engineOptions', false) || {};

        try {
            this.#engine = new showdown.Converter({ extensions: [footnotes] });
            this.#engine.setOption('strikethrough', true);
            this.#engine.setOption('tables', true);
            //this.#engine = new MarkdownIt(opts);
        } catch (e) {
            throw new StaticoMarkdownTemplateHandlerError(`Could not construct Markdown engine.`, null, e);
        }

        if (config.preprocessors && config.preprocessors.markdown) {
            this.#preprocessors = config.preprocessors.markdown;
        }
    }

    /**
     * Process a file.
     * 
     * @param   {TemplateFile}    templateFile    Template file object.
     * 
     * @return
     */
    async process(templateFile)
    {
        let fp = templateFile.filePath.replace(this.sitePath, '');
        syslog.trace(`Markdown template handler is processing file: ${fp}`, 'TemplateHandler:Markdown');

        // Save for RSS.
        let rss = this.config.rssBuildSeparateContent || false;
        if (rss) {
            templateFile.data.contentRss = templateFile.data.content;
        }

        // Preprocess?
        if (this.#preprocessors && this.#preprocessors.length > 0) {
            for (let pp of this.#preprocessors) {
                if (rss) {
                    templateFile.data.contentRss = await pp.preprocessString(templateFile.data.contentRss, templateFile.data.permalink, 
                        templateFile.outputPath, true);
                }
                templateFile.data.content = await pp.preprocessString(templateFile.data.content, templateFile.data.permalink, 
                    templateFile.outputPath);
            }
        }

        let compile = {
            content: false,
            excerpt: false,
            leader: false
        };
        for (let fld of ['content', 'excerpt', 'leader']) {
            if (templateFile.data[fld]) {
                let f = templateFile.data[fld];
                compile[fld] = f.indexOf('{{') || f.indexOf('{%') || f.indexOf('{#');
            }
        }

        // Parse the data.
        if (templateFile.data.content) {
            if (compile.content) {
                templateFile.data.content_html = this.parseThroughTemplate(templateFile.data.content, templateFile.data);
                templateFile.data.content_html = this.parseThroughMarkdown(templateFile.data.content_html);
            } else {
                templateFile.data.content_html = this.parseThroughMarkdown(templateFile.data.content);
            }
            templateFile.data.content_text = striptags(templateFile.data.content_html);
        }
        if (rss && templateFile.data.contentRss) {
            if (compile.content) {
                templateFile.data.content_html_rss = this.parseThroughTemplate(templateFile.data.contentRss, templateFile.data);
                templateFile.data.content_html_rss = this.parseThroughMarkdown(templateFile.data.content_html_rss);
            } else {
                templateFile.data.content_html_rss = this.parseThroughMarkdown(templateFile.data.contentRss);
            }
        }
        if (templateFile.data.excerpt) {
            if (compile.excerpt) {
                templateFile.data.excerpt_html = this.parseThroughTemplate(templateFile.data.excerpt, templateFile.data);
                templateFile.data.excerpt_html = this.parseThroughMarkdown(templateFile.data.excerpt_html);
            } else {
                templateFile.data.excerpt_html = this.parseThroughMarkdown(templateFile.data.excerpt);
            }
            templateFile.data.excerpt_text = striptags(templateFile.data.excerpt_html);
        }
        if (templateFile.data.leader) {
            if (Array.isArray(templateFile.data.leader)) {
                let tmp ='';
                let count = 1;
                for (let li of templateFile.data.leader) {
                    if (tmp != '') {
                        tmp += '\n';
                    }
                    tmp += `${count}. ${li}`;
                    count++;
                }
                if (compile.leader) {
                    templateFile.data.leader_html = this.parseThroughTemplate(tmp, templateFile.data);
                    templateFile.data.leader_html = this.parseThroughMarkdown(templateFile.data.leader_html);
                } else {
                    templateFile.data.leader_html = this.parseThroughMarkdown(tmp);
                }
                templateFile.data.leader_text = striptags(templateFile.data.leader_html);
            } else {
                if (compile.leader) {
                    templateFile.data.leader_html = this.parseThroughTemplate(templateFile.data.leader, templateFile.data);
                    templateFile.data.leader_html = this.parseThroughMarkdown(templateFile.data.leader_html);
                } else {
                    templateFile.data.leader_html = this.parseThroughMarkdown(templateFile.data.leader);
                }
                templateFile.data.leader_text = striptags(templateFile.data.leader_html);
            }
        }

        // Count the words.
        let words = string.countWords(templateFile.data.content_text);

        if (templateFile.data.leader) {
            words += string.countWords(templateFile.data.leader_text);
        }
        templateFile.data.wordCount = words;
        if (!this.config.totalWordCount) {
            this.config.totalWordCount = words; 
        } else {
            this.config.totalWordCount += words; 
        }

        // Deal with the layout.
        if (!this.config.toParseThroughLayout) {
            this.config.toParseThroughLayout = {};
        }
        let parseName = 'early';
        if ('late' == templateFile.data.parse) {
            //syslog.warning(`Adding to late layout parse: ${templateFile.filePath}`)
            parseName = 'late';
        } else if ('last' == templateFile.data.parse) {
            parseName = 'last';
        }
        if (!this.config.toParseThroughLayout[parseName]) {
            this.config.toParseThroughLayout[parseName] = [];
        }
        this.config.toParseThroughLayout[parseName].push(templateFile);

    }

    /**
     * Parse through layout and write.
     * 
     * @param   {TemplateFile}  templateFile    Template file to parse.
     * 
     * @return
     */
    async parseThroughLayoutAndWrite(templateFile)
    {
        let fp = templateFile.filePath.replace(this.sitePath, '');
        let rendered;

        if (templateFile.data.layout) {
            let layoutTemplateFile = new TemplateFile(templateFile.data.layoutPath, this.config);
            let layoutHandler = this.config.templateHandlers.getHandlerForExt(layoutTemplateFile.ext);
            rendered = layoutHandler.renderFile(templateFile.data.layoutPath, templateFile.data);
        } else {
            rendered = templateFile.data.content_html;
        }


        this.writeFile(beautify(rendered), templateFile.outputPath, fp);
    }

    /**
     * Parse into html and text.
     * 
     * @param   {string}    str     String to parse.
     * @param   {object}    data    Data to use.
     * 
     * @return  {string[]}          [html, text]
     */
    parseMarkdown(str, data = {})
    {
        let html = this.parseThroughTemplate(str, data);
        html = this.parseThroughMarkdown(html);
        let text = striptags(html);

        return [html, text];
    }

    /**
     * Parse through markdown engine.
     * 
     * @param   {string}    toRender    What to render.
     * 
     * @return  {string}
     */
    parseThroughMarkdown(toRender)
    {
        let rendered;
        try {
            //rendered = this.#engine.render(toRender);
            rendered = this.#engine.makeHtml(toRender);
        } catch (e) {
            syslog.inspect(toRender, "warning");
            throw new StaticoMarkdownTemplateHandlerError(`Could not render Markdown: ${e.message}`, null, e); 
        }

        return rendered;
    }

    /**
     * Parse through template engine.
     * 
     * @param   {string}    toRender    What to render.
     * @param   {JSON}      data        Data to pass.
     * 
     * @return  {string}
     */
    parseThroughTemplate(toRender, data = {})
    {
        let spec = this.config.templateHandlers.getHandlerSpec('markdown');
        let handler = spec.userOptions.templateOptions.handler;
        if (!this.config.templateHandlers.hasHandlerSpec(handler)) {
            throw new StaticoMarkdownTemplateHandlerError(`Markdown handler problem. Statico has no template handler named '${handler}'.`);
        }

        let rendered;
        rendered = this.config.templateHandlers.getHandler(handler).renderString(toRender, data);
        return rendered;
    }
 }

module.exports = MarkdownTemplateHandler;
