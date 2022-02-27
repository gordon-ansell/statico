/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const { syslog } = require('js-framework');
const StaticoError = require('./staticoError');

class StaticoHandlerError extends StaticoError {};

/**
 * Collection of file handlers.
 */
class HandlerCollection
{
    _exts = [];

    /**
     * Constructor.
     * 
     * @param   {object}    defaults    Default values.
     * 
     * @return  {HandlerCollection}
     */
    constructor(defaults)
    {
        if (defaults) {
            this.loadDefaults(defaults);
        }
    }

    /**
     * Load defaults.
     * 
     * @param   {object}    defaults    Default options.
     * 
     * @return  {HandlerCollection}
     */
    loadDefaults(defaults)
    {
        for (let item in defaults) {
            this[item] = defaults[item];
        }
    }

    /**
     * Add a handler.
     * 
     * @param   {string}            name        Name of the handler.
     * @param   {Handler}           handler     The handler itself.
     * @param   {string[]}          exts        Extensions it handles.
     * 
     * @return  {HandlerCollection}
     */
    addHandler(name, handler, exts)
    {
        if (!(name in this)) {
            this[name] = {};
        }

        this[name].handler = handler;
        this[name].exts = exts;
        syslog.info(`Added handler for '${name}'.`);

        if (!this._exts) {
            this._exts = {};
        }
        for (let ext of exts) {
            this._exts[ext] = name;
        }

        return this;
    } 

    /**
     * Get the handler spec for a name.
     * 
     * @param   {string}            name        Name to get it for.
     * 
     * @return  {object}
     */
    getHandlerSpec(name)
    {
        if (!(name in this)) {
            syslog.inspect(this, "warning", "Handlers object");
            throw new StaticoHandlerError(`No spec found for handler with name '${name}'.`)
        }
        return this[name];
    }

    /**
     * See if we have a handler spec for a name.
     * 
     * @param   {string}            name        Name to test.
     * 
     * @return  {boolean}
     */
    hasHandlerSpec(name)
    {
        if (!(name in this)) {
            return false;
        }
        return true;
    }
 
    /**
     * Get an actual handler.
     * 
     * @param   {string}            name        Name to get it for.
     * 
     * @return  {Handler}
     */
    getHandler(name)
    {
        return this.getHandlerField(name, 'handler');
    }
 
    /**
     * See if we have a handler for an extension.
     * 
     * @param   {string}            ext         Extension to test.
     * 
     * @return  {boolean}
     */
    hasHandlerForExt(ext)
    {
        if (ext in this._exts) {
            return true;
        }
        return false;
    }
  
    /**
     * Get the handler for an extension.
     * 
     * @param   {string}            ext         Extension to get it for.
     * 
     * @return  {Handler}
     */
    getHandlerSpecForExt(ext)
    { 
        if (ext in this._exts) {
            return this.getHandlerSpec(this._exts[ext]);
        }
        throw new StaticoHandlerError(`Could not find handler spec for extension '${ext}'.`)
    }
  
    /**
     * Get the handler for an extension.
     * 
     * @param   {string}            ext         Extension to get it for.
     * 
     * @return  {Handler}
     */
    getHandlerForExt(ext)
    {
        if (ext in this._exts) {
            return this.getHandler(this._exts[ext]);
        }
        throw new StaticoHandlerError(`Could not find a handler for extension '${ext}'.`)
    }
 
    /**
     * Get the handler field from the spec for a given name.
     * 
     * @param   {string}            name        Name to get it for.
     * @param   {string}            field       Field name.
     * @param   {boolean}           mustExist   Must this exist?
     * 
     * @return  {mixed}
     */
    getHandlerField(name, field, mustExist = true)
    {
        let spec = this.getHandlerSpec(name);
        if (!(field in spec)) {
            if (mustExist) {
                throw new StaticoHandlerError(`Field '${field}' not found in spec for handler '${name}'.`);
            } else {
                return null;
            }
        }
        return spec[field];
    }
 
    /**
     * See if we have a handler field in the spec for a given name.
     * 
     * @param   {string}            name        Name to get it for.
     * @param   {string}            field       Field name.
     * 
     * @return  {mixed}
     */
    hasHandlerField(name, field)
    {
        let spec = this.getHandlerSpec(name);
        if (!(field in spec)) {
            return false;
        }
        return true;
    }
 }

module.exports = HandlerCollection;