const path = require('path');

module.exports = {
  entry: './src/main.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'widget.js',
    path: path.resolve(__dirname, '../backend/public/widget'),
    library: 'AIWidget',
    libraryTarget: 'umd',
    clean: true,
  }
};
