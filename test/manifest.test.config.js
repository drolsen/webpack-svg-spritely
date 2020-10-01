const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

const config = {
  entry: path.resolve(__dirname, 'test.a.js'),
  output: {
    path: path.resolve(__dirname, '../dist/manifest'), 
    filename: '../manifest/[name].js'
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../manifest/images/'
          }
        }
      ]
    }]
  },
  optimization: {
    minimize: false
  } 
};

module.exports = (env, argv) => {
  config.plugins = [
    new CleanWebpackPlugin(),
    new WebpackSVGSpritely({
      output: '/images',
      manifest: 'icon-manifest.json'
    })
  ];
  return config;
};
