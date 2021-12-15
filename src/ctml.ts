import fs from 'fs';

type Pred = (c: string) => boolean;
type Patt = string;
const isPred = (val: any) => typeof val === 'function';
const isPatt = (val: any) => typeof val === 'string';

const DEBUG = true;
/**
 * Compile an input CTML file into HTML
 * @param file The file to compile to HTML
 */
export default function CompileCTML(filepath: string): string {
    const filename = filepath.substring(filepath.lastIndexOf('\\')+1);
    const filedir = filepath.substring(0, filepath.lastIndexOf('\\'));
    const filename_noext = filename.substring(0, filename.lastIndexOf('.'));
    const outfile = `${filedir}\\${filename_noext}.html`;
    console.log(`Compiling ${filename} to ${outfile}...`);
    
    let content = fs.readFileSync(filepath, 'utf8');
    let elements = [];
    let variables = {};
    
    let c: string = '';
    let nc: string =  '';
    let nesting = 0;
    const cl = content.length;
    let i: number;

    // Parsing helper functions
    function getChars() {
        c = content[i];
        nc = content[i+1]; // Look ahead one character
        
        // Skip whitespace
        if (c === ' ' || c === '\t' || c === '\r') {
            i++;
            getChars();
        }
    }
    function skip(n: number) {
        i += n;
    }
    function next(n: number = 1) {
        skip(n);
        getChars();
    }
    function readUntil(pattern: Patt | Pred) {
        let read = '';
        let match: boolean;
        while(i < cl) {
            if (pattern instanceof String) {
                match = true;
                for(let j = 0; j < pattern.length && i + j < cl; j++) {
                    if(content[i + j] != pattern[j]) {
                        match = false;
                        break;
                    }
                }
            }
            else if (pattern instanceof Function) {
                match = pattern(content[i]);
            }
            else throw new Error('Invalid pattern type');
            
            if(match) break;
            read += content[i++];
        }
        i++; // Skip the last character in the pattern
        return read;
    }
    function readWhile(predicate: Pred) {
        let read = '';
        while(i < cl && predicate(content[i])) read += content[i++];
        return read;
    }

    for (i = 0; i < cl; i++) {
        getChars();
        // Skip comments
        if (c === '/' && nc === '*') {
            skip(2);
            const comment = readUntil('*/');
            if (DEBUG) console.log(`Comment: '${comment.trim()}'`);
            continue; // Make sure no character is missed
        }
        // Parse variable/macro definitions
        if (c === '$') {
            // Parse name

        }
        // If c is a forward slash, we're nesting an element
        if (c === '/') nesting++;
        // If c is alphabetical, it's a tag name
        if (isLetter(c)) {
            // New element starts
            const name = readWhile(or(isLetter, isDigit));

            // Check for declaration
            getChars();
            if (c == ':') {
                // Define a new variable, read value
                next();
                const value = readUntil(or(
                    c => c === ';',
                    c => c === '\n'
                    ));
                
            }

            elements.push({});
        }
    }

    return "";
}

// Identification helping functions
const isLetter: Pred = (c: string) => c.match(/[a-zA-Z]/) != null;
const isDigit:  Pred = (c: string) => c.match(/[0-9]/) != null;

// Combinatorical logic used for parsing function composing
function or(...funcs: ((c: string) => boolean)[]): Pred {
    return c => funcs.some(f => f(c));
}

// Script mode
if (require.main === module) {
    // Compile the CTML file
    console.log(CompileCTML(process.argv[2]));
}