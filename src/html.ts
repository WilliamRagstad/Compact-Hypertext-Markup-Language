import fs, { stat } from 'fs';


/*

 88  88 888888 8b    d8 88                  `Yb.        dP""b8 888888 8b    d8 88          dP""b8  dP"Yb  8b    d8 88""Yb 88 88     888888 88""Yb
 88  88   88   88b  d88 88         ________   `Yb.     dP   `"   88   88b  d88 88         dP   `" dP   Yb 88b  d88 88__dP 88 88     88__   88__dP
 888888   88   88YbdP88 88  .o     """"""""   .dP'     Yb        88   88YbdP88 88  .o     Yb      Yb   dP 88YbdP88 88"""  88 88  .o 88""   88"Yb
 88  88   88   88 YY 88 88ood8              .dP'        YboodP   88   88 YY 88 88ood8      YboodP  YbodP  88 YY 88 88     88 88ood8 888888 88  Yb

*/


const DEBUG = true;


/*

 888888 Yb  dP 88""Yb 888888 .dP"Y8
   88    YbdP  88__dP 88__   `Ybo."
   88     8P   88"""  88""   o.`Y8b
   88    dP    88     888888 8bodP'

*/

class HtmlElement {
    tag: string;
    id: string | undefined;
    classes: string[] = [];
    attributes: Record<string, string | undefined> = { };
    children: HtmlElement[] = [];
    text: string | undefined; // If tag is RAW_TEXT then this is the text

