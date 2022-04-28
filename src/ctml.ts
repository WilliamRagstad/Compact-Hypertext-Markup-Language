import fs, { stat } from 'fs';


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
    tag: string;
    id: string | undefined;
    classes: string[] = [];
    attributes: Record<string, string> = { };
	parent: CtmlElement | undefined;
    children: CtmlElement[] = [];
    text: string | undefined;

    constructor(tag: string, id?: string, classes?: string[], attributes?: Record<string, string>, children?: CtmlElement[]) {
        this.tag = tag;
        this.id = id;
        this.classes = classes || [];
        this.attributes = attributes || { };
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


/*

 88""Yb    db    88""Yb .dP"Y8 88 88b 88  dP""b8
 88__dP   dPYb   88__dP `Ybo." 88 88Yb88 dP   `"
 88"""   dP__Yb  88"Yb  o.`Y8b 88 88 Y88 Yb  "88
 88     dP""""Yb 88  Yb 8bodP' 88 88  Y8  YboodP

*/

type char = string;
type Pred = (c: char) => boolean;
type Pred1 = (c: char, nc: char) => boolean; // One char lookahead
type Patt = string;

const stringQuotes = "\"'`";

function parseContent(content: string): CtmlElement[] {
    let elements: CtmlElement[] = [];
    let variables: string[] = [];

    let c: char = '';
    let nc: char =  '';
    let nesting = 0;
    let i: number;

    function insertElement(elm: CtmlElement, nestingLevel: number) {
        if (nestingLevel === 0) {
            elements.push(elm);
        } else {
			let parent: CtmlElement | undefined = elements[elements.length - 1];
            while(nestingLevel > 1) {
				parent = parent?.children[parent.children.length - 1];
				nestingLevel--;
            }
            if (parent !== undefined) {
				elm.parent = parent;
				parent.children.push(elm);
			}
        }
    }

    // Parsing helper functions
    function getChars(ignoreWhitespace: boolean = true) {
        c = content[i];
        nc = content[i+1]; // Look ahead one character

        // Skip whitespace
        if (ignoreWhitespace && (c === ' ' || c === '\t' || c === '\r')) next(1, ignoreWhitespace);
    }
    function skip(n: number) {
        i += n;
    }
    function next(n: number = 1, ignoreWhitespace: boolean = true) {
        skip(n);
        getChars(ignoreWhitespace);
    }
    function rollback(n: number = 1) {
        i -= n;
    }
    function readUntil(pattern: Patt | Pred | Pred1) {
        let read = '';
        let match: boolean;
        while(i < content.length) {
            if (typeof pattern === 'string') {
                match = true;
                for(let j = 0; j < pattern.length && i + j < content.length; j++) {
                    if(content[i + j] != pattern[j]) {
                        match = false;
                        break;
                    }
                }
            }
            else if (typeof pattern === 'function') {
                match = pattern(content[i], content[i+1]);
            }
            else throw new Error('Invalid pattern type');

            if(match) break;
            read += content[i++];
        }
        return read;
    }
    function readWhile(predicate: Pred | Pred1) {
        let read = '';
        while(i < content.length && predicate(content[i], content[i+1])) read += content[i++];
        getChars();
        return read;
    }
    function parseVariableName() {
        if (c !== '$') throw new Error(`Invalid variable prefix`);
        next();
        const name = readWhile(or(isAlphanumeric, isOf('_')));
        return name;
    }
    function parseValue(allowPrefix = false): string {
        getChars();
        let value = '';
        if (stringQuotes.includes(c)) {
            const quote = c;
            next();
            value += readUntil((s: char) => s === quote);
            next();
        }
        else if (c == '$') {
            // Variable reference
            const name = parseVariableName();
            throw new Error(`Undefined variable ${name}`);
        }
        else {
            value += readWhile((c: char, nc: char) => {
                if (' \t\n\r;=/'.includes(c)) return false;
                if (!allowPrefix && '#.?'.includes(c)) return false;
                if (c === '/' && nc === '*') return false;
                return true;
            });
        }
        return value;
    }
    function peekMatch(pattern: string) {
        getChars();
        if (i + pattern.length >= content.length) return false;
        for(let j = 0; j < pattern.length; j++) {
            if (content[i + j] !== pattern[j]) return false;
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
            if (DEBUG) console.log(`Comment: '${comment.trim()}'`);
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

                if (variables.includes(name)) throw new Error(`Variable ${name} is already defined`);
                variables.push(name);
                if (DEBUG) console.log(`Variable: ${name} = '${value}'`);
                // Replace all instances of the variable with the value starting from index i
                let newContent = content.substring(0, i);
                for(let j = i; j < content.length; j++) {
                    if (content[j] === '$') {
                        let match = true;
                        for(let k = 0; k < dollarName.length && j + k < content.length; k++) {
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
                    else newContent += content[j];
                }
                content = newContent;
                if (!(peekMatch(';') || peekMatch('\n'))) throw new Error(`Invalid variable declaration! Must end with ';' or '\\n'`);
                continue;
            }

            throw new Error(`Invalid state`);
        }
        // If c is a forward slash, we're nesting an element
        if (c === '/' && nc === '{') {
            nesting++;
            next(2);
            let stack = 0;
            let nestedContent = '';
            while(true) {
                if (content[i] === '/' && content[i+1] === '{') stack++;
                if (content[i] === '}') {
                    if (stack == 0) break;
                    stack--;
                }
                nestedContent += content[i];
                i++;
            }
            const nestedElements = parseContent(nestedContent.trim());
            nestedElements.forEach(e => {
                insertElement(e, nesting);
            });
            nesting--;
        }
        else if (c === '/') nesting++;
        else if (c === ';' || c === '\n') nesting = 0;
        // If c is alphabetical, it's a tag name
        if (isLetter(c)) {
            // New element starts
            const name = readWhile(isAlphanumeric);
            const element = new CtmlElement(name);
            // Parse id, classes and attributes
            while(peekMatch('.') || peekMatch('#') || peekMatch('?') || peekMatch('$')) {
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
                    if (!peekMatch('=')) throw new Error(`Invalid attribute ${name}`);
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

        function printElement(el: CtmlElement, indent: number) {
            const spaces = '  '.repeat(indent);
            if (el.tag === textTag) {
                console.log(`${spaces}text: '${el.text?.trim()}'`);
                return;
            }
            console.log(`${spaces}${el.tag}`);
            if (el.id) console.log(`${spaces}  id: '${el.id}'`);
            if (el.classes.length > 0) console.log(`${spaces}  classes: ${el.classes.join(', ')}`);
            if (el.text) console.log(`${spaces}  text: '${el.text}'`);
            if (Object.entries(el.attributes).length > 0) {
                console.log(`${spaces}  attributes:`);
                for(const [name, value] of Object.entries(el.attributes)) {
                    console.log(`${spaces}    '${name}': '${value}'`);
                }
            }
            for(const child of el.children) {
                printElement(child, indent + 1);
            }
        }

        for(const el of elements) {
            printElement(el, 1);
        }
        console.log('\n');
    }
    return elements;
}



// Identification helping functions
const isAlphanumeric = (c: char) => /[a-zA-Z0-9]/.test(c);
const isLetter: Pred = (c: string) => /[a-zA-Z]/.test(c);
const isDigit:  Pred = (c: string) => /[0-9]/.test(c);
const isNumber:  Pred = (c: string) => /[0-9]+(\.[0-9]+)?/.test(c);
const isOf: (...chars: char[]) => Pred = (...chars: char[]) => (c: char) => chars.includes(c);

// Combinatorical logic used for parsing function composing
function or(...funcs: Pred[]): Pred {
    return c => funcs.some(f => f(c));
}

/*

  dP""b8  dP"Yb  8888b.  888888      dP""b8 888888 88b 88 888888 88""Yb    db    888888 88  dP"Yb  88b 88
 dP   `" dP   Yb  8I  Yb 88__       dP   `" 88__   88Yb88 88__   88__dP   dPYb     88   88 dP   Yb 88Yb88
 Yb      Yb   dP  8I  dY 88""       Yb  "88 88""   88 Y88 88""   88"Yb   dP__Yb    88   88 Yb   dP 88 Y88
  YboodP  YbodP  8888Y"  888888      YboodP 888888 88  Y8 888888 88  Yb dP""""Yb   88   88  YbodP  88  Y8

*/

function escapeText(text: string): string {
    // Escape all double quotes
    return text.replace(/"/g, '\\"');
}
/**
 * Generates a string of HTML from a CtmlElement tree list
 * @param elements The elements to be rendered
 * @param enforceStructure If true, the HTML structure will be enforced
 * @param indent The indentation to use for each line
 * @returns The rendered HTML
 */
function generateHTML(elements: CtmlElement[], enforceStructure: boolean, indent = 0): string {
    let html = '';

	const spacing = (n: number) => '  '.repeat(n);

	let enforceStructureEndFunc: (() => void) | undefined = undefined;
	if (enforceStructure) {
		// Check if elements contains a <html> tag
		if (elements.length === 1 && elements[0].tag === 'html') {
			// If simply add a <!DOCTYPE html> tag to the beginning
			html += '<!DOCTYPE html>\n';
		} else if (elements.length === 2 && elements[0].tag === 'head' && elements[1].tag === 'body') {
			// If elements contains a <head> and <body> tag, add a <!DOCTYPE html> tag to the beginning
			html += '<!DOCTYPE html>\n';
			html += '<html>\n';
			enforceStructureEndFunc = () => html += '</html>\n';
		}else if (elements.length === 1 && elements[0].tag === 'head') {
			// If elements contains a <head> and <body> tag, add a <!DOCTYPE html> tag to the beginning
			html += '<!DOCTYPE html>\n';
			html += '<html>\n';
			enforceStructureEndFunc = () => html += '</html>\n';
		} else if (elements.length === 1 && elements[0].tag === 'body') {
			// If elements contains a <body> tag, add a <!DOCTYPE html> tag to the beginning
			html += '<!DOCTYPE html>\n';
			html += '<html>\n';
			html += `${spacing(1)}<head></head>\n`;
			indent = 1;
			enforceStructureEndFunc = () => html += '</html>\n';
		} else {
			// If elements contains other tags, add a <!DOCTYPE html> tag to the beginning
			html += '<!DOCTYPE html>\n';
			html += '<html>\n';
			html += `${spacing(1)}<head></head>\n`;
			html += `${spacing(1)}<body>\n`;
			indent = 2;
			enforceStructureEndFunc = () => html += `${spacing(1)}<body>\n</html>\n`;
		}
	}

    for(let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const spaces = spacing(indent);
        // If element is a text element, just print it
        if (element.tag === textTag) {
			if (element.text === undefined) throw new Error('Text element has no text');

			html += spaces + element.text.split('\n').reduce((acc, line) => {
				const trimmed = line.trim();
				if (trimmed.length === 0) return acc;
				return `${acc}\n${spaces}${trimmed}`; // Trim each line and indent properly
			}) + '\n';
            continue;
        }
        // Else, print the tag
        html += `${spaces}<${element.tag}`;
        if (element.id) html += ` id="${element.id}"`;
        if (element.classes.length > 0) html += ` class="${element.classes.join(' ')}"`;
        const attributes = Object.entries(element.attributes);
        for(let j = 0; j < attributes.length; j++) {
            const [attrName, attrVal] = attributes[j];
            html += ` ${attrName}="${escapeText(attrVal)}"`;
        }
		if (selfClosingTags.includes(element.tag)) {
			if (element.children.length > 0) throw new Error(`Self-closing tag ${element.tag} has children`);
			html += ' />\n';
		} else {
			html += '>\n';
			if (element.children.length > 0) html += generateHTML(element.children, false, indent + 1);
			html += `${spaces}</${element.tag}>\n`;
		}
    }

	enforceStructureEndFunc?.call(null);

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
 export function CompileCTML(source: string, enforceStructure: boolean): string {
    const elements = parseContent(source);
    const html = generateHTML(elements, enforceStructure);
    return html;
}


/**
 * Compile a CTML file into HTML
 * @param file The file to compile to HTML
 */
export function CompileFile(filepath: string, enforceStructure = true): string {
    const content = fs.readFileSync(filepath, 'utf8');
    const html = CompileCTML(content, enforceStructure);

    return html;
}
/**
 * Compile a CTML file into a HTML and save it to a file
 * @param filepath The file to compile to HTML
 * @param outfolder The folder to output the compiled HTML to
 */
export function CompileFileTo(filepath: string, outfolder: string, enforceStructure = true): void {
    const filename = filepath.substring(filepath.lastIndexOf('\\')+1);
    const filedir = filepath.substring(0, filepath.lastIndexOf('\\'));
    const filename_noext = filename.substring(0, filename.lastIndexOf('.'));
    const outfile = `${outfolder}\\${filename_noext}.html`;
    console.log(`Compiling ${filename} to ${outfile}...`);

    const content = fs.readFileSync(filepath, 'utf8');
    const html = CompileCTML(content, enforceStructure);

    fs.writeFileSync(outfile, html);
}


// Script mode
if (require.main === module) {
    // Compile the CTML file
    const html = CompileFile(process.argv[2], true);
    if (DEBUG) console.log("=== Generated HTML ===");
    console.log(html);
}