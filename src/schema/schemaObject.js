/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require('path');

/**
 * A schema object.
 */
class SchemaObject
{

    /**
     * URL.
     * @type {string}
     */
    static url = '';

    /**
     * ID.
     * @member  {string}
     */
    id = null;

    /**
     * Type.
     * @member  {string}
     */
    type = null;

    /**
     * Attributes.
     * @member  {object}
     */
    attribs = {};

    /**
     * Constructor.
     * 
     * @param   {string}    type        Schema type.
     * @param   {object}    attribs     Attributes.
     * @param   {string}    id          ID.
     * 
     * @return  {SchemaObject}
     */
    constructor(type, attribs = {}, id = null)
    {
        if (attribs) {
            this.setAllAttribs(attribs);
        }
        if (id) {
            this.id = this.setId(id);
        }
        this.type = this.setType(type);
    }

    /**
     * Set the ID.
     * 
     * @param   {string}    id          ID to set.
     * 
     * @return  {SchemaObject}
     */
    setId(id)
    {
        return this.setAttrib('@id', SchemaObject.url + '/#' + id);
    }

    /**
     * See if we have an attribute.
     * 
     * @param   {string}    name        Name to test.
     * 
     * @return  {boolean}
     */
    hasAttrib(name)
    {
        return Object.keys(this.attribs).includes(name);
    }

    /**
     * Set the type.
     * 
     * @param   {string}    type        Type to set.
     * 
     * @return  {SchemaObject}
     */
    setType(type)
    {
        return this.setAttrib('@type', type);
    }

    /**
     * Set an attrib.
     * 
     * @param   {string}    name        Name.
     * @param   {string}    val         Value.
     * 
     * @return  {SchemaObject}
     */
    setAttrib(name, val)
    {
        this.attribs[name] = val;
        return this;
    }

    /**
     * Append to an array attrib.
     * 
     * @param   {string}    name        Name.
     * @param   {string}    val         Value.
     * 
     * @return  {SchemaObject}
     */
    appendArrayAttrib(name, val)
    {
        if (!this.attribs[name]) {
            this.attribs[name] = [val];
        } else {
            this.attribs[name].push(val);
        }
        return this;
    }

    /**
     * Set all attribs.
     * 
     * @param   {object}    attribs     Object to set from.
     * 
     * @return  {SchemaObject}
     */
    setAllAttribs(attribs)
    {
        for (let idx in attribs) {
            if ('type' === idx) {
                this.setType(attrins[idx]);
            } else if ('id' === idx) {
                this.setId(attribs[idx]);
            } else {
                this.setAttrib(idx, attribs[idx]);
            }
        }

        return this;
    }

    /**
     * Resolve this schema.
     * 
     * @return {string}
     */
    resolve()
    {
        return JSON.stringify(this.attribs, null, '   ');
    }

}

module.exports = SchemaObject;