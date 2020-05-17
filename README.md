## rollup-plugin-lgcjs
A rollup plugin for importing [.xlgc](http://www.matteoporopat.com/librogame/) gamebook files and much more.

Edit files from a live session of [Lgcjs web editor](https://librogamesland.github.io/lgcjs/release/), using your favourite browser, import and transpile them on the fly, everything out of the box!

Works by binding rollup to chrome devtools - more below.

## Getting started
Install with:
```bash
npm install --save-dev rollup-plugin-lgcjs
```

And add to your `rollup.config.js`:
```js
import lgcjs from 'rollup-plugin-lgcjs'

export default {
  /* Rollup configs, input, output, ... */
  plugins: [
    lgcjs({
      // Add Lgcjs options here
    })
  ]
}
```
Now you can `import book  from 'book.xlgc'`, rollup-plugin-lgcjs will search for a `book.xlgc` on your package.json folder and transpile it as pure javascript.

## Open Lgcjs web editor on watch
The greatest feature about `rollup-plugin-lgcjs` is that it lets you connect your code with a live session of lgcjs web editor.
Open chrome (or any other [compliant browser](https://github.com/cyrus-and/chrome-remote-interface#implementations)) with devtools enabled:
```bash
google-chrome --remote-debugging-port=9222
```
And launch `rollup -c -w`

Done! Now you can edit your gamebook inside Lgcjs and save them on disk (ctrl+S). Every time the file is saved rollup would transpile it again.

## Plugin options
Here every avaible option with default values:
```javascript
lgcjs({
  // Chrome options
  open: true,          // False disable connections
  newPage: false,      // True always open a new tab

  // Urls (browser devtools, lgcjs web editor url and app url)
  browserURL: "http://localhost:9222",
  lgcjsURL: "https://librogamesland.github.io/lgcjs/release/",
  /* If you are watching node, you are probably
  serving a preview of your gamebook app on localhost
  set the url here to embed it on lgcjs as iframe */
  appURL: '',


  // Book parsing options
  bookpath: path.join(process.cwd(), "book.xlgc"),
  encoder: 'vuejs', // see formats below


})

```
## Formats
.xlgc parsing is done with in two steps:
- the xlgc xml is parsed to a javascript friendly json format called jlgc (the same format used by Lgcjs editor internally)
- the jlgc file is transpiled and optimized, tags and special sequences (such as `{link number:@T}`) are resolved and compiled to html tags ahead of time.

Default encoder is the `vuejs` one, it replace every code with a [Vue.js](https://vuejs.org/) tag, so it's easy to render your gamebook chapters as vue components. An example is provided below. Use `json` to avoid vuejs encoding and import raw `jlgc` format.

You can create your own jlgc parser too - just pass a function as `encoder` param:
```javascript
lgcjs({
  encoder: book => {
    console.log(book.info)
    return 'export default ' + JSON.stringify(book)
  }
})
```

## jlgc and Vuejs encoded examples
jlgc `encode: 'json'`
```javascript
// book structure
export default {
  "info": {
    "title": "Esempio",
    "author": "Luca Fabbian",
    "map": "/path/to/map.jpg"
  },
  "entities": {
    "1": {
      "title": "Paragrafo 1",
      "flags": ["fixed", "death", "final"],
      "data": "<p> {link 2:@T} o {link intro:Introduzione}</p>"
    },
    "2": {
      "map":
      "group": "esempio",
      "data": "<p></p>"
    },
    "intro": {
      "type" : "section",
      "title": "Introduzione",
      "data": "<p>Vai al {link 1:@T}"
    }
  },
}
```

vuejs `encode: 'vuejs'`
```javascript

```
