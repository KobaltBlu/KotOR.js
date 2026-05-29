const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const {
  ROOT,
  cssRule,
  scssRule,
  assetRules,
  commonStats,
  commonResolve,
  makeDefinePlugin,
  makeWebpackBar,
} = require('./common');

const DEV_PORT = Number(process.env.KOTOR_DEV_PORT || 8080);

/**
 * Game client dev server with HMR. Inlines the KotOR engine module graph so
 * gameplay TypeScript can hot-swap without a full page reload.
 */
module.exports = {
  mode: 'development',
  entry: {
    game: ['./src/apps/game/index.tsx'],
  },
  stats: commonStats,
  devtool: 'eval-source-map',
  devServer: {
    hot: true,
    port: DEV_PORT,
    host: 'localhost',
    open: ['/game/?key=kotor'],
    static: [
      {
        directory: path.resolve(ROOT, 'dist'),
        publicPath: '/',
        watch: true,
      },
    ],
    devMiddleware: {
      publicPath: '/game/',
    },
    historyApiFallback: {
      rewrites: [
        { from: /^\/game\/?$/, to: '/game/index.html' },
        { from: /^\/game\/.*/, to: '/game/index.html' },
      ],
    },
    client: {
      overlay: true,
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'esnext',
          tsconfig: 'tsconfig.game.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules,
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    makeWebpackBar('Game HMR', 'cyan'),
    makeDefinePlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/game/index.hmr.html',
    }),
    new CopyPlugin({
      patterns: [{ from: 'src/assets/icons/icon.ico', to: 'favicon.ico' }],
    }),
  ],
  resolve: commonResolve,
  externals: {
    fs: 'window.fs',
    three: 'THREE',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist/game'),
    publicPath: '/game/',
    globalObject: 'this',
    assetModuleFilename: (pathData) => {
      const { filename } = pathData;
      if (filename.endsWith('.ts')) {
        return '[name].js';
      }
      return '[name][ext]';
    },
  },
};
