const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

const config = {
  entry: {
    testA: path.resolve(__dirname, 'test.a.js'),
    testB: path.resolve(__dirname, 'test.b.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist/entry-js-multi'), 
    filename: '../entry-js-multi/[name].js'
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../entry-js-multi/images/'
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
    new HtmlWebPackPlugin({
      'template': './test/test.a.html',
      'filename': './index.a.html',
    }),    
    new HtmlWebPackPlugin({
      'template': './test/test.b.html',
      'filename': './index.b.html',
    }), 
    new WebpackSVGSpritely({
      output: '/images',
      insert: 'xhr', // is default
      entry: ['testB', 'test.a.js']
    })
  ];
  return config;
};
