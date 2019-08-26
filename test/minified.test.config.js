const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

// test webpack config
const config = {
  entry: path.resolve(__dirname, 'test.a.js'),
  output: {
    path: path.resolve(__dirname, '../dist/minification'), 
    filename: '../minification/[name].js',
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
            'outputPath': '../minification/images/' // see package.json
          }
        }
      ]
    }]
  },
  optimization: {
    minimize: true
  } 
};

// Prod vs. Dev config customizing
module.exports = (env, argv) => {
  config.plugins = [
    new CleanWebpackPlugin(),
    new WebpackSVGSpritely({
      output: '/images'
    })
  ];
  return config;
};
