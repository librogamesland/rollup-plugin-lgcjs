const fsPromises = require('fs').promises
const path       = require('path')
const esm        = require('esm')(module)

// Import decoder/encoders
const decode   = esm('./js/xlgcParser.js').decode
const vuejs    = esm('./js/vuejs.js').default

const encoders = {
  'vuejs': vuejs,
  'json': data => 'export default ' + JSON.stringify(data),
}

/* Launch browser and
expose functions */
async function launchLgcjs(options) {
    const puppeteer = require('puppeteer-core');
    let browser = null
    try{
      browser = await puppeteer.connect({
        browserURL: options.browserURL,
        defaultViewport: null,
      });
    }catch(e){
      console.log("Can't connect to " + options.browserURL)
      return
    }
    const page = options.newPage ? (await browser.newPage()) : (await browser.pages())[0];

    await page.exposeFunction('__lgcdevVersion', version => {
      console.log("Connected to lgcjs v-" + version)
      return "0.1"
    });

    await page.exposeFunction('__lgcdevAppURL', () => options.appURL );

    await page.exposeFunction('__lgcdevReadBook', () => {
      return fsPromises.readFile(options.bookpath, 'utf8')
    });

    await page.exposeFunction('__lgcdevWriteBook', (text) => {
      fsPromises.writeFile(options.bookpath, text)
    });

    await page.goto(options.lgcjsURL);
}


/* Rollup plugin */
module.exports =  function lgcjs (rawOptions) {

  const options = {
    open: true,
    newPage: false,
    encoder: 'vuejs',

    // Urls
    browserURL: "http://localhost:9222",
    lgcjsURL: "https://librogamesland.github.io/lgcjs/release/",
    appURL: '',

    // Paths
    bookpath: path.join(process.cwd(), "book.xlgc"),
    ...rawOptions,
  }
  console.log(options)
  // Start browser bridge
  if(options.open && process.env.ROLLUP_WATCH) launchLgcjs(options)

  // Find encoder
  const defaultEncoder = typeof options.encoder === 'string'
                            ? encoders[options.encoder]
                            : options.encoder

  return {
    name: 'rollup-plugin-lgcjs',

    // Add book.xlgc to watch path
    buildStart(){ this.addWatchFile(options.bookpath) },

    // Resolve just "book.xlgc" name
    resolveId ( source ) { return source === 'book.xlgc' ? source : null;  },
    async load ( id ) {
      if (id === 'book.xlgc') {
        // the source code for "virtual-module"
        return defaultEncoder(decode(await fsPromises.readFile(options.bookpath, 'utf8')));
      }
      return null; // other ids should be handled as usually
    }
  };
}
