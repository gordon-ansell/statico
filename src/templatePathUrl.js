/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog } = require('gajn-framework');
const StaticoError = require('./staticoError');
const path = require('path');
const { pathUtils } = require('gajn-framework');

/**
 * Exceptions.
 */
class StaticoTemplateFileError extends StaticoError {}

/**
 * Deal with paths and URLs.
 */
class TemplatePathUrl
{
    /**
     * Path to the file.
     * @member {string}
     */
    filePath = null;

    /**
     * Permalink.
     * @member {string}
     */
    permalink = null;

    /**
     * Output file name.
     * @member {string}
     */
    outputFileName = null;

    /**
     * Configs.
     * @member {Config}
     */
    config = {};

    /**
     * Site path.
     * @member {string}
     */
    static sitePath = null;

    /**
     * Constructor.
     * 
     * @param   {string}        filePath            Path to the file.
     * @param   {Config}        cfg                 Configs.
     * @param   {string}        permalink           Permalink.
     * @param   {string}        outputFileName      Output file name.
     * 
     * @return  {TemplateFile}
     */
    constructor(filePath, config, permalink, outputFileName)
    {
        this.filePath = filePath;
        this.config = config;
        this.permalink = permalink;
        this.outputFileName = outputFileName;
        TemplatePathUrl.sitePath = config.sitePath;
    }

    /**
     * Shorten a path name, mainly for brevity when displaying it.
     * 
     * @param   {string}    ipath    Path to shorten.
     * 
     * @return  {string}
     */
    static sh(ipath)
    {
        if (!TemplatePathUrl.sitePath) {
            throw new StaticoTemplateFileError(`The static sitePtah member in TemplatePathUrl is not set.`);
        }
        if (ipath.startsWith(TemplatePathUrl.sitePath)) {
            return ipath.replace(TemplatePathUrl.sitePath, '');
        }
        return ipath;
    }

    /**
     * Generate the output locations.
     * 
     * @return  {string[]}
     */
    generateOutputLocations()
    {        
        // Remove the base path.
        let op = this.filePath.replace(this.config.sitePath, '');

        // Split into segments and ignore the parts directed. Also ignore anything beginning with '_'.
        let tmp = pathUtils.removeBothSlashes(op).split('/');
        let sel = [];
        for (let item of tmp) {
            if (this.config.ignoreParts) {
                for (let r of this.config.ignoreParts) {
                    item = item.replace(new RegExp(r), '');
                }
            }

            if (!item.startsWith('_')) {
                sel.push(item);
            } 
        }
        op = sel.join('/');

        // Extract extension, dir and the naked filename.
        let ext = path.extname(op);
        let dirName = path.dirname(op);
        let fileNameWithoutExt = path.basename(op, ext);

        // Some temps.
        let outputPath;
        let permalink;

        // If we have a manual permalink.
        if (this.permalink) {

            // Add slashes.
            permalink = pathUtils.addBothSlashes(this.permalink);

            // Create the output path.
            if (this.outputFileName) {
                outputPath = path.join(permalink, this.outputFileName);
                //syslog.error('Output path (1a) is: ' + outputPath);
            } else {
                outputPath = path.join(permalink, this.config.indexName + this.config.outputSuffix);
                //syslog.error('Output path (1b) is: ' + outputPath);
            }

        // If we don't have a manual permalink.
        } else {
            if (this.outputFileName) {
                outputPath = path.join(dirName, this.outputFileName);
                permalink = outputPath;
                //syslog.error('Output path (2a) is: ' + outputPath);

            } else {
                // See if the naked file name is the index name.
                if (fileNameWithoutExt == this.config.indexName) {
                    // If so, ignore the filename for the final output.
                    outputPath = path.join(dirName, this.config.indexName + this.config.outputSuffix);

                // If it's not the index name, drop it into a subdirectory.
                } else {
                    outputPath = path.join(dirName, fileNameWithoutExt, this.config.indexName + this.config.outputSuffix);
                }

                // The permalink is just the directory name of the path.
                permalink = path.dirname(outputPath);
                //syslog.error('Output path (2b) is: ' + outputPath);
            }

        }

        // Add the relative output path indent.
        outputPath = path.join(this.config.outputPath, outputPath);

        // Odd situation on an index file where we have a dot. Get rid of it.
        if (permalink.startsWith('.')) {
            permalink = permalink.substr(1);
        }

        // Slash both sides.
        if (this.outputFileName) {
            permalink = pathUtils.addLeadingSlash(permalink);
        } else {
            permalink = pathUtils.addBothSlashes(permalink);
        }

        // Return both.
        return [outputPath, permalink];

    }

}

module.exports = TemplatePathUrl;
