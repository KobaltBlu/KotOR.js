const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: 'development',
  entry: {
    game: [
      './src/apps/game/game.ts', 
      './src/apps/game/game.scss'
    ],
    // preload: [
    //   './src/apps/game/preload.ts',
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
            configFile: "tsconfig.game.json"
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
              publicPath: 'dist/game',
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
    ],
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
      // Buffer: ['buffer', 'Buffer'],
      // $: "jquery",
      // jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/game/game.html'
    }),
    new CopyPlugin({
      patterns: [
        // { from: "src/assets/game", to: "" },
        { from: "src/apps/game/preload.js", to: "" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'game.css'
    })
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // "path": require.resolve("path-browserify"),
      // "buffer": require.resolve("buffer"), 
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/game'),
  },
};