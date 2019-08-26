<div align="center">
  <img src="/assets/logo.png" width="300" />
  <p style="margin-top: 25px;">Plugin that bundles project SVG files into a SVG sprite.</p>

[![Build Status](https://travis-ci.com/drolsen/webpack-svg-spritely.svg?branch=master)](https://travis-ci.com/drolsen/webpack-svg-spritely)
[![dependencies Status](https://david-dm.org/drolsen/webpack-svg-spritely/status.svg)](https://david-dm.org/drolsen/webpack-svg-spritely)
[![devDependencies Status](https://david-dm.org/drolsen/webpack-svg-spritely/dev-status.svg)](https://david-dm.org/drolsen/webpack-svg-spritely?type=dev)
</div>

### How it works
Webpack SVG Spritely takes all incoming SVG files of a given build and creates symbols out one.
Once done creating symbols, Webpack SVG Spritely writes a SVG sprite file to disk.

Once ran in browser, the newly created SVG sprite file is loaded into the DOM and ready usage.

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
Import webpack-svg-spritely into your Webpack configuration file:
```js
const WebpackSVGSpritely = require('webpack-svg-spritely');
```

Instantiate a new WebpackSVGSpritely() class within Webpack configuration's plugin array:
```js
module.exports = {
  "plugins": [
    new WebpackSVGSpritely()
  ]
};
```

Thats it!

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
`filename` | String | Name of the sprite file. | iconset-[hash].svg
`output` | String | Location of where sprite file gets output. | Webpack configured output location.
`prefix` | String | Prefix used in the sprite file symbol's name | icon-
`entry` | String | Defines what entry file to inject XHR code or sprite contents into. | First entry file of Webpack configuration's entry settings
`xhr` | True, False, 'Other' | Defines if XHR code, Sprite source or nothing gets injected into entry file. | true
`url` | String | Overloads the default path of where XHR code should request for icon sprite file. | Webpack configured output location + plugin output directory.

## options.output
With the `output` option, you can specify a deeper location (relative to the Webpack's `output` configuration) to where this plugin should write the sprite file under.

Without this option, the sprite file will be written to the root of your Webpack configuration's output location.

```js
new WebpackSVGSpritely({
  output: '/custom/location/images'
})
```

## optins.filename
This option allows you to specify a name for the sprite file.
You can use a `[hash]` flag to combine a cache pop MD5 hash to filename and XHR endpoint (if XHR is enabled of course).

Please note; if you using a [hash] flag within `filename` you are subjected to unique hash numbers per build. Consider removing `[hash]` flag, if you have logic beyond this plugin that needs a consistent sprite file name out on disk.

```js
new WebpackSVGSpritely({
  filename: 'customName-[hash].svg'
})
```
or with out `[hash]` flag
```js
new WebpackSVGSpritely({
  filename: 'customName.svg'
})
```

## options.prefix
The `prefix` option allows you to change the symbol id prefix from `icon-` to something custom. 
For example; if you have SVG files named `up.svg` and `down.svg` being bundled into a SVG sprite. By default both `up.svg` and `down.svg` sprited ids are `icon-up` and `icon-down` respectively.

Prefixes are enforced; if you specify a blank string, the name will be `-up` and `-down` which is ugly..
Use prefixes!

```js
new WebpackSVGSpritely({
  prefix: 'myPrefix' // becomes <symbol name="SVGSprite-filename">
})
```
which effect sprite usage:
```xml
<svg>
  <use xlinkHref="#myPrefix-up" />
</svg>

<svg>
  <use xlinkHref="#myPrefix-down" />
</svg>
```

## options.xhr
By default Webpack SVG Spritely will inject code used to request sprite file contents into DOM by means of XHR. This is to help reduce your bundle size to offloading sprite source to a svg file on disk.

However, you can also bypass this XHR approach by setting the `xhr` option to false. Setting this option to false will not write a sprite file to disk; instead the sprite contents will be injected directly into your bundle.

If you wish to have no XHR, or sprite source be injected to bundles at all (but still want sprite written to disk), set this option to `'other'`. 
(This is useful if you want to use a server-side approach to inject the sprite contents into DOM instead.)

```js
new WebpackSVGSpritely({
  xhr: false (default true)
})
```

## options.url
If you choose to use the `xhr` option from above, the default request location will be `output location + filename`. However, if you want to overload this default XHR endpoint you can do so with this `url` option.

```js
new WebpackSVGSpritely({
  url: '/~/custom/production/path'
})
```

## options.entry
XHR code or sprite contents will be injected into your first found entry .js file for a given build automatically.
If you would like to specify a which entry file to inject code into, this `entry` option will allow you to do just that.

This is useful if Webpack has been configured with multiple entry points (code splitting).
Please take note on how `output.filename` (example #2 down below) changes the configuration of this `entry` option usage.

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
      entry: 'testB' // or testB.js
    })
  ]
};
```

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
    new WebpackSVGSpritely({
      entry: 'custom-testB'
    })
  ]
};
```


---

### Tests

Webpack SVG Spritely comes with a number of tests found under `/tests`.
These are here to help you better understand the expectations of each option we covered above.

Simply run `npm run test` or `yarn test` from the root of the plugin to run all tests. Running a test will produce a `/dist/[test]` directories. With each test, be sure to review the bottom of the bundled.js file(s), and the sprite file to understanding changes taking place from test to test.

If you would like to change a test, update the root package.json file's `test` script to use any of the `/test/*.test.config.js` files.

- `basic.test.config.js` = Should produce a out of the box sprite file and inject XHR code into bundled entry file.
- `entry.test.config.js` = Should produce a out of the box sprite file and inject XHR code into specified entry file.
- `filename.test.config.js` = Should produce a sprite file with custom name and use MD5 cache popping [hash] flag.
- `path.test.config.js` = Should set custom XHR endpoint path within the injected XHR code.
- `inject.nothing.test.config.js` = Should inject nothing into entry file, but write sprite file to disk still.
- `inject.xhr.test.config.js` = Should inject XHR code into entry file and write sprite to disk.
- `inject.sprite.test.config.js` = Should inject sprite code instead of XHR code into entry file and write sprite to disk.
- `minified.sprite.test.config.js` = Should produce a out of the box sprite file and inject XHR code into minified bundled entry file.

`test.a.js` and `test.b.js` files are our test supporting entry files, not test configurations. Both these files are requiring our test svg files which is a requirement of Webpack SVG Spritely.