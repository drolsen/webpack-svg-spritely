<div align="center">
  <img src="/assets/logo.png" width="300" />
  <p style="margin-top: 25px;">Plugin that bundles project SVG files into a SVG sprite.</p>

[![Build Status](https://travis-ci.com/drolsen/webpack-svg-spritely.svg?branch=master)](https://travis-ci.com/drolsen/webpack-svg-spritely)
[![dependencies Status](https://david-dm.org/drolsen/webpack-svg-spritely/status.svg)](https://david-dm.org/drolsen/webpack-svg-spritely)
[![devDependencies Status](https://david-dm.org/drolsen/webpack-svg-spritely/dev-status.svg)](https://david-dm.org/drolsen/webpack-svg-spritely?type=dev)
</div>

### How it works
Webpack SVG Spritely takes all incoming SVG files of a given build and creates symbols out of them.
Taking the created symbols, Webpack SVG Spritely then writes an SVG sprite file to disk or document(s).

Once ran in browser, the newly created SVG sprite is loaded into DOM and ready for usage.

It's that simple!

---
### Install
```
npm i --save-dev webpack-svg-spritely
```
```
yarn add --dev webpack-svg-spritely
```

### Webpack Config
Import `webpack-svg-spritely` into your Webpack configuration file:

```js
const WebpackSVGSpritely = require('webpack-svg-spritely');
```

Instantiate new `WebpackSVGSpritely(...)` class within Webpack's plugin configuration array:
```js
module.exports = {
  "plugins": [
    new WebpackSVGSpritely()
  ]
};
```

---

## Options

```js
module.exports = {
  "plugins": [
    new WebpackSVGSpritely({
      ...options...
    })
  ]
};
```

Option | Types | Description | Default
--- | --- | --- | ---
`output` | String | Location of where sprite file gets written to disk. | Relative to Webpack build's output.
`filename` | String | Name of the sprite file that gets written to disk. | iconset-[hash].svg
`filter` | Array | Name of the SVG files you wish to exclude from sprite(s). | no filtering
`prefix` | String | Prefix used in the sprite file symbol's name | `icon-`
`insert` | String | Defines how/if sprite symbols get inserted into DOM (xhr, html, bundle, none). | xhr method
`url` | String | Overloads the `insert.xhr` option's request URL. | Relative to root of server.
`entry` | String | Allows you to define what entry file or html document to insert code into. | First entry or all documents
`combine` | Boolean | Combines all SVG files into single sprite across multiple Webpack entry files. | false
`manifest` | String or Object | Allows you to define path and filename to a generated a JSON manifest file of found symbols.

## options.output
With the `output` option, you can specify a deeper location to where this plugin should write the sprite file under.
Without this option, the sprite file will be written to the root of your Webpack configuration's output location.

```js
new WebpackSVGSpritely({
  output: '/custom/location/images'
})
```

## options.filename
This option allows you to specify a custom name for the sprite file.
You can use a `[hash]` flag to combine a MD5 cache pop hash to filenames.

**Note:** if you using a [hash] flag within `filename` you are subjected to unique hash numbers per build. Consider removing `[hash]` flag, if you have logic beyond this plugin that needs a consistent sprite filename when written to disk.

```js
new WebpackSVGSpritely({
  filename: 'custom-svg-sprite-[hash].svg'
})
```

## options.filter
This option allows you to specify an array of SVG filenames you wish to exclude from generated sprite sheets.

**Note:** There is no RegEx or wildcard abilities here and must be an exact 1:1 of the SVG filename you wish to explicitly exclude. However the inclusion or exclusion of SVG file extension is optional to help curve any miss configurations.

```js
new WebpackSVGSpritely({
  filter: ['bob.svg', 'ross.svg', 'paintings']
})
```

## options.prefix
The `prefix` option allows you to change a symbol's id prefix from `icon-` to something custom. 
For example, if you have SVG files named `up.svg` and `down.svg`, by default both `up.svg` and `down.svg` sprited ids are `icon-up` and `icon-down` respectively.

```js
new WebpackSVGSpritely({
  prefix: 'projectName'
})
```

which effect sprite usage:
```xml
<svg>
  <use xlinkHref="#projectName-up" />
</svg>

<svg>
  <use xlinkHref="#projectName-down" />
</svg>
```

## options.insert
The insert option allows you to define how sprite symbols gets inserted into the DOM for sprite usage when ran in browsers.

```js
new WebpackSVGSpritely({
  insert: 'xhr | bundle | document | none'
})
```

### xhr (default)
XHR code snip get inserted into your build's entry file(s). The XHR option will fire off a request (at page load) to a sprite file that gets written to disk and loads symbols into DOM. This is to help to reduce your entry bundled size by offloading sprite source to a file on disk, but does not work offline.

### bundle
If you wish to not write sprite to disk / XHR option, you can bundle sprite symbols directly into your build's entry file(s) instead. This can increase your bundled size pretty quickly, but does ensure svg sprite works offline.

### document
If you have HTML assets in your build's ouput, you can insert the sprite symbols into these HTML document(s). This bypasses any need for you to insert code into any entry, and the needed for a sprite file to be written to disk.

Because this option reaches into the build's HTML asset output, it works with both [HTMLWebpackPlugin](https://www.npmjs.com/package/html-webpack-plugin) and [CopyWebpackPlugin](https://www.npmjs.com/package/copy-webpack-plugin) configuration.

### none
When working with larger backend systems (Java or .Net) that inserts sprite symbols into documents, use the none option.
This will still write a sprite file to disk for backend, but bypass any code from being inserted into client side documents.

## options.url
If you choose to set the `insert.xhr` option, the default request location for sprite file will be `output location + filename`. If you wish to overload this default file endpoint you can do so with this option.

```js
new WebpackSVGSpritely({
  url: '/~/custom/production/path'
})
```

## options.entry
If you would like to specify a specific file to insert code into (when using multiple entry files or html document), this `entry` option will allow you to do just that. By default, without specifying an entry file, code can be inserted into first found entry or all html documents.

If you use the `insert.xhr` or `insert.bundle`, this option pertains to entry files:
```js
module.exports = {
  "entry": {
    testA: 'test.a.js',
    testB: 'test.b.js'
  },
  output: {
    filename: '../dist/basic/[name].js'
  },
  "plugins": [
    new WebpackSVGSpritely({
      insert: 'xhr or bundle',
      entry: 'testB'
    })
  ]
};
```

If using `insert.document` instead, this option pertains to html documents. 
```js
module.exports = {
  "entry": {
    testA: 'test.a.js',
    testB: 'test.b.js'
  },
  output: {
    filename: '../dist/basic/custom-[name].js'
  },
  "plugins": [
    // used to compile our html files
    new HtmlWebPackPlugin({
      'template': './src/index.html',
      'filename': './documents/[name].html',
    }),
    new WebpackSVGSpritely({
      insert: 'document',
      entry: 'index.html'
    })
  ]
};
```

## options.combine
When using multiple entry files for a Webpack configuration: 
```js
entry: {
  testA: 'test.a.half.js',
  testB: 'test.b.half.js'
}
```

Webpack SVG Spritely will (by default) create unique sprite sheets per configured entry files. Each sprite sheet containting only it's corresponding entry file's SVG files.

However, if you would like to consolidate all svg files from multiple entry files in a single sprite sheet setting the combine option to `true` will do just that: 

```js
new WebpackSVGSpritely({
  combine: true
})
```

**Note:** Because of the way HTML documents are brought into Webpack builds by means of HTMLWebpackPlugin:
```js
new HtmlWebPackPlugin({
  'template': './some.html',
  'filename': './index.html',
}),
```
There is zero association to these configured HTML documents, and one or another entry file. Therefor, if you have configured Webpack SVG Spritely to use `insert: 'document'` this combine option will have no effect, and your HTML document(s) will contain assets from all configured entry files.

## options.manifest
This option allows you to set both the path and filename of a JSON manifest file. 
This manifest file contains the name and individual SVG source of all the captured icons into a JSON format.

```js
new WebpackSVGSpritely({
  manifest: '/path/filename.json'
})
```

This is useful for larger systems that wish to present a list of available icons to end users, that needs to be devoid of any JS, or even possibly "in-browser" requirements.

By default this is false, and only enabled once you provide a string path or object options. This will always generate a JSON format, so ensure that you choose .json as your path/filename's format.

You can also `groupBy` your icons within the manifest json:
```js
new WebpackSVGSpritely({
  manifest: {
    path: '/path/filename.json',
    groupBy: ['red', 'blue', 'green']
  }
})
```

The `groupBy` feature will group all icons that have a matching name to your configured words. The manifest.json  groupings are objects that use keys names from your configuration. All icons that do not match any `groupBy` configuration will be put into the object named "icons".

You can also `filterOut` icons from the manifest json:
```js
new WebpackSVGSpritely({
  manifest: {
    path: '/path/filename.json',
    filterOut: ['red', 'blue', 'green'],
  }
})
```

The `filterOut` feature will exclude all icons that have a matching name to your configured words.

Keep in mind that with options configuration you need to supply the `path` as a explicit property.

---

### Using Sprite Parts
To reference SVG sprite parts in DOM, use the `xlinkHref` within a SVG tag:

```xml
<svg>
  <use xlinkHref="#icon-[filename]" />
</svg>
```

- `[filename]` would be substituted with the actual filename of source SVG you wish to render.
- `icon-` prefix of the xlinkHref is default of Webpack SVG Spritely but can be customized with the `prefix` option below.

### Plugin Requirements
The only requirement Webpack SVG Spritely has, is that you are passing SVG's through your build system, not just coping them from one location to another by means of [CopyWebpackPlugin](https://www.npmjs.com/package/copy-webpack-plugin).

Include all SVG files into your Webpack entry file(s):
```js
require.context('src/project/images/', false, /\.(svg)$/);
```

If you have not already configured your Webpack to handle media files, have a look see at the Webpack SVG Spritely test configuration [here](https://github.com/drolsen/webpack-svg-spritely/blob/master/test/basic.test.config.js#L16-L27) to see how to use `file-loader` module. This must be setup prior to importing your source SVG files into your bundle(s).

For any questions around Webpack image configuration, please first review [repository test files](https://github.com/drolsen/webpack-svg-spritely/tree/master/test) before opening an issue.

---

### Tests

Webpack SVG Spritely comes with a number of tests found under `/tests`.
These are here to help you better understand the expectations of each option we covered above.

Simply run `npm run test` or `yarn test` from the root of the plugin to run all tests. Running a test will produce a `/dist/[test]` directories. With each test, be sure to review the bottom of the bundled.js file(s), and the sprite file to understanding changes taking place from test to test.

If you would like to change a test, update the root package.json file's `test` script to use any of the `/test/*.test.config.js` files.

- `basic.test.config.js` = Should produce a out of the box sprite file and inject XHR code into bundled entry file.
- `minified.test.config.js` = Should combine two Webpack entry file's assets into a single sprite.
- `entry.test.config.js` = Should produce a out of the box sprite file and inject XHR code into specified entry file.
- `filename.test.config.js` = Should produce a sprite file with custom name and use MD5 cache popping [hash] flag.
- `filter.test.config.js` = Should produce a sprite file that excludes icon-left and icon-right.
- `path.test.config.js` = Should set custom XHR endpoint path within the injected XHR code.
- `inject.nothing.test.config.js` = Should inject nothing into entry file, but write sprite file to disk still.
- `inject.xhr.test.config.js` = Should inject XHR code into entry file and write sprite to disk.
- `inject.sprite.test.config.js` = Should inject sprite code instead of XHR code into entry file and write sprite to disk.
- `minified.test.config.js` = Should produce a out of the box sprite file and inject XHR code into minified bundled entry file.

`test.a.js` and `test.b.js` files are our test supporting entry files, not test configurations. Both these files are requiring our test svg files which is a requirement of Webpack SVG Spritely.