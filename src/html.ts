import fs, { stat } from 'fs';


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
    tag: string;
    id: string | undefined;
    classes: string[] = [];
    attributes: Record<string, string> = { };
    children: HtmlElement[] = [];
    text: string | undefined;

    constructor(tag: string, id?: string, classes?: string[], attributes?: Record<string, string>, children?: Element[]) {
        this.tag = tag;
        this.id = id;
        this.classes = classes || [];
        this.attributes = attributes || { };
        this.children = children || [];
    }
}
const textTag = 'RAW_TEXT';


/*

 88""Yb    db    88""Yb .dP"Y8 88 88b 88  dP""b8
 88__dP   dPYb   88__dP `Ybo." 88 88Yb88 dP   `"
 88"""   dP__Yb  88"Yb  o.`Y8b 88 88 Y88 Yb  "88
 88     dP""""Yb 88  Yb 8bodP' 88 88  Y8  YboodP

*/

function parseContent(content: string): HtmlElement[] {
    let elements: HtmlElement[] = [];

	return elements;
}

/*

  dP""b8  dP"Yb  8888b.  888888      dP""b8 888888 88b 88 888888 88""Yb    db    888888 88  dP"Yb  88b 88
 dP   `" dP   Yb  8I  Yb 88__       dP   `" 88__   88Yb88 88__   88__dP   dPYb     88   88 dP   Yb 88Yb88
 Yb      Yb   dP  8I  dY 88""       Yb  "88 88""   88 Y88 88""   88"Yb   dP__Yb    88   88 Yb   dP 88 Y88
  YboodP  YbodP  8888Y"  888888      YboodP 888888 88  Y8 888888 88  Yb dP""""Yb   88   88  YbodP  88  Y8

*/

function generateCTML(elements: HtmlElement[], indent = 0): string {

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
    const html = generateCTML(elements);
    return html;
}


/**
 * Compile an HTML file into CTML
 * @param file The file to compile to CTML
 */
 export function CompileFile(filepath: string): string {
    const content = fs.readFileSync(filepath, 'utf8');
    const html = CompileHTML(content);

    return html;
}

// Script mode
if (require.main === module) {
    // Compile the CTML file
    const html = CompileFile(process.argv[2]);
    if (DEBUG) console.log("=== Generated HTML ===");
    console.log(html);
}