    constructor(tag: string, id?: string, classes?: string[], attributes?: Record<string, string>, children?: HtmlElement[]) {
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

type char = string | undefined;
type Pred = (c: char) => boolean;
type Pred1 = (c: char, nc: char | undefined) => boolean; // One char lookahead
type Patt = string;

const stringQuotes = "\"'";

function parseContent(content: string): HtmlElement[] {
    let elements: HtmlElement[] = [];
	let elementHistory: string[] = []; // Path of elements to the current element

	let i: number;
    let nesting = 0;
    let c: char = '';
    let nc: char =  '';
    let nnc: char =  '';

	function insertElement(elm: HtmlElement, nestingLevel: number) {
        if (nestingLevel === 0) {
            elements.push(elm);
        } else if (nestingLevel === 1) {
            let last = elements[elements.length - 1];
            last.children.push(elm);
        } else {
            let parent: HtmlElement | undefined = undefined;
            while(nestingLevel > 0) {
                parent = elements[elements.length - 1];
                if (parent.children.length > 0) {
                    parent = parent.children[parent.children.length - 1];
                }
                nestingLevel--;
            }
            if (parent !== undefined) parent.children.push(elm);
        }
    }


    // Parsing helper functions
    function getChars(ignoreWhitespace: boolean = true) {
        c = content[i];
		// Look ahead two characters
        nc = content[i+1];
        nnc = content[i+2];

        // Skip whitespace
        if (ignoreWhitespace && (c === ' ' || c === '\t' || c === '\n' || c === '\r')) next(1, true);
    }
    function next(n: number = 1, ignoreWhitespace: boolean = true) {
        i += n;
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
    function peekMatch(pattern: Patt | Pred | Pred1) {
        getChars();
		if (typeof pattern === 'string') {
			if (i + pattern.length > content.length) return false;
			for(let j = 0; j < pattern.length; j++) {
				if (content[i + j] !== pattern[j]) return false;
			}
		}
		else if (typeof pattern === 'function') {
			return pattern(content[i], content[i+1]);
		}
		else throw new Error('Invalid pattern type');
        return true;
    }


	for(i = 0; i < content.length; i++) {
		getChars();
		// Skip comments
		if (peekMatch('<!--')) {
			next(4);
			const comment = readUntil('-->');
			next(3);
            if (DEBUG) console.log(`Comment: '${comment.trim()}'`);
			rollback(1);
			continue;
		}
		// Check new tag
		if (peekMatch('<')) {
			next(1);
			// Check if it's a closing tag
			const closingTag = peekMatch('/');
			if (closingTag) next(1);

			// Read tag name
			const tagName = readWhile(not(tagNameEnd));

			// If it is a closing tag, pop the last element from the history and decrement nesting level
			if (closingTag) {
				// Parse the remaining closing tag character
				if (!peekMatch('>')) throw new Error('Invalid closing tag');

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
			while(peekMatch(isLetter)) {
				const attrName = readWhile(isAttributeName);
				let attrValue: string | undefined;
				if (peekMatch('=')) {
					next(1);
					// Check if attribute is a string
					if (stringQuotes.includes(c)) {
						const quote = c;
						next(1);
						attrValue = readUntil((s: char) => s === quote);
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
						if (element.id !== undefined) throw new Error('Duplicate id');
						// Check that id is valid
						if (attrValue === undefined) throw new Error('Invalid id');
						element.id = attrValue;
						break;
					case 'class':
						// Check that classes is not already set
						if (element.classes.length > 0) throw new Error(`Classes already set for element '${element.tag}'`);
						// Check that classes is valid
						if (attrValue === undefined) throw new Error('Invalid classes');
						element.classes = attrValue.trim().split(' ');
						break;
					default:
						element.attributes[attrName] = attrValue;
				}
			}

			// Skip !DOCTYPE
			if (tagName === '!DOCTYPE') continue;

			insertElement(element, nesting);

			// Check if it's a known self closing tag
			if (selfClosingTags.includes(tagName)) {
				if (DEBUG) console.log(`Self closing tag '${tagName}'`);
				// Skip any optional closing />
				if (peekMatch('/')) next(1);
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
        console.log(`Elements:`);
		function printElement(el: HtmlElement, indent: number) {
            const spaces = '  '.repeat(indent);
            if (el.tag === textTag) {
                console.log(`${spaces}  text: '${el.text?.trim()}'`);
                return;
            }
            console.log(`${spaces}${el.tag}`);
            if (el.id) console.log(`${spaces}  id: '${el.id}'`);
            if (el.classes.length > 0) console.log(`${spaces}  classes: ${el.classes.join(', ')}`);
            if (el.text) console.log(`${spaces}  text: '${el.text}'`);
            if (Object.entries(el.attributes).length > 0) {
                console.log(`${spaces}  attributes:`);
                for(const [name, value] of Object.entries(el.attributes)) {
					if (value === undefined) {
						console.log(`${spaces}    ${name}`);
					}
					else {
                    	console.log(`${spaces}    ${name}: '${value}'`);
					}
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
const isAlphanumeric = (c: char) => !!c && /[a-zA-Z0-9]/.test(c);
const isLetter: Pred = (c: char) => !!c && /[a-zA-Z]/.test(c);
const isDigit:  Pred = (c: char) => !!c && /[0-9]/.test(c);
const isNumber:  Pred = (c: char) => !!c && /[0-9]+(\.[0-9]+)?/.test(c);
const tagStart: Pred = (c: char) => c === '<';
const tagEnd: Pred = (c: char) => c === '>' || c === '/';
const tagNameEnd: Pred = (c: char) => c === ' ' || tagEnd(c);
const isAttributeName: Pred = (c: char) => isAlphanumeric(c) || c === '-' || c === '_';
const attributeValueEnd: Pred = (c: char) => c === ' ' || tagEnd(c);

// Combinatorical logic used for parsing function composing
const isOf: (...chars: char[]) => Pred = (...chars: char[]) => (c: char) => chars.includes(c);

function or(...funcs: Pred[]): Pred {
    return c => funcs.some(f => f(c));
}
function not(func: Pred | Pred1): Pred {
	return c => !func(c, undefined);
}


/*

  dP""b8  dP"Yb  8888b.  888888      dP""b8 888888 88b 88 888888 88""Yb    db    888888 88  dP"Yb  88b 88
 dP   `" dP   Yb  8I  Yb 88__       dP   `" 88__   88Yb88 88__   88__dP   dPYb     88   88 dP   Yb 88Yb88
 Yb      Yb   dP  8I  dY 88""       Yb  "88 88""   88 Y88 88""   88"Yb   dP__Yb    88   88 Yb   dP 88 Y88
  YboodP  YbodP  8888Y"  888888      YboodP 888888 88  Y8 888888 88  Yb dP""""Yb   88   88  YbodP  88  Y8

*/

function generateCTML(elements: HtmlElement[], indent = 0): string {
	let ctml = '';

	for(let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const spaces = '    '.repeat(indent);
        // If element is a text element, just print it
        if (element.tag === textTag) {
            ctml += `${spaces}${element.text}\n`;
            continue;
        }
        // Else, print the tag
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
 export function CompileHTML(source: string): string {
    const elements = parseContent(source);
    const ctml = generateCTML(elements);
    return ctml;
}


/**
 * Compile an HTML file into CTML
 * @param file The file to compile to CTML
 */
 export function CompileFile(filepath: string): string {
    const content = fs.readFileSync(filepath, 'utf8');
    const ctml = CompileHTML(content);

    return ctml;
}

// Script mode
if (require.main === module) {
    // Compile the CTML file
    const ctml = CompileFile(process.argv[2]);
    if (DEBUG) console.log("=== Generated CTML ===");
    console.log(ctml);
}