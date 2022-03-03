/**
 * Please refer to the following files in the root directory:
 * 
 * README.md        For information about the package.
 * LICENSE          For license details, copyrights and restrictions.
 */
'use strict';

const path = require(path);

/**
 * A schema object.
 */
class SchemaObject
{
    /**
     * Context.
     * @type    {string}
     */
    static context = "https://schema.org";

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
        this.type = this.setType(type);
        if (attribs) {
            this.attribs = attribs;
        }
        if (id) {
            this.id = this.setId(id);
        }
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
        return this.setAttrib('@id', '#' + id);
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
        return this.setAttrib('@type', path.join(SchemaObject.context, type));
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