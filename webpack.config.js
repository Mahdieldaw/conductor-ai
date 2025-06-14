const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Define three entry points, one for each major part of the extension
  entry: {
    background: './src/background/service-worker.js',
    content: './src/content/content.js',
    popup: './src/popup/popup.js',
  },
  // Output the bundled files to the 'dist' directory
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean the dist folder before each build
  },
  // Configure plugins
  plugins: [
    // Copy static assets like the manifest and popup HTML to the dist directory
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.v3.json', to: 'manifest.json' },
        { from: 'src/popup/popup.css', to: 'popup.css' }
      ],
    }),
    // Generate the popup.html file, injecting the popup.js script
    new HtmlWebpackPlugin({
      template: 'src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'], // Only include the popup chunk
    }),
  ],
  // Development tools
  devtool: 'cheap-module-source-map',
  // Module resolution rules
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  // Configure how modules are resolved
  resolve: {
    extensions: ['.js'],
  },
};
