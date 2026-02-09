const path = require('path');

const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const _webpack = require('webpack');

/**
 * IMPORTANT: VS Code webviews enforce a strict CSP (no `eval` by default).
 * So we must avoid `eval-*` devtools in the webview bundle, otherwise the editor
 * will appear blank forever with only console errors.
 *
 * Also note: `webpack --mode production` does NOT reliably set NODE_ENV in all setups,
 * so we derive `isProd` from webpack's `argv.mode`.
 */
module.exports = (_env, argv) => {
  const isProd = argv?.mode === 'production';

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
    // Webview CSP blocks eval(), so never use eval-based devtools here.
    devtool: 'source-map',
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      modules: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../node_modules')
      ],
      alias: {
        '@kotor': path.resolve(__dirname, '../../src'),
        '@forge': path.resolve(__dirname, '../../src/apps/forge'),
        'three': path.resolve(__dirname, '../../node_modules/three'),
        // Forge app.scss uses ~bootstrap and ~@fortawesome; resolve from root
        '~bootstrap': path.resolve(__dirname, '../../node_modules/bootstrap'),
        '~@fortawesome/fontawesome-free': path.resolve(__dirname, '../../node_modules/@fortawesome/fontawesome-free')
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
            // Always extract, since the webview HTML links `webview.css`
            MiniCssExtractPlugin.loader,
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

  return [extensionConfig, webviewConfig];
};
