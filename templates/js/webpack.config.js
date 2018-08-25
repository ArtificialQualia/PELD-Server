const webpack = require('webpack');
const path = require('path');
//const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const config = {
//    plugins: [
//      new BundleAnalyzerPlugin()
//    ],
    entry:  path.resolve(__dirname, 'index.jsx'),
    output: {
        path: path.resolve(__dirname, '../../static/dist'),
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.js', '.jsx', '.css']
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 
            {
              loader: 'css-loader',
              options: {
                url: false
              }
            }
          ]
        },
        {
          test: /\.jsx?/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: ['react'],
                plugins: ["transform-decorators-legacy"]
              }
            }
          ],
        }
      ]
    }
};
module.exports = config;