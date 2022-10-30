const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: 'development',
  entry: {
    launcher: [
      './src/apps/launcher/launcher.ts', 
      './src/apps/launcher/app.scss'
    ],
    // preload: [
    //   './src/launcher/preload.ts',
    // ]
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: "tsconfig.launcher.json"
          }
        }],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/i,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: 'dist/launcher',
            }
          },
          // "style-loader",
          {
            loader: 'css-loader',
            options: {
              url: false
            }
          },
          // {
          //   loader: 'resolve-url-loader'
          // },
          "sass-loader",
        ]
      },
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
      },
    ],
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      $: "jquery",
      jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/launcher/launcher.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/launcher", to: "" },
        { from: "src/apps/launcher/preload.js", to: "" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'launcher.css'
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
      "buffer": require.resolve("buffer"),
    }
  },
  externals: {
    fs: 'window.fs',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/launcher'),
  },
};