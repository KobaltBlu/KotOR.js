const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const { ROOT, isProd, commonStats, commonResolve, makeDefinePlugin, makeWebpackBar } = require('./common');

module.exports = (name, color) => ({
  mode: isProd ? 'production' : 'development',
  entry: {
    KotOR: [
      './src/KotOR.ts'
    ],
    server: [
      './src/worker/server.ts'
    ],
    'bink-worker': [
      './src/worker/bink-worker.ts'
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
          tsconfig: 'tsconfig.json',
        },
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        use: 'raw-loader'
      },
    ],
  },
  plugins: [
    makeWebpackBar(name, color),
    makeDefinePlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      inject: false,
      templateContent: ({ htmlWebpackPlugin }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=/launcher/">
  <title>KotOR.js - Redirecting...</title>
  <script>
    window.location.href = '/launcher/';
  </script>
</head>
<body>
  <p>If you are not redirected automatically, <a href="/launcher/">click here</a>.</p>
</body>
</html>`
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/icons", to: "assets/icons" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
        { from: 'node_modules/three/build/three.min.js', to: 'three.min.js' },
        { from: 'node_modules/three/build/three.module.js', to: 'three.module.js' },
        { from: 'node_modules/@fortawesome/fontawesome-free/webfonts', to: 'webfonts' },
      ]
    }),
  ],
  resolve: commonResolve,
  externals: {
    fs: 'window.fs',
    three: 'THREE'
  },
  output: {
    library: 'KotOR',
    filename: '[name].js',
    path: path.resolve(ROOT, 'dist'),
    pathinfo: false,
  },
});
