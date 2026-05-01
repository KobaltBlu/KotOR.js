const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const { ROOT, isProd, cssRule, scssRule, assetRules, commonStats, commonResolve, makeDefinePlugin, makeWebpackBar } = require('./common');

module.exports = (name, color) => ({
  mode: isProd ? 'production' : 'development',
  entry: {
    forge: [
      './src/apps/forge/index.tsx',
      './src/worker/worker-tex.ts'
    ]
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
          tsconfig: 'tsconfig.forge.json',
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
      template: 'src/apps/forge/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/forge", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
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
    '@/apps/forge/KotOR': 'KotOR',
    '@/KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist/forge'),
    globalObject: 'this',
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
