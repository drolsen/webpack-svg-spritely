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
    data = data.filter(
      (svg) => svg.name && options.filterOut.some(
        (filter) => svg.name.indexOf(filter) === -1
      )
    );
  }

  /* Step two, if we have a groupBy option, we will group then write*/
  if (options.groupBy) {
    const groups = [];
    options.groupBy.filter(n => groups[n] = data.filter((svg) => svg.name.match(n)));

    fs.writeFile(
      outputPath,
      JSON.stringify({icons: data, ...groups}),
      (err) => console.log(err)
    );

    return false;
  }

  /* Step three, we have a simple configuration so we will write */
  fs.writeFile(
    outputPath,
    JSON.stringify(data.filter((n) => n).filter((item, index) => data.indexOf(item) === index)),
    (err) => console.log(err)
  );
}

class WebpackSvgSpritely {
  constructor(options) {
    this.options = Object.assign({
      insert: 'xhr',
      prefix: 'icon',
      location: 'bodyStart',
      output: '',
      filename: `iconset-[hash].svg`,
      entry: [],
      manifest: false,
      url: false,
      combine: false,
      filter: []
    }, options);

    this.hash = '';
    this.entries = [];
    if (!this.options.url) {
      this.options.url = `${this.options.output}/${this.options.filename}`;
    } else {
      this.options.url = `${this.options.url}/${this.options.filename}`;
    }

    // Ensures that entry option is string array
    if (typeof this.options.entry === 'string') {
      this.options.entry = [this.options.entry];
    }

    process.spritely = {
      symbols: [],
      manifest: []
    };
  }

  // Generates cache busting filename hash
  makeHash(source) {
    return crypto.createHash('md5').update(JSON.stringify(source)).digest('hex')
  };

