const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/KotOR.ts',
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer"),
    }
  },
  externals: {
    fs: 'window.fs',
  },
  output: {
    library: 'KotOR',
    filename: 'KotOR.js',
    path: path.resolve(__dirname, 'dist'),
  },
};