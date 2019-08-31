const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackSVGSpritely = require('../index.js');
const path = require('path');

// test webpack config
const config = {
  entry: {
    testA: path.resolve(__dirname, 'test.a.js')
  },
  output: {
    path: path.resolve(__dirname, '../dist/filename'), 
    filename: '../filename/[name].js'
  },
  module: {
    rules: [{
      'test': /\.svg/i,
      'use': [
        {
          'loader': 'file-loader', // (see: https://www.npmjs.com/package/file-loader)
          'options': {
            'name': '[name].[ext]',
            'outputPath': '../filename/images/'
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
      filename: 'custom-[hash].svg'
    })
  ];
  return config;
};