  // Gather symbols from one, or all this.entries
  getSymbols(entry = false) {
    let collection = [];
    const { symbols } = process.spritely;

    if (entry) {
      return this.makeSymbols(
        symbols.map(
          (n) => n.entry.match(entry) 
            ? n.symbol 
            : false
        ).filter(n => n)
      );
    } else {
      return this.makeSymbols(
        Object.keys(symbols).map((i) => symbols[i].symbol)
      );
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
        ${symbols.filter((n) => n).filter((item, index) => symbols.indexOf(item) === index).join('')}
      </svg>
    `)
  };

  // Makes XHR JS template literal
  makeXHRCode() {
    return cleanTemplateLiteral(`
       (function() {
        var WP_SVG_XHR = new XMLHttpRequest();
        WP_SVG_XHR.open('GET', '${this.options.url.replace(/\[hash\]/g, this.hash)}', true);

        WP_SVG_XHR.onload = function() {
          if (!WP_SVG_XHR.responseText || WP_SVG_XHR.responseText.substr(0, 4) !== '<svg') {
            throw Error('Invalid SVG Response');
          }
          if (WP_SVG_XHR.status < 200 || WP_SVG_XHR.status >= 300) {
            return;
          }
          var WP_SVG_DIV = document.createElement('div');
          WP_SVG_DIV.dataset.sheetFileName = '${path.parse(this.options.url.replace(/\[hash\]/g, this.hash)).name}';

          WP_SVG_DIV.innerHTML = WP_SVG_XHR.responseText;
          ${this.options.location === 'bodyStart' ? 'document.body.insertBefore(WP_SVG_DIV, document.body.childNodes[0]);' : ''}
          ${this.options.location === 'bodyEnd' ? 'document.body.append(WP_SVG_DIV);' : ''}
        };
        WP_SVG_XHR.send();
      })();\n\r
    `)
  };

  // Makes Bundled JS template literal
  makeBundleCode(asset) {
    return cleanTemplateLiteral(`
      var WP_SVG_DIV = document.createElement('div');
      WP_SVG_DIV.dataset.sheetFileName = 'bundled-inline';
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
      ${this.options.location === 'bodyStart' ? 'document.body.insertBefore(WP_SVG_DIV, document.body.childNodes[0]);' : ''}
      ${this.options.location === 'bodyEnd' ? 'document.body.append(WP_SVG_DIV);' : ''}
    `);
  };

  // Make and insert sprite sheet
  makeSpriteSheet(assets) {
    let { url } = this.options;
    const { output } = this.options;
    const { combine } = this.options;

    if (combine) {
      const symbols = this.getSymbols();
      if (symbols) {
        url = url.replace(/\[hash\]/g, this.hash);
        if (url.indexOf('.svg') === -1) { url = `${url}.svg`; }
        assets[`.${url}`] = {
          source: () => symbols,
          size: () => symbols.length
        };
      }
    } else {
      let uniqueUrl = `.${output}/${path.basename(url.replace(/\[hash\]/g, this.hash))}`;
      if (uniqueUrl.indexOf('.svg') === -1) { uniqueUrl = `${uniqueUrl}.svg`; }

      Object.keys(this.entries).map((i) => {
        const symbols = this.getSymbols(i);
        if (symbols) {
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
    compiler.hooks.thisCompilation.tap({ name: 'WebpackSvgSpritely' }, (compilation) => {
      /* Gather SVG Symbols & Optional Manifest Data */
      compilation.hooks.chunkAsset.tap('WebpackSvgSpritely', (chunk, filename) => {
        const assets = compilation.getAssets();
        const entryFiles = Array.from(compilation.entrypoints.keys());

        Object.keys(assets).map((i) => {
          if (assets[i].name.indexOf('.svg') !== -1) {
            const asset = compilation.getAsset(assets[i].name);
            const source = asset.source.source().toString('utf8');
            const { name } = asset;

            asset.symbol = cleanSymbolContents(name, this.options.prefix, source);
            asset.entry = entryFiles.find((entryFile) => chunk.name === entryFile || filename.includes(entryFile));

            process.spritely.manifest.push({name, source});

            let hasNoDuplicate = true;
            Object.keys(process.spritely.symbols).map((j) => {
              if (process.spritely.symbols[j].name === name) {
                hasNoDuplicate = false;
              }
            });

            if (hasNoDuplicate) {
              process.spritely.symbols.push(asset);
            }
          }

          return false;
        });

        process.spritely.symbols = process.spritely.symbols.filter(
          // Filters out options.filter and ensures no NULL records
          (svg) => {
            return svg && !this.options.filter.some((filter) => svg.name.indexOf(filter) !== -1);
          }
        );

        this.hash = this.makeHash(process.spritely.symbols);
      });


      // Begin Bundle or XHR injection types
      compilation.hooks.processAssets.tap(
        {
          name: 'WebpackSvgSpritely',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONS, // see below for more stages
          additionalAssets: (assets) => {
            /***************************/
            /* HTML document inserting */
            /***************************/            
            if (
              this.options.insert !== 'none'
              && this.options.entry.length 
              && this.options.entry.some((n) => n.indexOf('.html') !== -1)
            ) {
              const { insert } = this.options;
              Object.keys(this.options.entry).map((i) => {
                const entry = this.options.entry[i];

                Object.keys(assets).map((i) => {
                  if (i.indexOf(entry) !== -1) {
                    let source = compilation.getAsset(i).source.source();
                    compilation.updateAsset(
                      i,
                      new sources.RawSource(
                        source.replace(
                        /<body>([\s\S]*?)<\/body>/, `<body>\r\n$1\r\n<script>${
                            (insert === 'bundle') 
                              ? this.makeBundleCode(assets[i]) 
                              : (insert === 'xhr') 
                                ? this.makeXHRCode() 
                                : 'console.log("SVG SPRITELY ERROR! NO INSERT OPTION DEFINED");'
                          }</script></body>`.trim()
                        )
                      )
                    );
                  } 
                }); 
              });
            }
          }
        },
        (assets) => {
          let { insert } = this.options;
          let { entry } = this.options;

          /********************************************/
          // No entry file defined therefor we process all entries
          if (!entry.length){
            this.entries = Object.assign({}, compilation.options.entry);
          }

          // Entry defined
          if (entry.length) {
            // Is entry found to be a compiler entry file?
            Object.keys(compiler.options.entry).map((i) => {
              const path = compiler.options.entry[i].import[0];
              if (
                entry.some((n) => n === i)                   // Is shorthand name reference to entry file used
                || entry.some((n) => path.indexOf(n) !== -1) // Or full filename reference to entry file used
              ) {
                this.entries[i] = compiler.options.entry[i];
              }
            });
          }
          /*******************************************/

          /* Process Compiler Entry */
          if (!Object.keys(this.entries).length) { return false; }
          Object.keys(this.entries).map((i) => {
            // Pull asset out by matching this.entries key
            const name = Object.keys(assets).map((j) => {
              if (['.js', '.html'].some((n) => path.basename(j).indexOf(n) !== -1)) {
                if (path.basename(j).indexOf(i) !== -1) {
                  return j;
                }
              }

              return false;
            }).filter((n) => n)[0];

            const asset = assets[name];
            let source = asset.source();

            // const asset = compilation.getAsset(path.basename(this.entries[i].import[0]));

            /********************/
            /* XHR / None types */
            /********************/
            if (['xhr'].indexOf(insert) !== -1) {
              assets = this.makeSpriteSheet(assets);
              compilation.updateAsset(
                name,
                new sources.RawSource(source + this.makeXHRCode())
              );
            }

            /********************/
            /* Bundle inserting */
            /********************/
            if (['bundle'].indexOf(insert) !== -1) {
              compilation.updateAsset(
                name,
                new sources.RawSource(source + this.makeBundleCode(asset))
              );
            }
          });         
        }
      );
    });

    // Create manifest file?
    let { manifest } = this.options;
    if (manifest) {
      compiler.hooks.afterEmit.tap('WebpackSvgSpritely', () => {

        // Options configuration
        if (typeof manifest === 'object'){
          if (!manifest.path) { manifest.path = false; }
        }

        // Simple configuration
        if (typeof manifest === 'string') {
          manifest = { path: manifest }
        }

        generateManifest(
          manifest,
          process.spritely.manifest,
          compiler
        );
      });
    }
  }
}

module.exports = WebpackSvgSpritely;
