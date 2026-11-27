const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');

const ROOT = path.resolve(__dirname, '..');

const packageJson = require('../package.json');
const version = packageJson.version;

const isProd = (process.env.NODE_ENV?.trim() === 'production');
const isServe = process.argv.includes('serve');
const isDevServe = !isProd && isServe;
const isVerbose = process.env.WEBPACK_VERBOSE === '1';

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

const commonStats = isVerbose
  ? {
      colors: true,
      hash: true,
      version: true,
      timings: true,
      assets: true,
      chunks: true,
      modules: false,
      reasons: false,
      children: false,
      source: false,
      errors: true,
      errorDetails: true,
      warnings: true,
      publicPath: true,
    }
  : {
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
      publicPath: false,
    };

const commonResolve = {
  alias: {
    '@core': path.resolve(srcPath, 'core'),
    '@engine': path.resolve(srcPath, 'engine'),
    '@apps': path.resolve(srcPath, 'apps'),
    '@assets': path.resolve(srcPath, 'assets'),
    '@': srcPath,
    three: path.resolve(ROOT, 'node_modules/three')
  },
  extensions: ['.tsx', '.ts', '.js'],
  fallback: {
    "path": require.resolve("path-browserify"),
  }
};

/** Webpack filesystem cache keyed per compiler + mode. */
function makeCache(name, configPath) {
  const mode = isProd ? 'prod' : (isDevServe ? 'serve' : 'dev');
  return {
    type: 'filesystem',
    name: `kotor-${name}-${mode}`,
    buildDependencies: {
      config: [
        __filename,
        path.resolve(ROOT, 'webpack.config.js'),
        configPath,
      ].filter(Boolean),
    },
  };
}

/** Prod minify via esbuild (matches esbuild-loader transpile). */
function makeProdOptimization() {
  if (!isProd) return {};
  return {
    optimization: {
      minimizer: [
        new EsbuildPlugin({
          target: 'esnext',
          css: true,
        }),
      ],
    },
  };
}

/** Dev source maps: richer for library, cheaper for apps. Prod: none. */
function makeDevtool(kind = 'app') {
  if (isProd) return false;
  if (process.env.WEBPACK_DEVTOOL) return process.env.WEBPACK_DEVTOOL;
  return kind === 'library' ? 'eval-source-map' : 'eval-cheap-module-source-map';
}

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
      // Keep dist/ in sync for F5 debugging, but never write HMR payloads —
      // each update uses a unique hash and would otherwise accumulate forever.
      writeToDisk: (filePath) => !/\.hot-update\./.test(filePath),
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
        // Keep runtime/console errors in the browser console only;
        // the fullscreen overlay blocks the game client in dev.
        runtimeErrors: false,
      },
    },
    watchFiles: [
      path.resolve(ROOT, 'dist/KotOR.js'),
      path.resolve(ROOT, 'dist/bink-worker.js'),
      path.resolve(ROOT, 'dist/worker-tex.js'),
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

/**
 * three@0.186+ no longer ships three.min.js. Apps load THREE as a global
 * (webpack externals: three → THREE). Build a browser IIFE into the cache dir.
 * Skips rebuild when the output is newer than the three entry.
 */
function ensureThreeGlobalBundle() {
  const esbuild = require('esbuild');
  const entry = path.resolve(ROOT, 'node_modules/three/build/three.module.js');
  const outDir = path.resolve(ROOT, 'node_modules/.cache/three-global');
  const outfile = path.join(outDir, isProd ? 'three.prod.min.js' : 'three.dev.js');

  fs.mkdirSync(outDir, { recursive: true });

  let needsBuild = true;
  try {
    const inStat = fs.statSync(entry);
    const outStat = fs.statSync(outfile);
    needsBuild = outStat.mtimeMs < inStat.mtimeMs;
  } catch {
    needsBuild = true;
  }

  if (needsBuild) {
    esbuild.buildSync({
      entryPoints: [entry],
      bundle: true,
      format: 'iife',
      globalName: 'THREE',
      outfile,
      minify: isProd,
      logLevel: 'silent',
    });
  }

  return outfile;
}

module.exports = {
  ROOT,
  version,
  isProd,
  isServe,
  isDevServe,
  isVerbose,
  srcPath,
  scssRule,
  cssRule,
  assetRules,
  commonStats,
  commonResolve,
  makeCache,
  makeProdOptimization,
  makeDevtool,
  makeDefinePlugin,
  makeWebpackBar,
  makeDevServer,
  makeHmrPlugins,
  makeDevOutput,
  makeReactEsbuildOptions,
  ensureThreeGlobalBundle,
};
