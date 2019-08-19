const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

// test webpack config
const config = {
  entry: {
    testA: path.resolve(__dirname, 'test.a.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist'), 
    filename: '../dist/path/[name].js',
    pathinfo: false
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../dist/path/images/' // see package.json
          }
        }
      ]
    }]
  },
  optimization: {
    minimize: false
  } 
};

// Prod vs. Dev config customizing
module.exports = (env, argv) => {
  config.plugins = [
    new WebpackSVGSpritely({
      output: 'path/images/',
      xhrPath: '/~/custom/path/to/svg'
    })
  ];
  return config;
};
