const crypto = require('crypto');

// Generates cache busting filename hash
const generateHash = () => crypto.createHash('md5').update(new Date().toLocaleTimeString()).digest('hex');

const bundleResults = (compilation, filename, symbols) => compilation.assets[filename] = {
  source: () => `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${symbols}</svg>`,
  size: () => symbols.length
};

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

// Source symbol cleaning helper
const cleanSymbolContents = (contents, name, option) => {
  contents = contents.replace(/<svg/g, `<symbol id="${option.prefix}-${name}"`);
  contents = contents.replace(/<\/svg>/g, '</symbol>');
  contents = contents.replace('xmlns="http://www.w3.org/2000/svg"', '');
  contents = contents.replace(/<style>(.*)<\/style>/g, '<style><![CDATA[$1]]></style>');

  return contents;
};

class WebpackSvgSpritely {
  constructor(options) {
    options = options || {};
    this.outputOptions;
    this.options = {
      xhr: (typeof options.xhr === 'undefined') ? true : options.xhr,
      prefix: (options.prefix) ? options.prefix : 'icon',
      output: (options.output) ? options.output : '',
      filename: (options.filename) ? options.filename.replace(/\[hash\]/g, generateHash()) : `svgset-${generateHash()}.svg`,
      xhrEntry: (options.xhrEntry) ? options.xhrEntry : false
    };

    this.options.xhrPath = (options.xhrPath) ? `${options.xhrPath}/${this.options.filename}` : `${this.options.output}/${this.options.filename}`;
    this.icons = [];
    this.symbols;
  }

  apply(compiler) {
    compiler.hooks.emit.tap('WebpackSvgSpritely', (compilation, callback) => {
      this.symbols = '';

      // Grab a collection of icons based on filters option
      this.icons = Object.keys(compilation.modules).map(j => {
        const path = compilation.modules[j].resource;
        if (!path) { return; }
        if (path.indexOf('.svg') !== -1) {
          let name = path.replace(/\\/g, '/');
          const parts = name.split('/');
          name = parts[parts.length - 1];
          name = name.split('.')[0];

          return {
            name,
            path
          };
        }
      }).filter((n) => n);

      // Use found icons above to collect svg into symbols
      this.symbols = Object.keys(compilation.assets).map(i => {
        // Convert raw svg source into symbols for sprite
        let collection = '';
        Object.keys(this.icons).map(k => {
          if (i.indexOf('.svg') === -1) { return; } // only intrested in svg assets
          if (getAssetName(i) === this.icons[k].name) {
            if (!compilation.assets[i]._value) { return; }
            let contents = cleanSymbolContents(compilation.assets[i]._value.toString('utf8'), getAssetName(i), this.options);
            if (!contents) { return; }
            collection += contents;
          }
        }).filter((n) => n);

        return collection;
      }).filter((n) => n);

      bundleResults(
        compilation,
        `${this.options.output}/${this.options.filename}`,
        this.symbols
      );

      // Inject XHR request for iconset-*.svg into assets.js for pageload

      if (this.options.xhr) {
        // get entry file from complation
        const getEntryFile = (entries) => {
          let entry;
          Object.keys(entries).map((i, key) => {
            if (key === 0) {
              entry = i;
            }
          });

          return entry;
        };

        // loop over assets in search for an entry file to inject XHR code into
        const entryFile = (this.options.xhrEntry) ? this.options.xhrEntry : getEntryFile(compilation.compiler.options.entry);
        if (compilation.compiler.options.entry[entryFile]) {
          Object.keys(compilation.assets).map((i) => {

            if (i.indexOf(entryFile) !== -1) {
              let XHRTemplate =`
                var WP_SVG_XHR = new XMLHttpRequest();
                WP_SVG_XHR.open(
                  'GET',
                  '${this.options.xhrPath}',
                  true
                );

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
              `.replace(/(\r\n|\n|\r)/gm, '')
                .replace(/ /g, '')
                .replace(/var/g, 'var ')
                .replace(/new/g, 'new ')
                .trim();

              if (!compilation.compiler.options.optimization.minimize) {

              }

              if (compilation.compiler.options.optimization.minimize) {
                compilation.assets[i]._value += XHRTemplate;
              } else {
                compilation.assets[i]._source.children.push(`\n\n/* WebpackSVGSpritely XHR code\nBy: Devin R. Olsen\nhttps://github.com/drolsen/webpack-svg-spritely */\n`);              
                compilation.assets[i]._source.children.push(XHRTemplate);
              }              
            }
          });
        } else {
          console.warn('\x1b[33mWebpack SVG Spritely has been configured with an unknown custom xhrEntry value.\nXHR code can\'t be injected into an unknown entry files.\nPlease make sure to specify the key name of entry file, not path or filename.*\x1b[37m');
        }
      }
    });
  }
}

module.exports = WebpackSvgSpritely;