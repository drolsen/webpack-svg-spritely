<div align="center">
  <img src="/assets/logo.png" />
  <p>Plugin that takes project svg files and bundles them into a iconset svg sprite file.</p>
</div>

By default, webpack-svg-spritely will try to locate your build's entry file and inject needed XHR code to request the bundled svg sprite file at page load, however if you would like use opt of of this feature or better specify what entry file to include XHR code into, see options below.

### Install
```
npm install webpack-svg-spritely --saveDev
```

### Webpack Configure
Import webpack-svg-spritely into your webpack config file:
```json
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

Make sure to include SVG files into one of your webpack config entry files:
```js
require.context('src/project/images/', false, /\.(svg)$/);
```

If you have not already configured webpack to handle images for including project svg files, have a look see at the test configuration found [https://github.com/drolsen/webpack-svg-spritely/blob/master/test/test.config.js#L16-L27](here) to see how to use `file-loader` with webpack.

Thats it!


## Options

Option | Types | Description | Default
--- | --- | --- | ---
`output` | String | Location of where sprite file gets output. | Webpack config output location.
`filename` | String | Name of the sprite file. | iconset.svg
`prefix` | String | Prefix used in the sprite file symbol's name | icon-
`xhr` | Bool | Defines if XHR code for sprite file should be injected into Webpack config entry file. | true
`xhrPath` | String | Defines the path of where XHR code should request for icon sprite file. | Webpack config output location + plugin output directory.
`xhrEntry` | String | Defines what entry file to inject XHR code into.

### output
With the output option you can speicify a deeper location within the main webpack output configuration. This is useful for project organization.

### filename
This option allows you to specify the name of the sprite file that gets bundled. You can use a [hash] flag to combat cache.

Please note if you use a hash pop within file names, you are subjected to unique hash numbers per build and will make targeting the file with custom XHR methods outside of webpack-svg-spritely's XHR code difficult if not impossible.

### prefix
If you have svg files named `up.svg` and `down.svg` being bundled into a svg sprite, by default their sprited names are `icon-up` and `icon-down` respectively. This prefix option allows you to change the prefix taxed onto the sprited symbol names from `icon-` to something custom. Prefixes are enforced, if you specifiy a blank string the name will be `-up` and `-down` which is ugly.. so use prefixes.

### xhr
By default, webpack-svg-spritely will locate the first entry file of your webpack config file, and inject XHR code used to request sprite file. This XHR code is used to request sprite file and inject the symbols into your HTML document for sprite usage.

This option allows you to turn this feature off and not inject XHR code into any entry files. This is useful if you want to use server side to inject the sprite file contents into DOM instead.

Please note, if you turn this feature off and are trying to write your own XHR request, you must not use [hash] flags in our filename option from above to predict.

### xhrPath
If you choose to use the xhr option from above, the default request location will be output location + filename (including hash flag if specified in filename option). However if you want to overload this default location you can do so with this option. Please note this setting is absolute pathing while without this setting the request location is relative to output location of sprite file.

### xhrEntry
As mention above, the xhr code for requesting sprite file will be injected into your webpack config's FIRST main entry file. If you would like to specify is specific entry file this option allows you to specificy what entry file to inject the XHR code into. This is useful if your webpack config has code splitting within multiple entry files.

