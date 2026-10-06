const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const {
  ROOT,
  isProd,
  cssRule,
  scssRule,
  assetRules,
  commonStats,
  commonResolve,
  makeCache,
  makeProdOptimization,
  makeDevtool,
  makeDefinePlugin,
  makeWebpackBar,
  makeHmrPlugins,
  makeDevOutput,
  makeReactEsbuildOptions,
} = require('./common');

module.exports = (barName, color) => ({
  name: 'launcher',
  mode: isProd ? 'production' : 'development',
  cache: makeCache('launcher', __filename),
  ...makeProdOptimization(),
  entry: {
    launcher: [
      './src/apps/launcher/index.tsx'
    ],
  },
  stats: commonStats,
  devtool: makeDevtool('app'),
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: makeReactEsbuildOptions({
          loader: 'tsx',
          target: 'esnext',
          tsconfig: 'tsconfig.launcher.json',
        }),
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    makeWebpackBar(barName, color),
    makeDefinePlugin(),
    ...makeHmrPlugins(true),
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
    ...makeDevOutput('/launcher/', 'kotor-launcher'),
  },
});
