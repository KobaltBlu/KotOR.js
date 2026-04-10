const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

// Extension Host (Node.js) configuration
const extensionConfig = {
  target: 'node',
  mode: isProd ? 'production' : 'development',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: isProd ? 'source-map' : 'eval-source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@kotor': path.resolve(__dirname, '../../src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'esbuild-loader',
            options: {
              loader: 'ts',
              target: 'es2020'
            }
          }
        ]
      }
    ]
  }
};

// Webview (Browser) configuration
const webviewConfig = {
  target: 'web',
  mode: isProd ? 'production' : 'development',
  entry: './src/webview/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/webview'),
    filename: 'webview.js'
  },
  devtool: isProd ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@kotor': path.resolve(__dirname, '../../src'),
      '@forge': path.resolve(__dirname, '../../src/apps/forge'),
      // Externalize three to be loaded from CDN or bundled separately
      'three': path.resolve(__dirname, '../../node_modules/three')
    },
    fallback: {
      path: require.resolve('path-browserify'),
      fs: false,
      crypto: false
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'esbuild-loader',
            options: {
              loader: 'tsx',
              target: 'es2020',
              jsx: 'automatic'
            }
          }
        ]
      },
      {
        test: /\.s?css$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              api: 'modern'
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'webview.css'
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, '../../src/apps/forge/assets'),
          to: path.resolve(__dirname, 'dist/webview/assets'),
          noErrorOnMissing: true
        }
      ]
    })
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};

module.exports = [extensionConfig, webviewConfig];
