const path = require('path');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  mode: 'development',
  entry: {
    forge: [
      './src/apps/forge/forge.ts', 
      './src/apps/forge/forge.scss'
    ],
    "worker-tex": [
      './src/worker/worker-tex.ts'
    ],
    // preload: [
    //   './src/apps/forge/preload.ts',
    // ]
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
				test: /\.css$/,
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.ttf$/,
				use: ['file-loader']
			},
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            configFile: "tsconfig.forge.json"
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
              publicPath: 'dist/forge',
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
      Buffer: ['buffer', 'Buffer'],
      // $: "jquery",
      // jQuery: "jquery"
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/forge/forge.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/forge", to: "" },
        { from: "src/apps/forge/preload.js", to: "" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'forge.css'
    }),
    new MonacoWebpackPlugin({
      publicPath: '/monaco',
      globalAPI: true,
      languages: []
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
    path: path.resolve(__dirname, 'dist/forge'), 
  },
};