const fs = require('fs');
const path = require('path');
const { sources } = require('webpack');
const crypto = require('crypto');

// Template cleaning helper
const cleanTemplateLiteral = (literal) => literal.replace(/(\r\n|\n|\r)/gm , ' ').replace(/\s+/g, ' ').trim();

// Source symbol cleaning helper
const cleanSymbolContents = (name, prefix, contents) => contents
  .replace(/<svg/g, `<symbol id="${prefix}-${path.basename(name, '.svg')}"`)
  .replace(/<\/svg>/g, '</symbol>')
  .replace('xmlns="http://www.w3.org/2000/svg"', '')
  .replace(/<style>(.*)<\/style>/g, '<style><![CDATA[$1]]></style>');

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
    JSON.stringify(data.filter((n) => n)),
    (err) => {
      if(err) {
        console.log(err);
      }
    }
  );
}

class WebpackSvgSpritely {
  constructor(options) {
    this.options = Object.assign({
      insert: 'xhr',
      prefix: 'icon',
      output: '',
      filename: `iconset-[hash].svg`,
      entry: false,
      manifest: false,
      url: false,
      combine: false,
      filter: []
    }, options);

    this.entries = [];
    this.symbols = [];       // holds a collection of our converted symbols from svg assets
    this.manifest = [];      // holds a collection of our icon's meta data into json object
    this.noDuplicates = [];  // used within duplicate symbol prevention

    if (!this.options.url) {
      this.options.url = `${this.options.output}/${this.options.filename}`;
    }
  }

  // Generates cache busting filename hash
  makeHash() {
    return crypto.createHash('md5').update(new Date().toLocaleTimeString() + Math.floor(Math.random() * 1000)).digest('hex')
  };

  // Gather entry file(s) into custom object.
  getEntries(entries) {
    const collection = [];
    for (let entry in entries) {
      collection[`${entry}${path.extname(entries[entry].import[0])}`] = {
        rawRequest: entries[entry].import[0]
      };
    }

    return collection;
  };

  // Gather symbols from one, or all this.entries
  getSymbols(entry = false) {
    let symbols = [];
    if (entry) {
      if (this.entries[entry]) {
        const { assets } = this.entries[entry];
        if (assets) {
          Object.keys(assets).map((i) => {
            if (this.options.filter.indexOf(path.basename(assets[i].name, '.svg')) !== -1) { return false; }
            symbols.push(assets[i].symbol);
          });
        }
      }
    } else {
      Object.keys(this.entries).map((i) => {
        const { assets } = this.entries[i];
        if (assets) {
          Object.keys(assets).map((j) => {
            if (this.options.filter.indexOf(path.basename(assets[j].name, '.svg')) !== -1) { return false; }
            symbols.push(assets[j].symbol);
          });
        }
      });
    }

    if (symbols.length) {
      return this.makeSymbols(symbols);
    }

    return false;
  };

  // Wraps symbols into a svg parent tag
  makeSymbols(symbols) {
    return cleanTemplateLiteral(`
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style="position:absolute; width: 0; height: 0"
      >
        ${symbols.join('')}
      </svg>
    `)
  };

  // Make and insert sprite sheet
  makeSpriteSheet(assets) {
    if (this.options.combine) {
      const symbols = this.getSymbols();
      if (symbols) {
        this.options.url = this.options.url.replace(/\[hash\]/g, this.makeHash());
        if (this.options.url.indexOf('.svg') === -1) { this.options.url = `${this.options.url}.svg`; }

        assets[`.${this.options.output}/${this.options.url}`] = {
          source: () => symbols,
          size: () => symbols.length
        };
      }
    } else {
      Object.keys(this.entries).map((i) => {
        const symbols = this.getSymbols(i);
        if (symbols) {
          let uniqueUrl = `.${this.options.output}/${path.basename(this.options.url.replace(/\[hash\]/g, this.entries[i].hash))}`;
          if (uniqueUrl.indexOf('.svg') === -1) { uniqueUrl = `${uniqueUrl}.svg`; }

          assets[uniqueUrl] = {
            source: () => symbols,
            size: () => symbols.length
          };
        }
      });
    }

    return assets;
  }

