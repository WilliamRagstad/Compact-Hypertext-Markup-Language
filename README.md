![CTML Banner](https://socialify.git.ci/WilliamRagstad/Compact-Hypertext-Markup-Language/image?description=1&descriptionEditable=A%20dense%20form%20of%20HTML&font=Inter&logo=https%3A%2F%2Fgithub.com%2FWilliamRagstad%2FCompact-Hypertext-Markup-Language%2Fblob%2Fmain%2Fassets%2Fchtml-logo-color.png%3Fraw%3Dtrue&pattern=Brick%20Wall&theme=Light)

Are you tired of the endless whitespace, angle brackets and nesting. Would you like to write more compact and lighter HTML?
If so, ***Compact Hypertext Markup Language (CTML)*** is built for people just like you!

Minimize your project files by using a compact markup language, effectively reducing your code by about **30%**! 🎉

## Usage

### CLI
You can use cli tool to compile `.ctml` files into a direct translation or fully distributable `.html` files.
The tool will also support linting, formatting and much more.

## Examples

```dart
$Y: .Yellow                                          /* Variable Y referencing a class name */
form#t$Y?action='/validate'?method=POST              /* Optional quotes for single word strings */
/input?name=full_name?placeholder='Enter your name'  /* The number of / indicates nesting level */
/button?onSubmit=`alert("Submitting form...")`       /* Elements with the same nesting level are siblings */
/ /'Submit'                                          /* Child of form and child of button (last-last) */
div/h1/'This text is in the title'                   /* Raw text is denoted using quotes instead of a tagname*/
script/`
    console.log("Hello World!");
`
section/{
    h2/'This text is in the section'
    p/{
        span/{
            b/'This text'
        }
        ' is in the paragraph'
    }
}
```

Translates to the following HTML:
  
```html
<form id="t" class="Yellow" action="/validate" method="POST">
    <input name="full_name" placeholder="Enter your name" />
    <button onSubmit="alert(\"Submitting form...\")">
        Submit
    </button>
</form>
<div>
    <h1>
        This text is in the title
    </h1>
</div>
<script>
    console.log("Hello World!");
</script>
```

## Development

- Clone this `repo` to your local development environment
- Run the following commands to build and run the project:

```shell
# Clone
git clone https://github.com/WilliamRagstad/Compact-Hypertext-Markup-Language && cd $_

# Install deps
npm install

# Build project
npm run build

# Run example
npx ts-node .\src\ctml.ts .\examples\form.ctml
```

## Authors

- [WilliamRagstad](https://github.com/WilliamRagstad)

## License

- [MIT](https://wei.mit-license.org)
