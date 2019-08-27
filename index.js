const crypto = require('crypto');

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

// Generates cache busting filename hash
const generateHash = () => crypto.createHash('md5').update(new Date().toLocaleTimeString()).digest('hex');

// Template cleaning helper
const cleanTemplateLiteral = (literal) => literal.replace(/(\r\n|\n|\r)/gm , ' ').replace(/\s+/g, ' ').trim();

// Wraps collected symbols into a svg parent tag
const makeSymbols = (symbols) => cleanTemplateLiteral(`
  <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">
    ${symbols.join('')}
  </svg>
`);

// Floats sprite file created from webpack svg spritely, into the current build
const writeSpriteToDisk = (compilation, filename, symbols) => compilation.assets[filename] = {
  source: () => makeSymbols(symbols),
  size: () => symbols.length
};

// Source symbol cleaning helper
const cleanSymbolContents = (contents, name, prefix) => contents
  .replace(/<svg/g, `<symbol id="${prefix}-${name}"`)
  .replace(/<\/svg>/g, '</symbol>')
  .replace('xmlns="http://www.w3.org/2000/svg"', '')
  .replace(/<style>(.*)<\/style>/g, '<style><![CDATA[$1]]></style>');

// Resolves a entry file path whether one is specified in configuration, or not.
const getEntryFilePath = (entries, entry) => {
  let path;

  // when we only have one entry file
  if (typeof entries === 'string') {
    path = entries;
  }

  // when we have multile entry files
  if (typeof entries === 'object') {
    path = (entries[entry])
      ? entries[entry]
      : entries[Object.keys(entries)[0]];
  }

  return path;
};

class WebpackSvgSpritely {
  constructor(options) {
    options = options || {};
    this.symbols = [];       // holds a collection of our converted symbols from svg assets
    this.passes = 0;

    // plugin options
    this.options = {
      xhr: (typeof options.xhr === 'undefined') ? true : options.xhr,
      prefix: (options.prefix) ? options.prefix : 'icon',
      output: (options.output) ? options.output : '',
      filename: (options.filename)
        ? options.filename.replace(/\[hash\]/g, generateHash())
        : `iconset-${generateHash()}.svg`,
      entry: (options.entry) ? options.entry : false
    };

    this.options.url = (options.url)
      ? `${options.url}/${this.options.filename}`
      : `${this.options.output}/${this.options.filename}`;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('WebpackSvgSpritely', (compilation) => {
      // FIRST PASS (collects svg symbols)
      if (this.passes === 0) {
        compilation.hooks.moduleAsset.tap('WebpackSvgSpritely', (module, filename) => {
          if (filename.indexOf('.svg') !== -1) {
            const asset = module.buildInfo.assets;
            this.symbols.push(
              Object.keys(asset).map((i) => 
                cleanSymbolContents(
                  asset[i]._value.toString('utf8'),
                  getAssetName(filename),
                  this.options.prefix
                )
              )
            );
          }
        });
      }

      // SECOND PASS (injects XHR or Symtols into entry js)
      if (this.passes === 1) {
        compilation.hooks.optimizeModules.tap('WebpackSvgSpritely', (modules) => {
          Object.keys(modules).map((i) => {
            if (modules[i].rawRequest === getEntryFilePath(compiler.options.entry, this.options.entry)) {
              let template;

              // Inject XHR request
              if (this.options.xhr === true) {
                template = cleanTemplateLiteral(`
                  var WP_SVG_XHR = new XMLHttpRequest();
                  WP_SVG_XHR.open('GET', '${this.options.url}', true);

                  WP_SVG_XHR.onprogress = () => {};
                  WP_SVG_XHR.onload = () => {
                    if (!WP_SVG_XHR.responseText || WP_SVG_XHR.responseText.substr(0, 4) !== '<svg') {
                      throw Error('Invalid SVG Response');
                    }
                    if (WP_SVG_XHR.status < 200 || WP_SVG_XHR.status >= 300) {
                      return;
                    }
                    var div = document.createElement('div');
                    div.innerHTML = WP_SVG_XHR.responseText;
                    document.body.insertBefore(div, document.body.childNodes[0]);
                  };
                  WP_SVG_XHR.send();
                `);
              }

              // Inject SVG Symbols
              if (this.options.xhr === false){
                template = cleanTemplateLiteral(`
                  var WP_SVG_DIV = document.createElement('div');
                  WP_SVG_DIV.innerHTML = \`${makeSymbols(this.symbols)}\`;
                  document.body.insertBefore(WP_SVG_DIV, document.body.childNodes[0]);
                `);
              }

              // Try/catch required (we never want to break builds)
              try {
                modules[i]._source._value = `${modules[i]._source._value.toString()}\n ${template}`;
              } catch (e) {}              
            }
          });
        });
      }

      // Prevents passes beyond just the needed two
      compilation.hooks.needAdditionalPass.tap('WebpackSvgSpritely', () => {
        if (!this.passes) {
          this.passes = 1;
          return true;
        }
      });      
    });


    // Writes sprite file to disk
    compiler.hooks.emit.tap('WebpackSvgSpritely', (compilation, callback) => {
      if (this.options.xhr !== false) {
        writeSpriteToDisk(
          compilation,
          `${this.options.output}/${this.options.filename}`,
          this.symbols
        );
      }      
    });
  }
}

module.exports = WebpackSvgSpritely;