  apply(compiler) {
    this.entries = this.getEntries(compiler.options.entry);

    compiler.hooks.thisCompilation.tap({ name: 'WebpackSvgSpritely' }, (compilation) => {
      // Gather association between entry files and assets and SVG symbols.
      compilation.hooks.chunkAsset.tap('WebpackSvgSpritely', (chunk, filename) => {
        const assets = [...chunk.auxiliaryFiles];
        const entry = this.entries[path.basename(filename)];

        if (!entry) { return false; }
        entry.assets = Object.keys(assets).map((i) => {
          let asset = assets[i];
          if (asset.indexOf('.svg') !== -1) {
            asset = compilation.getAsset(asset);
            const { name } = asset;
            const { source } = asset;

            asset.symbol = cleanSymbolContents(
              name,
              this.options.prefix,
              source.source().toString('utf8')
            );

            this.manifest.push({
              name,
              source: source.source().toString('utf8')
            });

            entry.hash = this.makeHash();
            return asset;
          }

          return false;
        }).filter((n) => n);

        // Gather aossication to entry custom names vs. filename
        const entryNames = Array.from(compilation.entrypoints.keys());
        Object.keys(this.entries).map((i) => {
          if (entryNames[path.parse(path.basename(i)).name]) {
            this.entries[i].name = path.parse(path.basename(i)).name;
          }
        });

        // Gather aossication between entry import path and output path
        Object.keys(this.entries).map((i) => {
          this.entries[i].output = compiler.options.output.filename.replace(
            '[name]',
            path.parse(path.basename(i)).name
          );
        });        
      });

      // Begin injection types
      compilation.hooks.processAssets.tap(
        {
          name: 'WebpackSvgSpritely',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS, // see below for more stages
          additionalAssets: true
        },
        (assets, callback) => {
          Object.keys(this.entries).map((i) => {
            const asset = compilation.getAsset(this.entries[i].output);
            let source = asset.source.source();

            /********************/
            /* XHR / None types */
            /********************/
            if (['xhr', 'none'].indexOf(this.options.insert) !== -1) {
              assets = this.makeSpriteSheet(assets);
              const template = cleanTemplateLiteral(`
                 (() => {
                  var WP_SVG_XHR = new XMLHttpRequest();
                  WP_SVG_XHR.open('GET', '${
                    (this.options.combine)
                      ? this.options.url
                      : this.options.url.replace(/\[hash\]/g, this.entries[i].hash)
                  }', true);

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
                })();\n\r
              `);

              compilation.updateAsset(
                this.entries[i].output,
                new sources.RawSource(source + template)
              );
            }

            /********************/
            /* Bundle inserting */
            /********************/
            if (['bundle'].indexOf(this.options.insert) !== -1) {
              // Insert.bundle
              const template = cleanTemplateLiteral(`
                var WP_SVG_DIV = document.createElement('div');
                WP_SVG_DIV.innerHTML = '
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style="
                      position:absolute;
                      width: 0;
                      height: 0
                    "
                  >
                    ${this.getSymbols((this.options.combine) ? false : asset)}
                  </svg>
                ';
                document.body.insertBefore(
                  WP_SVG_DIV,
                  document.body.childNodes[0]
                );
              `);

              compilation.updateAsset(
                this.entries[i].output,
                new sources.RawSource(source + template)
              );
            }
          });

          /***************************/
          /* HTML document inserting */
          /***************************/            
          Object.keys(assets).map((i) => {
            if (['document'].indexOf(this.options.insert) !== -1 && i.indexOf('.html') !== -1) {
              compilation.updateAsset(
                i,
                new sources.RawSource(
                  compilation.getAsset(i).source.source().replace(
                    /<body>([\s\S]*?)<\/body>/, `<body>\n<div><svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${this.getSymbols()}</svg></div>\n$1</body>`
                  )
                )
              );
            } 
          });          
        }
      );
    });

    // Create manifest file?
    if (this.options.manifest) {
      compiler.hooks.afterEmit.tap('WebpackSvgSpritely', () => {

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
      });
    }
  }
}

module.exports = WebpackSvgSpritely;
