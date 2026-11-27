const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
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
  name: 'forge',
  mode: isProd ? 'production' : 'development',
  cache: makeCache('forge', __filename),
  ...makeProdOptimization(),
  entry: {
    forge: [
      './src/apps/forge/index.tsx',
    ]
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
          tsconfig: 'tsconfig.forge.json',
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
      template: 'src/apps/forge/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/forge", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
        {
          from: "node_modules/lip-sync-engine/dist/wasm",
          to: "wasm",
        },
        {
          from: "node_modules/lip-sync-engine/dist/worker.js",
          to: "wasm/worker.js",
        },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
    new MonacoWebpackPlugin({
      publicPath: '/monaco',
      globalAPI: true,
      languages: ['json']
    }),
  ],
  resolve: commonResolve,
  externals: {
    fs: 'window.fs',
    three: 'THREE',
    '@apps/forge/KotOR': 'KotOR',
    '@/apps/forge/KotOR': 'KotOR',
    '@/KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist/forge'),
    globalObject: 'this',
    ...makeDevOutput('/forge/', 'kotor-forge'),
    assetModuleFilename: (pathData) => {
      const { filename } = pathData;
      if (filename.endsWith('.ts')) {
        return '[name].js';
      } else {
        return '[name][ext]';
      }
    },
  },
});
