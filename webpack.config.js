const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // Define entry points for background and content scripts
  entry: {
    background: './src/background/service-worker.js',
    content: './src/content/content.js',
  },
  // Output the bundled files to the 'dist' directory
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true, // Clean the dist folder before each build
  },
  // Configure plugins
  plugins: [
    // Copy manifest.v3.json to dist/manifest.json
    new CopyWebpackPlugin({
      patterns: [{ from: 'manifest.v3.json', to: 'manifest.json' }],
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
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  // Configure how modules are resolved
  resolve: {
    extensions: ['.js'],
  },
};
