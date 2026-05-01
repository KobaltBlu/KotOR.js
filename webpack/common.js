const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const ROOT = path.resolve(__dirname, '..');

const packageJson = require('../package.json');
const version = packageJson.version;

const isProd = (process.env.NODE_ENV?.trim() === 'production');

const srcPath = path.resolve(ROOT, 'src');

const scssRule = {
  test: /\.scss$/i,
  use: [
    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        url: false,
        sourceMap: !isProd
      }
    },
    {
      loader: 'sass-loader',
      options: {
        sourceMap: !isProd
      }
    }
  ]
};

const cssRule = {
  test: /\.css$/i,
  use: [
    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        url: false,
        sourceMap: !isProd
      }
    }
  ]
};

const assetRules = [
  {
    test: /\.(png|svg|jpg|jpeg|gif)$/i,
    type: 'asset/resource',
  },
  {
    test: /\.(woff|woff2|eot|ttf|otf)$/i,
    type: 'asset/resource',
  },
  {
    test: /\.html$/,
    use: 'raw-loader'
  }
];

const commonStats = {
  colors: true,
  hash: false,
  version: false,
  timings: false,
  assets: false,
  chunks: false,
  modules: false,
  reasons: false,
  children: false,
  source: false,
  errors: true,
  errorDetails: false,
  warnings: false,
  publicPath: false
};

const commonResolve = {
  alias: {
    '@': srcPath,
    three: path.resolve(ROOT, 'node_modules/three')
  },
  extensions: ['.tsx', '.ts', '.js'],
  fallback: {
    "path": require.resolve("path-browserify"),
  }
};

function makeDefinePlugin() {
  return new webpack.DefinePlugin({
    'process.env.VERSION': JSON.stringify(version),
    'VERSION': JSON.stringify(version),
  });
}

function makeWebpackBar(name, color) {
  return new WebpackBar({
    color,
    name,
    reporters: ['fancy'],
  });
}

module.exports = {
  ROOT,
  version,
  isProd,
  srcPath,
  scssRule,
  cssRule,
  assetRules,
  commonStats,
  commonResolve,
  makeDefinePlugin,
  makeWebpackBar,
};
