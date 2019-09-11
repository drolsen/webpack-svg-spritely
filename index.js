const crypto = require('crypto');

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

// Generates cache busting filename hash
const generateHash = () => crypto.createHash('md5').update(new Date().toLocaleTimeString()).digest('hex');

// Template cleaning helper
const cleanTemplateLiteral = (literal) => literal.replace(/(\r\n|\n|\r)/gm , ' ').replace(/\s+/g, ' ').trim();

// Wraps collected symbols into a svg parent tag
const makeSymbols = (symbols) => cleanTemplateLiteral(`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style="position:absolute; width: 0; height: 0"
  >
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
    this.noDuplicates = [];  // used within duplicate symbol prevention
    this.symbols = [];       // holds a collection of our converted symbols from svg assets
    this.entryPath;

    // plugin options
    this.options = {
      insert: (options.insert) ? options.insert : 'xhr',
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
    this.entryPath = getEntryFilePath(compiler.options.entry, this.options.entry);
    // This plugin requires two passes
    compiler.hooks.compilation.tap('WebpackSvgSpritely', (compilation) => {
      // Grabbing SVG source at the most earliest point possible to create `this.symbols` with.
      compilation.hooks.moduleAsset.tap('WebpackSvgSpritely', (module, filename) => {
        if (filename.indexOf('.svg') === -1) { return false; }              // svg files only please
        const asset = module.buildInfo.assets;

        Object.keys(asset).map((i) => {
          if (this.noDuplicates.indexOf(i) === -1) {
            this.symbols.push(
              cleanSymbolContents(
                asset[i]._value.toString('utf8'),
                getAssetName(i),
                this.options.prefix
              )
            );

            this.noDuplicates.push(i);
          }
        });
      });

      // Adds a [flag] hook for potential code inject during emit tap below
      compilation.hooks.optimizeModules.tap('WebpackSvgSpritely', (modules) => {
        Object.keys(modules).map((i) => {
          if (modules[i].rawRequest === this.entryPath) {
            let template;

            // Inject XHR request (note has no flag find/replace need like bundle below has)
            if (this.options.insert === 'xhr') {
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
            if (this.options.insert === 'bundle') {
              template = cleanTemplateLiteral(`
                var WP_SVG_DIV = document.createElement('div');
                WP_SVG_DIV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">__WP_SVG_SPRITELY_SYMBOLS__</svg>';
                document.body.insertBefore(WP_SVG_DIV, document.body.childNodes[0]);
              `);
            }

            try {
              modules[i]._source._value = `${modules[i]._source._value.toString()}\n ${template}`;
            } catch (e) { }
          }
        });
      });
    });

    // Finally we add sprite file into the build's assets and inject code over [flag] hook
    compiler.hooks.emit.tap('WebpackSvgSpritely', (compilation) => {
      // Insert.xhr & Insert.none
      if (['xhr', 'none'].indexOf(this.options.insert) !== -1) {
        writeSpriteToDisk(
          compilation,
          `.${this.options.output}/${this.options.filename}`,
          this.symbols
        );
      }

      // Insert.bundle
      if (['bundle', 'document'].indexOf(this.options.insert) !== -1) {
        Object.keys(compilation.assets).map((i) => {
          if (this.options.insert === 'bundle') {
            if (!compilation.assets[i].source()) { return false; }
            let source = compilation.assets[i].source();
            if (source.indexOf('__WP_SVG_SPRITELY_SYMBOLS__') !== -1) {
              source = source.replace('__WP_SVG_SPRITELY_SYMBOLS__', this.symbols.join('').replace(/(\r\n|\n|\r)/gm, ''));
              compilation.assets[i] = {
                source: function () {
                  return source;
                },
                size: function () {
                  return source.length;
                }
              }
            }
          }

          // Insert.document
          if (this.options.insert === 'document') {
            let HTML = compilation.assets[i].source().toString();
            HTML = HTML.replace(
              /<body>([\s\S]*?)<\/body>/,
              `<body>\n<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${this.symbols.join('')}</svg>\n$1</body>`);

            if (this.options.entry) {
              if (i.indexOf(this.options.entry) !== -1) {
                compilation.assets[i].source = () => Buffer.from(HTML, 'utf8');
              }
            } else {
              compilation.assets[i].source = () => Buffer.from(HTML, 'utf8');
            }
          }
        });
      }
    });
  }
}

module.exports = WebpackSvgSpritely;
