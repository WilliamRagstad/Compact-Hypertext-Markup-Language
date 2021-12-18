"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompileFileTo = exports.CompileFile = exports.CompileCTML = void 0;
const fs_1 = __importDefault(require("fs"));
/*

  dP""b8 888888 8b    d8 88                  `Yb.       88  88 888888 8b    d8 88          dP""b8  dP"Yb  8b    d8 88""Yb 88 88     888888 88""Yb
 dP   `"   88   88b  d88 88         ________   `Yb.     88  88   88   88b  d88 88         dP   `" dP   Yb 88b  d88 88__dP 88 88     88__   88__dP
 Yb        88   88YbdP88 88  .o     """"""""   .dP'     888888   88   88YbdP88 88  .o     Yb      Yb   dP 88YbdP88 88"""  88 88  .o 88""   88"Yb
  YboodP   88   88 YY 88 88ood8              .dP'       88  88   88   88 YY 88 88ood8      YboodP  YbodP  88 YY 88 88     88 88ood8 888888 88  Yb

*/
const DEBUG = false;
/*

 888888 Yb  dP 88""Yb 888888 .dP"Y8
   88    YbdP  88__dP 88__   `Ybo."
   88     8P   88"""  88""   o.`Y8b
   88    dP    88     888888 8bodP'

*/
class CtmlElement {
    constructor(tag, id, classes, attributes, children) {
        this.classes = [];
        this.attributes = {};
        this.children = [];
        this.tag = tag;
        this.id = id;
        this.classes = classes || [];
        this.attributes = attributes || {};
        this.children = children || [];
    }
}
const textTag = 'RAW_TEXT';
const stringQuotes = "\"'`";
function parseContent(content) {
    let elements = [];
    let variables = [];
    let c = '';
    let nc = '';
    let nesting = 0;
    let i;
    function insertElement(elm, nestingLevel) {
        if (nestingLevel === 0) {
            elements.push(elm);
        }
        else if (nestingLevel === 1) {
            let last = elements[elements.length - 1];
            last.children.push(elm);
        }
        else {
            let parent = undefined;
            while (nestingLevel > 0) {
                parent = elements[elements.length - 1];
                if (parent.children.length > 0) {
                    parent = parent.children[parent.children.length - 1];
                }
                nestingLevel--;
            }
            if (parent !== undefined)
                parent.children.push(elm);
        }
    }
    // Parsing helper functions
    function getChars(ignoreWhitespace = true) {
        c = content[i];
        nc = content[i + 1]; // Look ahead one character
        // Skip whitespace
        if (ignoreWhitespace && (c === ' ' || c === '\t' || c === '\r'))
            next(1, ignoreWhitespace);
    }
    function skip(n) {
        i += n;
    }
    function next(n = 1, ignoreWhitespace = true) {
        skip(n);
        getChars(ignoreWhitespace);
    }
    function rollback(n = 1) {
        i -= n;
    }
    function readUntil(pattern) {
        let read = '';
        let match;
        while (i < content.length) {
            if (typeof pattern === 'string') {
                match = true;
                for (let j = 0; j < pattern.length && i + j < content.length; j++) {
                    if (content[i + j] != pattern[j]) {
                        match = false;
                        break;
                    }
                }
            }
            else if (typeof pattern === 'function') {
                match = pattern(content[i], content[i + 1]);
            }
            else
                throw new Error('Invalid pattern type');
            if (match)
                break;
            read += content[i++];
        }
        return read;
    }
    function readWhile(predicate) {
        let read = '';
        while (i < content.length && predicate(content[i], content[i + 1]))
            read += content[i++];
        getChars();
        return read;
    }
    function parseVariableName() {
        if (c !== '$')
            throw new Error(`Invalid variable prefix`);
        next();
        const name = readWhile(or(isAlphanumeric, isOf('_')));
        return name;
    }
    function parseValue(allowPrefix = false) {
        getChars();
        let value = '';
        if (stringQuotes.includes(c)) {
            const quote = c;
            next();
            value += readUntil((s) => s === quote);
            next();
        }
        else if (c == '$') {
            // Variable reference
            const name = parseVariableName();
            throw new Error(`Undefined variable ${name}`);
        }
        else {
            value += readWhile((c, nc) => {
                if (' \t\n\r;=/'.includes(c))
                    return false;
                if (!allowPrefix && '#.?'.includes(c))
                    return false;
                if (c === '/' && nc === '*')
                    return false;
                return true;
            });
        }
        return value;
    }
    function peekMatch(pattern) {
        getChars();
        if (i + pattern.length >= content.length)
            return false;
        for (let j = 0; j < pattern.length; j++) {
            if (content[i + j] !== pattern[j])
                return false;
        }
        return true;
    }
    for (i = 0; i < content.length; i++) {
        getChars();
        // Skip comments
        if (c === '/' && nc === '*') {
            skip(2);
            const comment = readUntil('*/');
            skip(2);
            if (DEBUG)
                console.log(`Comment: '${comment.trim()}'`);
            continue; // Make sure no character is missed
        }
        // Parse variable/macro definitions
        if (c === '$') {
            // Parse variable name
            const name = parseVariableName();
            const dollarName = `$${name}`;
            if (peekMatch(':')) {
                next();
                // Declaration
                const value = parseValue(true);
                if (variables.includes(name))
                    throw new Error(`Variable ${name} is already defined`);
                variables.push(name);
                if (DEBUG)
                    console.log(`Variable: ${name} = '${value}'`);
                // Replace all instances of the variable with the value starting from index i
                let newContent = content.substring(0, i);
                for (let j = i; j < content.length; j++) {
                    if (content[j] === '$') {
                        let match = true;
                        for (let k = 0; k < dollarName.length && j + k < content.length; k++) {
                            if (content[j + k] !== dollarName[k]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            newContent += value;
                            j += name.length;
                        }
                    }
                    else
                        newContent += content[j];
                }
                content = newContent;
                if (!(peekMatch(';') || peekMatch('\n')))
                    throw new Error(`Invalid variable declaration! Must end with ';' or '\\n'`);
                continue;
            }
            throw new Error(`Invalid state`);
        }
        // If c is a forward slash, we're nesting an element
        if (c === '/')
            nesting++;
        else if (c === ';' || c === '\n')
            nesting = 0;
        // If c is alphabetical, it's a tag name
        if (isLetter(c)) {
            // New element starts
            const name = readWhile(isAlphanumeric);
            const element = new CtmlElement(name);
            // Parse id, classes and attributes
            while (peekMatch('.') || peekMatch('#') || peekMatch('?') || peekMatch('$')) {
                if (peekMatch('#')) {
                    next();
                    element.id = parseValue();
                }
                else if (peekMatch('.')) {
                    next();
                    element.classes.push(parseValue());
                }
                else if (peekMatch('?')) {
                    next();
                    const name = parseValue();
                    if (!peekMatch('='))
                        throw new Error(`Invalid attribute ${name}`);
                    next();
                    const value = parseValue();
                    element.attributes[name] = value;
                }
            }
            rollback();
            insertElement(element, nesting);
        }
        else if (stringQuotes.includes(c)) {
            // New text starts
            const text = parseValue();
            const textElement = new CtmlElement(textTag);
            textElement.text = text;
            rollback();
            insertElement(textElement, nesting);
        }
    }
    if (DEBUG) {
        console.log('=== Parse results ===');
        console.log(`Variables: ${variables.join(', ')}`);
        console.log(`Elements:`);
        function printElement(el, indent) {
            var _a;
            const spaces = '  '.repeat(indent);
            if (el.tag === textTag) {
                console.log(`${spaces}text: '${(_a = el.text) === null || _a === void 0 ? void 0 : _a.trim()}'`);
                return;
            }
            console.log(`${spaces}${el.tag}`);
            if (el.id)
                console.log(`${spaces}  id: '${el.id}'`);
            if (el.classes.length > 0)
                console.log(`${spaces}  classes: ${el.classes.join(', ')}`);
            if (el.text)
                console.log(`${spaces}  text: '${el.text}'`);
            if (Object.entries(el.attributes).length > 0) {
                console.log(`${spaces}  attributes:`);
                for (const [name, value] of Object.entries(el.attributes)) {
                    console.log(`${spaces}    '${name}': '${value}'`);
                }
            }
            for (const child of el.children) {
                printElement(child, indent + 1);
            }
        }
        for (const el of elements) {
            printElement(el, 1);
        }
        console.log('\n');
    }
    return elements;
}
// Identification helping functions
const isAlphanumeric = (c) => /[a-zA-Z0-9]/.test(c);
const isLetter = (c) => /[a-zA-Z]/.test(c);
const isDigit = (c) => /[0-9]/.test(c);
const isNumber = (c) => /[0-9]+(\.[0-9]+)?/.test(c);
const isOf = (...chars) => (c) => chars.includes(c);
// Combinatorical logic used for parsing function composing
function or(...funcs) {
    return c => funcs.some(f => f(c));
}
/*

  dP""b8  dP"Yb  8888b.  888888      dP""b8 888888 88b 88 888888 88""Yb    db    888888 88  dP"Yb  88b 88
 dP   `" dP   Yb  8I  Yb 88__       dP   `" 88__   88Yb88 88__   88__dP   dPYb     88   88 dP   Yb 88Yb88
 Yb      Yb   dP  8I  dY 88""       Yb  "88 88""   88 Y88 88""   88"Yb   dP__Yb    88   88 Yb   dP 88 Y88
  YboodP  YbodP  8888Y"  888888      YboodP 888888 88  Y8 888888 88  Yb dP""""Yb   88   88  YbodP  88  Y8

*/
function escapeText(text) {
    // Escape all double quotes
    return text.replace(/"/g, '\\"');
}
function generateHTML(elements, indent = 0) {
    let html = '';
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const spaces = '    '.repeat(indent);
        // If element is a text element, just print it
        if (element.tag === textTag) {
            html += `${spaces}${element.text}\n`;
            continue;
        }
        // Else, print the tag
        html += `${spaces}<${element.tag}`;
        if (element.id)
            html += ` id="${element.id}"`;
        if (element.classes.length > 0)
            html += ` class="${element.classes.join(' ')}"`;
        const attributes = Object.entries(element.attributes);
        for (let j = 0; j < attributes.length; j++) {
            const [attrName, attrVal] = attributes[j];
            html += ` ${attrName}="${escapeText(attrVal)}"`;
        }
        html += '>\n';
        if (element.children.length > 0)
            html += generateHTML(element.children, indent + 1);
        html += `${spaces}</${element.tag}>\n`;
    }
    return html;
}
/*

 888888 Yb  dP 88""Yb  dP"Yb  88""Yb 888888 888888 8888b.      888888 88   88 88b 88  dP""b8 888888 88  dP"Yb  88b 88 .dP"Y8
 88__    YbdP  88__dP dP   Yb 88__dP   88   88__    8I  Yb     88__   88   88 88Yb88 dP   `"   88   88 dP   Yb 88Yb88 `Ybo."
 88""    dPYb  88"""  Yb   dP 88"Yb    88   88""    8I  dY     88""   Y8   8P 88 Y88 Yb        88   88 Yb   dP 88 Y88 o.`Y8b
 888888 dP  Yb 88      YbodP  88  Yb   88   888888 8888Y"      88     `YbodP' 88  Y8  YboodP   88   88  YbodP  88  Y8 8bodP'

*/
/**
 * Compile CTML to HTML
 * @param {string} content The CTMl content to compile
 */
function CompileCTML(source) {
    const elements = parseContent(source);
    const html = generateHTML(elements);
    return html;
}
exports.CompileCTML = CompileCTML;
/**
 * Compile a CTML file into HTML
 * @param file The file to compile to HTML
 */
function CompileFile(filepath) {
    const content = fs_1.default.readFileSync(filepath, 'utf8');
    const html = CompileCTML(content);
    return html;
}
exports.CompileFile = CompileFile;
/**
 * Compile a CTML file into a HTML and save it to a file
 * @param filepath The file to compile to HTML
 * @param outfolder The folder to output the compiled HTML to
 */
function CompileFileTo(filepath, outfolder) {
    const filename = filepath.substring(filepath.lastIndexOf('\\') + 1);
    const filedir = filepath.substring(0, filepath.lastIndexOf('\\'));
    const filename_noext = filename.substring(0, filename.lastIndexOf('.'));
    const outfile = `${outfolder}\\${filename_noext}.html`;
    console.log(`Compiling ${filename} to ${outfile}...`);
    const content = fs_1.default.readFileSync(filepath, 'utf8');
    const html = CompileCTML(content);
    fs_1.default.writeFileSync(outfile, html);
}
exports.CompileFileTo = CompileFileTo;
// Script mode
if (require.main === module) {
    // Compile the CTML file
    const html = CompileFile(process.argv[2]);
    if (DEBUG)
        console.log("=== Generated HTML ===");
    console.log(html);
}
