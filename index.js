const fs = require('fs');
const path = require('path');
const { sources } = require('webpack');
const crypto = require('crypto');

// Asset name helper
const getAssetName = (assetPath) => assetPath.split('/')[assetPath.split('/').length - 1].replace(/(.*)\.(.*)/, '$1');

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
const writeSpriteToDisk = (assets, filename, symbols) => assets[filename] = {
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
const getEntryFilename = (entries) => {
  const collection = [];
  for (entry in entries) {
    collection[`${entry}${path.extname(entries[entry].import[0])}`] = entries[entry].import[0];
  }

  return collection;
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
      url: false
    }, options);

    this.entries = [];
    this.symbols = [];       // holds a collection of our converted symbols from svg assets
    this.manifest = [];      // holds a collection of our icon's meta data into json object
    this.noDuplicates = [];  // used within duplicate symbol prevention

    if (!this.options.url) { 
      this.options.url = `${this.options.output}/${this.options.filename}`; 
    }
  }

  apply(compiler) {
    this.entries = getEntryFilename(compiler.options.entry);

    compiler.hooks.compilation.tap({ name: 'WebpackSvgSpritely' }, (compilation) => {
      // Create hash for our icon sprite sheet
      if (this.options.filename.indexOf('[hash')) {
        this.options.filename = this.options.filename.replace(
          /\[hash\]/g, 
          crypto.createHash('md5').update(new Date().toLocaleTimeString()).digest('hex')
        );
      }

      // Grabbing SVG source at the most earliest point possible to create `this.symbols` with.
      compilation.hooks.processAssets.tap(
        {
          name: 'WebpackSvgSpritely',
          stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL, // see below for more stages
          additionalAssets: true          
        },
        (assets) => {

          // Collect svg files into symbols
          for (let asset in assets) {
            if (
              assets[asset].source
              && asset.indexOf('.svg') !== -1 
              && asset.indexOf(this.options.filename) === -1 // <- we don't want to process iconset-xxxxxx
            ) {
              const contents = assets[asset].source().toString('utf8');
              // no files missing <svg tag
              // no files that are font svg files
              if (contents.indexOf('<svg') !== -1
                && contents.indexOf('<font') === -1
                && contents.indexOf('<font') === -1
                && contents.indexOf('<glyph') === -1
              ) {
                if (this.noDuplicates.indexOf(asset) === -1) {
                  this.symbols.push(
                    cleanSymbolContents(
                      contents,
                      getAssetName(asset),
                      this.options.prefix
                    )
                  );

                  this.manifest.push({
                    name: getAssetName(asset),
                    source: `${contents}`
                  })

                  this.noDuplicates.push(asset);
                }
              }
            }
          }

          /* Entry file inserting */
          // XHR / None types
          if (['xhr', 'none'].indexOf(this.options.insert) !== -1) {
            writeSpriteToDisk(
              assets,
              `.${this.options.output}/${this.options.filename}`,
              this.symbols
            );

            for (let asset in assets) {
              if (
                compilation.getAsset(asset).source 
                && this.entries[path.basename(asset)]
                && asset.indexOf(this.options.filename) === -1 // <- we don't want to process iconset-xxxxxx
              ) {

                const contents = assets[asset].source();
                const template = cleanTemplateLiteral(`
                   /*** WebpackSvgSpritely ***/\n\r
                   (() => { 
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
                  })();\n\r
                `);

                compilation.updateAsset(
                  asset,
                  new sources.RawSource(contents + template)
                );    
              }
            } 
          }

          // Bundle inserting (meaning symbols and all are inserted, no XHR)
          if (['bundle'].indexOf(this.options.insert) !== -1){
            // Insert.bundle
            for (let asset in assets) {
              if (
                compilation.getAsset(asset).source
                && asset.indexOf(this.options.filename) === -1 // <- we don't want to process iconset-xxxxxx
                && this.entries[path.basename(asset)]
              ) {
                const contents = compilation.getAsset(asset).source.source();
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
                      ${this.symbols.join('').replace(/(\r\n|\n|\r)/gm, '')}
                    </svg>
                  ';
                  document.body.insertBefore(
                    WP_SVG_DIV, 
                    document.body.childNodes[0]
                  );
                `);

                compilation.updateAsset(
                  asset,
                  new sources.RawSource(contents + template)
                );
              }
            }
          }

          /* Document file inserting */
          if (['document'].indexOf(this.options.insert) !== -1) {
            for (let asset in assets) {            
              if (
                compilation.getAsset(asset).source
                && asset.indexOf('.html') !== -1
              ) {
                const contents = compilation.getAsset(asset).source.source().replace(
                  /<body>([\s\S]*?)<\/body>/,
                  `<body>\n<div><svg xmlns="http://www.w3.org/2000/svg" style="position:absolute; width: 0; height: 0">${this.symbols.join('')}</svg></div>\n$1</body>`
                );

                if (
                  this.options.entry
                  && asset.indexOf(this.options.entry) !== -1
                ) {
                  compilation.updateAsset(
                    asset,
                    new sources.RawSource(contents)
                  );
                } else {       
                  compilation.updateAsset(
                    asset,
                    new sources.RawSource(contents)
                  );
                }
              }
            }
          }          
        }
      );         
    });

    // Inject into html documents if flagged to be document insert

    // Create manifest file
    compiler.hooks.afterEmit.tap('WebpackSvgSpritely', () => {
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
