const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

// test webpack config
const config = {
  entry: {
    testA: path.resolve(__dirname, 'test.a.js'),
    testB: path.resolve(__dirname, 'test.b.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist/entry-js'), 
    filename: '../entry-js/[name].js'
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../entry-js/images/' // see package.json
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
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin([
      { from: 'test/test.a.html' },
      { from: 'test/test.b.html' }
    ]),    
    new WebpackSVGSpritely({
      output: '/images',
      insert: 'xhr', // is default
      entry: 'testB'
    })
  ];
  return config;
};
