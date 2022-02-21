const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

// Generates cache busting filename hash
const generateHash = (source) => crypto.createHash('md5').update(JSON.stringify(source)).digest('hex');

// Template cleaning helper
const cleanTemplateLiteral = (literal) => literal.replace(/(\r\n|\n|\r)/gm , ' ').replace(/\s+/g, ' ').trim();

// Wraps collected symbols into a svg parent tag
const makeSymbols = (symbols) => cleanTemplateLiteral(`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    style="position:absolute; width: 0; height: 0"
  >
    ${symbols.filter((n) => n).filter((item, index) => symbols.indexOf(item) === index).join('')}
  </svg>
`);

// Floats sprite file created from webpack svg spritely, into the current build
const writeSpriteToDisk = (compilation, filename, source, size) => compilation.assets[filename] = {
  source: () => source,
  size: () => size
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

// Generates manifest JSON from provided page and name

const generateManifest = (options, data, compiler) => {
  if (!options.path) {
    console.error('\x1b[31mError WebpackSvgSpritely: You have configured to generate a icon manifest.json file, but not provided a path to where it should be written yet.\u001b[0m\r\n');
    return false;
  }
  const outputPath = path.resolve(`${compiler.options.output.path}/${options.path}`);

  /* Step one is to exclude any configured icons */
  if (options.filterOut) {
    Object.keys(options.filterOut).map((i) => {
      Object.keys(data).map((j) => {
        if (data[j].name.match(options.filterOut[i])) {
          delete data[j];
        }
      });
    });
  }

  /* Step two, if we have a groupBy option, we will group then write*/
  if (options.groupBy) {
    const groups = [];
    Object.keys(options.groupBy).map((i) => {
      const groupFilter = options.groupBy[i];
      groups[groupFilter] = [];
      Object.keys(data).map((j) => {
        if (data[j].name.match(groupFilter)) {
          groups[groupFilter].push(data[j]);
          delete data[j];
        }
      });
    });

    fs.writeFile(
      outputPath,
      JSON.stringify({icons: data.filter((n) => n), ...groups}),
      (err) => {
        if(err) {
          console.log(err);
        }
      }
    );

    return false;
  }

  /* Step three, we have a simple configuration so we will write */
  fs.writeFile(
    outputPath,
    JSON.stringify(data.filter((n) => n).filter((item, index) => data.indexOf(item) === index)),
    (err) => {
      if(err) {
        console.log(err);
      }
    }
  );
}

class WebpackSvgSpritely {
  constructor(options) {
    options = options || {};
    this.name = 'WebpackSvgSpritely';
    this.noDuplicates = [];  // used within duplicate symbol prevention
    this.symbols = [];       // holds a collection of our converted symbols from svg assets
    this.manifest = [];      // holds a collection of our icon's meta data into json object
    this.svgSource = '';
    this.entryPath;

    // plugin options
    this.options = {
      insert: (options.insert) ? options.insert : 'xhr',
      prefix: (options.prefix) ? options.prefix : 'icon',
      output: (options.output) ? options.output : '',
      entry: (options.entry) ? options.entry : false,
      manifest: (options.manifest) ? options.manifest : false,
      filename: (options.filename) ? options.filename : '',
      url: (options.url) ? options.url : ''
    };

  }

  apply(compiler) {
    this.entryPath = getEntryFilePath(compiler.options.entry, this.options.entry);

    compiler.hooks.compilation.tap(this.name, (compilation) => {

      // Grabbing SVG source at the most earliest point possible to create `this.symbols` with.
      compilation.hooks.optimize.tap(this.name, () => {
        Object.keys(compilation.modules).map((i) => {
          const module = compilation.modules[i];
          if (module.buildInfo.assets) {
            Object.keys(module.buildInfo.assets).map((assetName) => {
              const filename = compilation.getPath(assetName);
              if (filename.indexOf('.svg') !== -1) { // svg files only please
                const asset = module.buildInfo.assets[assetName];
                const contents = asset._value.toString('utf8');
                // no files missing <svg tag
                // no files that are font svg files
                if (contents.indexOf('<svg') !== -1
                    && contents.indexOf('<font') === -1
                    && contents.indexOf('<font') === -1
                    && contents.indexOf('<glyph') === -1
                ) {
                  if (!this.noDuplicates[assetName]) {
                    const name = getAssetName(filename);
                    this.symbols.push({
                      name, source: cleanSymbolContents(
                        contents,
                        name,
                        this.options.prefix
                      )
                    });

                    if (!this.manifest.some((n) => n.name === name)) {
                      this.manifest.push({
                        name, source: `${contents}`
                      })
                    }

                    this.noDuplicates.push(assetName);
                  }
                }
              }
            });
          }
        });
      });

      const gatherResults = () => {
        this.symbols.sort((a,b) => a.name.localeCompare(b.name));
        this.manifest.sort((a,b) => a.name.localeCompare(b.name));
        this.svgSource = makeSymbols(this.symbols.map(s => s.source));
        this.options.filename = (this.options.filename)
            ? this.options.filename.replace(/\[hash\]/g, generateHash(this.svgSource))
            : `iconset-${generateHash(this.svgSource)}.svg`;
        this.options.url = (this.options.url)
            ? `${this.options.url}/${this.options.filename}`
            : `${this.options.output}/${this.options.filename}`;
      };

      // Adds a [flag] hook for potential code inject during emit tap below
      compilation.hooks.optimizeModules.tap(this.name, (modules) => {
        Object.keys(modules).map((i) => {
          if (modules[i].rawRequest === this.entryPath) {
            gatherResults();
            let template;

            // Inject XHR request (note has no flag find/replace need like bundle below has)
            if (this.options.insert === 'xhr') {
              template = cleanTemplateLiteral(`
                var WP_SVG_XHR = new XMLHttpRequest();
                WP_SVG_XHR.open('GET', '${this.options.url}', true);

                WP_SVG_XHR.onload = function() {
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
    compiler.hooks.emit.tap(this.name, (compilation) => {
      // Insert.xhr & Insert.none
      if (['xhr', 'none'].indexOf(this.options.insert) !== -1) {
        writeSpriteToDisk(
          compilation,
          `.${this.options.output}/${this.options.filename}`,
          this.svgSource, this.symbols.length
        );
      }

      // Insert.bundle
      if (['bundle', 'document'].indexOf(this.options.insert) !== -1) {
        const symbolsString = this.symbols.map(s => s.source).join('');
        Object.keys(compilation.assets).sort().map((i) => {
          if (this.options.insert === 'bundle') {
            if (!compilation.assets[i].source()) { return false; }
            let source = compilation.assets[i].source();
            if (source.indexOf('__WP_SVG_SPRITELY_SYMBOLS__') !== -1) {
              source = source.replace('__WP_SVG_SPRITELY_SYMBOLS__', symbolsString.replace(/(\r\n|\n|\r)/gm, ''));
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
              `<body>\n<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${symbolsString}</svg>\n$1</body>`);

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

    compiler.hooks.afterEmit.tap(this.name, () => {
      // Create manifest?
      if (this.options.manifest) {

        // Options configuration
        if (typeof this.options.manifest === 'object'){
          if (!this.options.manifest.path) {
            this.options.manifest.path = false;
          }
        }

        // Simple configuration
        if (typeof this.options.manifest === 'string') {
          this.options.manifest = {
            path: this.options.manifest
          }
        }

        generateManifest(
          this.options.manifest,
          this.manifest,
          compiler
        );
      }
    });
  }
}

module.exports = WebpackSvgSpritely;
