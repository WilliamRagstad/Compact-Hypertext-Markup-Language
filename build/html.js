"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompileFile = exports.CompileHTML = void 0;
const fs_1 = __importDefault(require("fs"));
/*

 88  88 888888 8b    d8 88                  `Yb.        dP""b8 888888 8b    d8 88          dP""b8  dP"Yb  8b    d8 88""Yb 88 88     888888 88""Yb
 88  88   88   88b  d88 88         ________   `Yb.     dP   `"   88   88b  d88 88         dP   `" dP   Yb 88b  d88 88__dP 88 88     88__   88__dP
 888888   88   88YbdP88 88  .o     """"""""   .dP'     Yb        88   88YbdP88 88  .o     Yb      Yb   dP 88YbdP88 88"""  88 88  .o 88""   88"Yb
 88  88   88   88 YY 88 88ood8              .dP'        YboodP   88   88 YY 88 88ood8      YboodP  YbodP  88 YY 88 88     88 88ood8 888888 88  Yb

*/
const DEBUG = false;
/*

 888888 Yb  dP 88""Yb 888888 .dP"Y8
   88    YbdP  88__dP 88__   `Ybo."
   88     8P   88"""  88""   o.`Y8b
   88    dP    88     888888 8bodP'

*/
class HtmlElement {
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
// http://xahlee.info/js/html5_non-closing_tag.html
const selfClosingTags = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
];
const stringQuotes = "\"'";
function parseContent(content) {
    let elements = [];
    let elementHistory = []; // Path of elements to the current element
    let i;
    let nesting = 0;
    let c = '';
    let nc = '';
    let nnc = '';
    function insertElement(elm, nestingLevel) {
        if (nestingLevel === 0) {
            elements.push(elm);
        }
        else if (nestingLevel === 1) {
            let last = elements[elements.length - 1];
            last.children.push(elm);
        }
        else {
            let parent = elements[elements.length - 1];
            while (nestingLevel > 1) {
                parent = parent === null || parent === void 0 ? void 0 : parent.children[parent.children.length - 1];
                nestingLevel--;
            }
            if (parent !== undefined)
                parent.children.push(elm);
        }
    }
    // Parsing helper functions
    function getChars(ignoreWhitespace = true) {
        c = content[i];
        // Look ahead two characters
        nc = content[i + 1];
        nnc = content[i + 2];
        // Skip whitespace
        if (ignoreWhitespace && (c === ' ' || c === '\t' || c === '\n' || c === '\r'))
            next(1, true);
    }
    function next(n = 1, ignoreWhitespace = true) {
        i += n;
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
    function peekMatch(pattern) {
        getChars();
        if (typeof pattern === 'string') {
            if (i + pattern.length > content.length)
                return false;
            for (let j = 0; j < pattern.length; j++) {
                if (content[i + j] !== pattern[j])
                    return false;
            }
        }
        else if (typeof pattern === 'function') {
            return pattern(content[i], content[i + 1]);
        }
        else
            throw new Error('Invalid pattern type');
        return true;
    }
    for (i = 0; i < content.length; i++) {
        getChars();
        // Skip comments
        if (peekMatch('<!--')) {
            next(4);
            const comment = readUntil('-->');
            next(3);
            if (DEBUG)
                console.log(`Comment: '${comment.trim()}'`);
            rollback(1);
            continue;
        }
        // Check new tag
        if (peekMatch('<')) {
            next(1);
            // Check if it's a closing tag
            const closingTag = peekMatch('/');
            if (closingTag)
                next(1);
            // Read tag name
            const tagName = readWhile(not(tagNameEnd));
            // If it is a closing tag, pop the last element from the history and decrement nesting level
            if (closingTag) {
                // Parse the remaining closing tag character
                if (!peekMatch('>'))
                    throw new Error('Invalid closing tag');
                if (elementHistory.length === 0) {
                    throw new Error(`Unexpected closing tag '${tagName}'`);
                }
                const last = elementHistory.pop();
                if (last !== tagName) {
                    throw new Error(`Could not find tag '${tagName}' to close`);
                }
                nesting--;
                continue;
            }
            const element = new HtmlElement(tagName);
            // Loop through and read id, classes and attributes
            while (peekMatch(isLetter)) {
                const attrName = readWhile(isAttributeName);
                let attrValue;
                if (peekMatch('=')) {
                    next(1);
                    // Check if attribute is a string
                    if (stringQuotes.includes(c)) {
                        const quote = c;
                        next(1);
                        attrValue = readUntil((s) => s === quote);
                        next(1);
                    }
                    else {
                        attrValue = readWhile(not(attributeValueEnd));
                    }
                }
                else {
                    attrValue = undefined;
                }
                switch (attrName) {
                    case 'id':
                        // Check that id is not already set
                        if (element.id !== undefined)
                            throw new Error('Duplicate id');
                        // Check that id is valid
                        if (attrValue === undefined)
                            throw new Error('Invalid id');
                        element.id = attrValue;
                        break;
                    case 'class':
                        // Check that classes is not already set
                        if (element.classes.length > 0)
                            throw new Error(`Classes already set for element '${element.tag}'`);
                        // Check that classes is valid
                        if (attrValue === undefined)
                            throw new Error('Invalid classes');
                        element.classes = attrValue.trim().split(' ');
                        break;
                    default:
                        element.attributes[attrName] = attrValue;
                }
            }
            // Skip !DOCTYPE
            if (tagName === '!DOCTYPE')
                continue;
            insertElement(element, nesting);
            // Check if it's a known self closing tag
            if (selfClosingTags.includes(tagName)) {
                if (DEBUG)
                    console.log(`Self closing tag '${tagName}'`);
                // Skip any optional closing />
                if (peekMatch('/'))
                    next(1);
                continue;
            }
            // Else it's a normal tag, so push it to the history and expect a closing tag later on
            elementHistory.push(tagName);
            nesting++;
        }
        else {
            // Read text
            const text = readUntil(tagStart);
            rollback(1); // Rollback the tag start character
            if (text.length > 0) {
                const textElement = new HtmlElement(textTag);
                textElement.text = text;
                insertElement(textElement, nesting);
            }
        }
    }
    if (DEBUG) {
        console.log('=== Parse results ===');
        console.log('Elements:');
        function printElement(el, indent) {
            var _a;
            const spaces = '  '.repeat(indent);
            if (el.tag === textTag) {
                console.log(`${spaces}  text: '${(_a = el.text) === null || _a === void 0 ? void 0 : _a.trim()}'`);
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
                    if (value === undefined) {
                        console.log(`${spaces}    ${name}`);
                    }
                    else {
                        console.log(`${spaces}    ${name}: '${value}'`);
                    }
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
const isAlphanumeric = (c) => !!c && /[a-zA-Z0-9]/.test(c);
const isLetter = (c) => !!c && /[a-zA-Z]/.test(c);
const isDigit = (c) => !!c && /[0-9]/.test(c);
const isNumber = (c) => !!c && /[0-9]+(\.[0-9]+)?/.test(c);
const tagStart = (c) => c === '<';
const tagEnd = (c) => c === '>' || c === '/';
const tagNameEnd = (c) => c === ' ' || tagEnd(c);
const isAttributeName = (c) => isAlphanumeric(c) || c === '-' || c === '_';
const attributeValueEnd = (c) => c === ' ' || tagEnd(c);
// Combinatorical logic used for parsing function composing
const isOf = (...chars) => (c) => chars.includes(c);
function or(...funcs) {
    return c => funcs.some(f => f(c));
}
function not(func) {
    return c => !func(c, undefined);
}
/*

  dP""b8  dP"Yb  8888b.  888888      dP""b8 888888 88b 88 888888 88""Yb    db    888888 88  dP"Yb  88b 88
 dP   `" dP   Yb  8I  Yb 88__       dP   `" 88__   88Yb88 88__   88__dP   dPYb     88   88 dP   Yb 88Yb88
 Yb      Yb   dP  8I  dY 88""       Yb  "88 88""   88 Y88 88""   88"Yb   dP__Yb    88   88 Yb   dP 88 Y88
  YboodP  YbodP  8888Y"  888888      YboodP 888888 88  Y8 888888 88  Yb dP""""Yb   88   88  YbodP  88  Y8

*/
function generateCTML(elements, nestingLevel = 0) {
    var _a, _b;
    let ctml = '';
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        ctml += '/'.repeat(nestingLevel);
        // If element is a text element, just print it
        if (element.tag === textTag) {
            const quotes = !((_a = element.text) === null || _a === void 0 ? void 0 : _a.includes('"')) ? '"' : !((_b = element.text) === null || _b === void 0 ? void 0 : _b.includes("'")) ? "'" : '`';
            ctml += `${quotes}${element.text}${quotes}`;
            ctml += '\n';
            continue;
        }
        // Else, print the tag
        ctml += element.tag;
        if (element.id)
            ctml += `#${element.id}`;
        if (element.classes.length > 0)
            ctml += `.${element.classes.join('.')}`;
        for (const [name, value] of Object.entries(element.attributes)) {
            if (value === undefined) {
                ctml += `?${name}=true`;
            }
            else {
                ctml += `?${name}='${value}'`;
            }
        }
        if (element.children.length > 0) {
            ctml += '\n';
            ctml += generateCTML(element.children, nestingLevel + 1);
        }
        ctml += '\n';
    }
    return ctml;
}
/*

 888888 Yb  dP 88""Yb  dP"Yb  88""Yb 888888 888888 8888b.      888888 88   88 88b 88  dP""b8 888888 88  dP"Yb  88b 88 .dP"Y8
 88__    YbdP  88__dP dP   Yb 88__dP   88   88__    8I  Yb     88__   88   88 88Yb88 dP   `"   88   88 dP   Yb 88Yb88 `Ybo."
 88""    dPYb  88"""  Yb   dP 88"Yb    88   88""    8I  dY     88""   Y8   8P 88 Y88 Yb        88   88 Yb   dP 88 Y88 o.`Y8b
 888888 dP  Yb 88      YbodP  88  Yb   88   888888 8888Y"      88     `YbodP' 88  Y8  YboodP   88   88  YbodP  88  Y8 8bodP'

*/
/**
 * Compile HTML to CTML
 * @param {string} content The HTMl content to compile
 */
function CompileHTML(source) {
    const elements = parseContent(source);
    const ctml = generateCTML(elements);
    return ctml;
}
exports.CompileHTML = CompileHTML;
/**
 * Compile an HTML file into CTML
 * @param file The file to compile to CTML
 */
function CompileFile(filepath) {
    const content = fs_1.default.readFileSync(filepath, 'utf8');
    const ctml = CompileHTML(content);
    return ctml;
}
exports.CompileFile = CompileFile;
// Script mode
if (require.main === module) {
    // Compile the CTML file
    const ctml = CompileFile(process.argv[2]);
    if (DEBUG)
        console.log("=== Generated CTML ===");
    console.log(ctml);
}
