/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const StaticoError = require('./staticoError');

class StaticoCommandLineError extends StaticoError {}

/**
 * Collate the process arguments.
 */
class ProcessArgs
{
    /**
     * Command line args.
     * @member {JSON}
     */
    argv = {};

    /**
     * Constructor.
     * 
     * @return  {ProcessArgs}
     */
    constructor()
    {
        this.argv = require("minimist")(process.argv.slice(2), {
            string: [
              "input",
              "output",
              "level",
            ],
            boolean: [
              "serve",
              "servesync",
              "clean",
              "cleanonly",
              "watch",
              "convert",
              "noimages",
              "servenode",
              "ftp",
              "dryrun"
            ],
            default: {
              serve: false,
              watch: false,
              noimages: false,
              clean: false,
              cleanonly: false,
              servenode: false,
              ftp: false,
              dryrun: false
            },
            unknown: function (unknownArgument) {
              throw new StaticoCommandLineError(`Unrecognised argument: '${unknownArgument}'. Use --help to see the list of supported commands.`);
            },
        });
        
    }
}

module.exports = ProcessArgs;