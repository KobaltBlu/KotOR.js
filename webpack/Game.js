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
  name: 'game',
  mode: isProd ? 'production' : 'development',
  cache: makeCache('game', __filename),
  ...makeProdOptimization(),
  entry: {
    game: [
      './src/apps/game/index.tsx'
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
          tsconfig: 'tsconfig.game.json',
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
      template: 'src/apps/game/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/game", to: "" },
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
    three: 'THREE',
    '@apps/game/KotOR': 'KotOR',
    '@/apps/game/KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist/game'),
    globalObject: 'this',
    ...makeDevOutput('/game/', 'kotor-game'),
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
