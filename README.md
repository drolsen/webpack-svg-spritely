<div align="center">
  <img src="/assets/logo.png" width="300" /><br />
  <p>Plugin that bundles project svg files into a sprite file.</p>
</div>

### How it works
Webpack SVG Spritely takes all incoming SVGs of a given build entry file and creates svg symbols out of each found SVG. Once done creating symbols, Webpack SVG Spritely writes a SVG sprite file to disk of all created symbols.

Webpack SVG Spritely also adds supporting XHR code into your build entry file to be ran in browser (optional).
Once ran in browser, newly created SVG sprite file is loaded into the DOM from disk and document is ready for sprite usage.

---
### Install
```
npm i --save-dev webpack-svg-spritely
```
```
yarn add --dev webpack-svg-spritely
```

### Webpack Config
Import webpack-svg-spritely into your webpack config file:
```js
const WebpackSVGSpritely = require('webpack-svg-spritely');
```

Instantiate a new WebpackSVGSpritely() class within webpack config's plugin array:
```js
module.exports = {
  "plugins": [
    new WebpackSVGSpritely()
  ]
};
```

Thats it!

### How to use sprite
To reference SVG sprite parts we use the `xlinkHref` / sprite symbol name within our DOM.

```xml
<svg>
  <use xlinkHref="#icon-[filename]" />
</svg>
```

- [filename] would be substituted with the actual filename of source svg you wish to render.
- `icon-` prefix of the xlinkHref is default of Webpack SVG Spritely, but can be customized with the `prefix` option below.

### Requirements
The only requirement Webpack SVG Spritely has, is that you are passing SVG's through your build system, not just coping them from one location to another by means of copy-webpack-plugin.

Include SVG files into one of your webpack config entry files like so:
```js
require.context('src/project/images/', false, /\.(svg)$/);
```

If you have not already configured your webpack to handle media files, have a look see at the Webpack SVG Spritely test configuration [here](https://github.com/drolsen/webpack-svg-spritely/blob/master/test/test.config.js#L16-L27) to see how to use `file-loader` module. This must be setup prior to importing your source svg files into your bundle(s).

For any questions around webpack image configuration, please first review [repository test files](https://github.com/drolsen/webpack-svg-spritely/tree/master/test) before opening an issue.

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
`output` | String | Location of where sprite file gets output. | Webpack config output location.
`filename` | String | Name of the sprite file. | spritely-[hash].svg
`prefix` | String | Prefix used in the sprite file symbol's name | icon-
`xhr` | Bool | Defines if XHR code, Sprite source or nothing gets injected into entry file. | true
`xhrPath` | String | Defines the path of where XHR code should request for icon sprite file. | Webpack config output location + plugin output directory.
`xhrEntry` | String | Defines what entry file to inject XHR code into. | First entry file of Webpack config's entry settings

### output
With the output option you can specify a deeper location within the main webpack output configuration. This is useful for project organization.

```js
new WebpackSVGSpritely({
  output: '/custom/location/images'
})
```

### filename
This option allows you to specify the name of the sprite file that gets bundled. You can use a [hash] flag to combine a cache pop MD5 hash to filename and XHR endpoint (if XHR is enabled).

Please note if you use a hash pop within file names, you are subjected to unique hash numbers per build and will make targeting the file with custom XHR methods outside of webpack-svg-spritely's XHR code difficult if not impossible.

```js
new WebpackSVGSpritely({
  filename: 'customName-[hash].svg'
})
```
or
```js
new WebpackSVGSpritely({
  filename: 'customName.svg'
})
```

### prefix
If you have svg files named `up.svg` and `down.svg` being bundled into a svg sprite, by default their sprited names are `icon-up` and `icon-down` respectively. This prefix option allows you to change the prefix taxed onto the sprited symbol names from `icon-` to something custom. Prefixes are enforced, if you specify a blank string the name will be `-up` and `-down` which is ugly.. so use prefixes.

```js
new WebpackSVGSpritely({
  prefix: 'SVGSprite' // becomes <symbol name="custom-prefix-filename">
})
```
which effect sprite usage:
```xml
<svg>
  <use xlinkHref="#SVGSprite-up" />
</svg>

<svg>
  <use xlinkHref="#SVGSprite-down" />
</svg>
```

### xhr
By default Webpack SVG Spritely will inject code used to request sprite file contents into DOM by means of XHR. This is to help reduce your bundle size to offloading sprite source to a svg file on disk.

However, you can also bypass this XHR approach by setting the `xhr` option to false. Setting this option to false will not write a sprite file to disk; instead the sprite contents will be injected directly into your bundle along.

If you wish no XHR or sprite source be injected to bundles at all (but still write sprite to disk), set this option to `other`. Useful if you want to use a server side approach to inject the sprite contents into DOM instead.

Warning: if setting this option to `other` while having a sprite filename using a [hash], it will be impossible to write your own XHR method. Either use Webpack SVG Spritely's XHR method or don't leave blank or use a [hash] within the filename option.

```js
new WebpackSVGSpritely({
  xhr: false (default true)
})
```

### xhrPath
If you choose to use the xhr option from above, the default request location will be output location + filename (including hash flag if specified in filename option). However if you want to overload this default location you can do so with this option. Please note this setting is absolute pathing while without this setting the request location is relative to output location of sprite file.

```js
new WebpackSVGSpritely({
  xhrPath: '/~/custom/production/path'
})
```

### xhrEntry
As mention above, the xhr code for requesting sprite file will be injected into your webpack config's FIRST main entry file. If you would like to specify is specific entry file this option allows you to specify what entry file to inject the XHR code into. This is useful if your webpack config has code splitting within multiple entry files.

```js
module.exports = {
  "entry": {
    testA: 'test.a.js',
    testB: 'test.b.js'
  },	
  "plugins": [
    new WebpackSVGSpritely({
      xhrEntry: 'testA'
    })
  ]
};


```

### Tests

Webpack SVG Spritely comes with a number of tests found under `/tests`. These are here to help you better understand the expectations of each option we covered above.

Simply run `npm run test` or `yarn test` from the root of the plugin to run a basic test. Running a test will produce a `/dist` directory, with each test, review the bottom of the bundled .js file and the sprite file to gather a understanding of changes taking place from test to test.

If you would like to change a test, update the root package.json file's `test` script to use any of the `/test/*.test.config.js` files.

- `basic.test.config.js` = Should produce a out of the box sprite file and inject XHR code into bundled entry file.
- `entry.test.config.js` = Should produce a out of the box sprite file and inject XHR code into specified entry file.
- `filename.test.config.js` = Should produce a sprite file with custom name and use MD5 cache popping [hash] flag.
- `path.test.config.js` = Should set custom XHR endpoint path within the injected XHR code.
- `inject.nothing.test.config.js` = Should inject nothing into entry file, but write sprite file to disk still.
- `inject.xhr.test.config.js` = Should inject xhr code into entry file and write sprite to disk.
- `inject.sprite.test.config.js` = Should inject sprite code instead of xhr code into entry file and write sprite to disk.

`test.a.js` and `test.b.js` files are our test supporting entry files, not test configurations. Both these files are requiring our test svg files which is a requirement of Webpack SVG Spritely.