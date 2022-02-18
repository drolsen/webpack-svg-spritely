const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

const config = {
  entry: {
    testA: path.resolve(__dirname, 'test.a.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist/minification'), 
    filename: '../minification/[name].js'
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../minification/images/'
          }
        }
      ]
    }]
  } 
};

module.exports = (env, argv) => {
  config.plugins = [
    new CleanWebpackPlugin(),
    new WebpackSVGSpritely({
      output: '/images',
      insert: 'xhr'
    })
  ];
  return config;
};
