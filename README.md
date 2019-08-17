<div align="center">
  <img src="/assets/logo.png" /><br />
  <p>Plugin that bundles project svg files into a sprite file.</p>
</div>

### How it works
Webpack SVG Spritely takes all incoming SVGs of a given webpack build entry file, and creates svg symbols out of each found SVG. Once done creating symbols, Webpack SVG Spritely writes a SVG sprite file to disk of all created symbols.

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
To reference SVG sprite parts we use the xmllinkHref / sprite symbol name within our DOM ([filename] should be substituted with filename of svg you wish to render):

```xml
<svg>
  <use xlinkHref="#icon-[filename]" />
</svg>
```

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
`filename` | String | Name of the sprite file. | iconset.svg
`prefix` | String | Prefix used in the sprite file symbol's name | icon-
`xhr` | Bool | Defines if XHR code for sprite file should be injected into Webpack config entry file. | true
`xhrPath` | String | Defines the path of where XHR code should request for icon sprite file. | Webpack config output location + plugin output directory.
`xhrEntry` | String | Defines what entry file to inject XHR code into.

### output
With the output option you can specify a deeper location within the main webpack output configuration. This is useful for project organization.

```js
new WebpackSVGSpritely({
	output: '/custom/location/images'
})
```

### filename
This option allows you to specify the name of the sprite file that gets bundled. You can use a [hash] flag to combat cache.

Please note if you use a hash pop within file names, you are subjected to unique hash numbers per build and will make targeting the file with custom XHR methods outside of webpack-svg-spritely's XHR code difficult if not impossible.

```js
new WebpackSVGSpritely({
	filename: 'custom-[hash].svg'
})
```

### prefix
If you have svg files named `up.svg` and `down.svg` being bundled into a svg sprite, by default their sprited names are `icon-up` and `icon-down` respectively. This prefix option allows you to change the prefix taxed onto the sprited symbol names from `icon-` to something custom. Prefixes are enforced, if you specify a blank string the name will be `-up` and `-down` which is ugly.. so use prefixes.

```js
new WebpackSVGSpritely({
	prefix: 'custom-prefix' // becomes <symbol name="custom-prefix-filename">
})
```

### xhr
By default, webpack-svg-spritely will locate the first entry file of your webpack config file, and inject XHR code used to request sprite file. This XHR code is used to request sprite file and inject the symbols into your HTML document for sprite usage.

This option allows you to turn this feature off and not inject XHR code into any entry files. This is useful if you want to use server side to inject the sprite file contents into DOM instead.

Please note, if you turn this feature off and are trying to write your own XHR request, you must not use [hash] flags in our filename option from above to predict.

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
