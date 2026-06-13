const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const ROOT = path.resolve(__dirname, '..');

const packageJson = require('../package.json');
const version = packageJson.version;

const isProd = (process.env.NODE_ENV?.trim() === 'production');
const isServe = process.argv.includes('serve');
const isDevServe = !isProd && isServe;

const srcPath = path.resolve(ROOT, 'src');

const scssRule = {
  test: /\.scss$/i,
  use: [
    isProd ? MiniCssExtractPlugin.loader : 'style-loader',
    {
      loader: 'css-loader',
      options: {
        url: false,
        sourceMap: !isProd,
        modules: {
          auto: /\.module\.(scss|sass|css)$/i,
        },
      }
    },
    {
      loader: 'sass-loader',
      options: {
        sourceMap: !isProd,
        sassOptions: {
          loadPaths: [path.join(srcPath, 'apps/forge/styles')],
        },
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

function makeDevServer() {
  return {
    port: 8080,
    hot: true,
    liveReload: false,
    compress: true,
    static: {
      directory: path.resolve(ROOT, 'dist'),
      watch: false,
    },
    devMiddleware: {
      writeToDisk: true,
    },
    historyApiFallback: {
      rewrites: [
        {
          // App routes without a trailing slash (exclude paths with file extensions)
          from: /^\/[^.]*[^/]$/,
          to: (context) => `${context.parsedUrl.pathname}/`,
        },
      ],
    },
    headers: {
      'Cache-Control': 'no-store',
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
    },
    watchFiles: [
      path.resolve(ROOT, 'dist/KotOR.js'),
      path.resolve(ROOT, 'dist/bink-worker.js'),
      path.resolve(ROOT, 'dist/server.js'),
    ],
  };
}

function makeHmrPlugins(isReactApp = false) {
  if (!isDevServe) {
    return [];
  }

  const plugins = [new webpack.HotModuleReplacementPlugin()];

  if (isReactApp) {
    plugins.push(new ReactRefreshWebpackPlugin({ overlay: false }));
  }

  return plugins;
}

function makeDevOutput(publicPath, uniqueName) {
  if (!isDevServe) {
    return {};
  }

  return {
    publicPath,
    uniqueName,
  };
}

function makeReactEsbuildOptions(baseOptions) {
  if (!isDevServe) {
    return baseOptions;
  }

  return {
    ...baseOptions,
    jsx: 'automatic',
    jsxDev: true,
  };
}

module.exports = {
  ROOT,
  version,
  isProd,
  isServe,
  isDevServe,
  srcPath,
  scssRule,
  cssRule,
  assetRules,
  commonStats,
  commonResolve,
  makeDefinePlugin,
  makeWebpackBar,
  makeDevServer,
  makeHmrPlugins,
  makeDevOutput,
  makeReactEsbuildOptions,
};
