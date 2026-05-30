const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { ROOT, isProd, cssRule, scssRule, assetRules, commonStats, commonResolve, makeDefinePlugin, makeWebpackBar } = require('./common');

module.exports = (name, color) => ({
  mode: isProd ? 'production' : 'development',
  entry: {
    launcher: [
      './src/apps/launcher/index.tsx'
    ],
  },
  stats: commonStats,
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'esnext',
          tsconfig: 'tsconfig.launcher.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    makeWebpackBar(name, color),
    makeDefinePlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/launcher/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/launcher", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
  ],
  resolve: commonResolve,
  externals: {
    fs: 'window.fs',
    three: 'THREE'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist/launcher'),
  },
});
