"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
/**
 * Compile an input CTML file into HTML
 * @param file The file to compile to HTML
 */
function CompileCTML(filepath) {
    const filename = filepath.substring(filepath.lastIndexOf('\\') + 1);
    const filedir = filepath.substring(0, filepath.lastIndexOf('\\'));
    const filename_noext = filename.substring(0, filename.lastIndexOf('.'));
    const outfile = `${filedir}\\${filename_noext}.html`;
    console.log(`Compiling ${filename} to ${outfile}...`);
    let content = fs_1.default.readFileSync(filepath, 'utf8');
    let elements = [];
    let currentElement = {};
    let c, nc;
    let nesting = 0;
    for (let i = 0; i < content.length; i++) {
        c = content[i];
        nc = content[i + 1]; // Look ahead one character
        // Skip whitespace
        if (c === ' ' || c === '\t' || c === '\r')
            continue;
        // Skip comments
        if (c === '/' && nc === '*') {
            // Skip until end of comment
            while (content[i] !== '*' || content[i + 1] !== '/')
                i++;
            continue; // Make sure no character is missed
        }
        // If c is a forward slash, we're nesting an element
        if (c === '/')
            nesting++;
        // If c is alphabetical, it's a tag name
        if (c.match(/[a-zA-Z]/)) {
            // If we're in a tag, then we're in a new element
        }
    }
    return "";
}
exports.default = CompileCTML;
// Script mode
if (require.main === module) {
    // Compile the CTML file
    console.log(CompileCTML(process.argv[2]));
}
