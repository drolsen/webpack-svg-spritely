const crypto = require('crypto');

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

// Extension helper
const getExtension = (path) => path.split('.')[path.split('.').length - 1];

// Entry helper
const getEntryFile = (chunks, entries, requestEntry = false) => {
  let entry = {};

  const parseFiles = (files, name) => {
    Object.keys(files).map((i) => {
      // if requesting specific entry file
      if (requestEntry && files[i].indexOf(requestEntry) !== -1) {
        entry = {
          name: name,
          filename: getAssetName(files[i]),
          extension: getExtension(files[i]),
          path: files[i]
        };
      }

      // first found js entry file if none is specified
      if (!requestEntry && files[i].indexOf('.js') !== -1 && !entry.name) {
        entry = {
          name: name,
          filename: getAssetName(files[i]),
          extension: getExtension(files[i]),
          path: files[i]
        };
      }
    });
  };

  // Parse our chunk's files for an entry
  Object.keys(chunks).map((i) => parseFiles(chunks[i].files, chunks[i].name));

  // Warn developers about unfound entries (corner cases catch)
  if (!entry.name) {
    console.error(`\n\x1b[31mWarning: Webpack SVG Spritely can't find a "${requestEntry}.js" entry file.\nPlease check your Webpack SVG Spritely configuration and try again.\x1b[37m\n`);
  }

  // if entry option is configured, use it over our first entry from webpack config
  return entry;
};

// Generates cache busting filename hash
const generateHash = () => crypto.createHash('md5').update(new Date().toLocaleTimeString()).digest('hex');

// Floats sprite file created from webpack svg spritely, into the current build
const writeSpriteToDisk = (compilation, filename, symbols) => compilation.assets[filename] = {
  source: () => `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${symbols}</svg>`,
  size: () => symbols.length
};

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
    this.ext;           // holds the file extension of our main webpack output config
    this.entry;         // holds the record of our found entry file we inject code into
    this.icons;         // holds a collection of our found svg files
    this.symbols;       // holds a collection of our converted symbols from this.icons

    // plugin options
    this.options = {
      xhr: (typeof options.xhr === 'undefined') ? true : options.xhr,
      prefix: (options.prefix) ? options.prefix : 'icon',
      output: (options.output) ? options.output : '',
      filename: (options.filename) ? options.filename.replace(/\[hash\]/g, generateHash()) : `iconset-${generateHash()}.svg`,
      entry: (options.entry) ? options.entry : false
    };

    this.options.url = (options.url)
      ? `${options.url}/${this.options.filename}`
      : `${this.options.output}/${this.options.filename}`;
  }

  apply(compiler) {
    // At the point of emitting our bundle, lets hook into the build and perform plugin logic
    compiler.hooks.emit.tap('WebpackSvgSpritely', (compilation, callback) => {
      // Hoist main webpack output config's file extension for logic below
      this.ext = getExtension(compilation.compiler.options.output.filename);

      // Grab a collection of icons based on filters option
      this.icons = Object.keys(compilation.modules).map(j => {
        const path = compilation.modules[j].resource;
        if (!path) { return; }
        if (path.indexOf('.svg') !== -1) {
          let name = path.replace(/\\/g, '/');
          const parts = name.split('/');
          name = parts[parts.length - 1];
          name = name.split('.')[0];

          return { name, path };
        }
      }).filter((n) => n);

      // Use found icons above to collect svg into symbols
      this.symbols = Object.keys(compilation.assets).map(i => {
        // Convert raw svg source into symbols for sprite
        let collection = '';
        Object.keys(this.icons).map(k => {
          // only intrested in svg assets
          if (i.indexOf('.svg') === -1) { return; }
          // only intrested in assets that equals one of our collected icons
          if (getAssetName(i) === this.icons[k].name) {
            // only intrested in assets that have _value
            if (!compilation.assets[i]._value) { return; }

            // clean symbols and prefixes their names
            let contents = cleanSymbolContents(
              compilation.assets[i]._value.toString('utf8'),
              getAssetName(i),
              this.options
            );

            // if contents is still undefined (stop EVERYTHING!)
            if (!contents) { return; }
            // if contents is defined, add it to the collection
            collection += contents;
          }
        }).filter((n) => n);

        // once done looping, lets return our collection
        return collection;
      }).filter((n) => n); // removes empty records from this.icons

      // Get a entry file
      this.entry = getEntryFile(compilation.chunks, compilation.compiler.options.entry, this.options.entry);

      // Determin if build is minified or not
      const bundleIsMinified = compilation.compiler.options.optimization.minimize;

      // Inject XHR request for svg sprite
      if (this.options.xhr === true) {
        // loop over entry files and update source
        Object.keys(compilation.assets).map((i) => {
          if (i === this.entry.path) {
            // Build XHR source code
            let XHRTemplate =`
              var WP_SVG_XHR = new XMLHttpRequest();
              WP_SVG_XHR.open(
                'GET',
                '${this.options.url}',
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

            // Determin how XHR source code should be injected based on minification settings in webpack config
            if (bundleIsMinified) {
              // When bundle is configured to be minified
              compilation.assets[i]._value += XHRTemplate;
            } else {
              // When bundle is configured to not be minified
              compilation.assets[i]._source.children.push(`\n\n/* WebpackSVGSpritely XHR code\nBy: Devin R. Olsen\nhttps://github.com/drolsen/webpack-svg-spritely */\n${XHRTemplate}`);
            }
          }
        });
      }

      // Inject svg sprite contents into bundle as module
      if (this.options.xhr === false){
        Object.keys(compilation.assets).map((i) => {
          if (i === this.entry.path) {
            let ModuleTemplate = `var div = document.createElement('div');\ndiv.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${this.symbols.join('')}</svg>\`;\ndocument.body.insertBefore(div, document.body.childNodes[0]);`;

            // Determin how sprite source should be injected based on minification settings in webpack config
            if (bundleIsMinified) {
              // When bundle is configured to be minified
              compilation.assets[i]._value += ModuleTemplate;
            } else {
              // When bundle is configured to not be minified
              compilation.assets[i]._source.children.push(`\n\n/* WebpackSVGSpritely XHR code\nBy: Devin R. Olsen\nhttps://github.com/drolsen/webpack-svg-spritely */\n${ModuleTemplate}`);
            }
          }
        });
      }

      // Writes sprite file to disk
      if (
        this.options.xhr === true
        || this.options.xhr === 'other'
      ) {
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
