const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CircularDependencyPlugin = require('circular-dependency-plugin');

// Read version from package.json
const packageJson = require('./package.json');
const version = packageJson.version;

const isProd = (process.env.NODE_ENV?.trim() === 'production');
console.log('NODE_ENV', process.env.NODE_ENV);
console.log('isProd', isProd ? 'true' : 'false');

// Common SCSS rule for all configs
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

// Common CSS rule for Monaco Editor and other CSS files
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

// Common asset rules
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

const libraryConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    KotOR: [
      './src/KotOR.ts'
    ],
    server: [
      './src/worker/server.ts'
    ]
  },
  stats: {
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
  },
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2019',
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
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
      'VERSION': JSON.stringify(version),
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/icons", to: "assets/icons" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
        { from: "src/assets/runtime/index.html", to: "index.html" },
        { from: "src/assets/runtime/runtime-config.js", to: "runtime-config.js" },
        { from: 'node_modules/three/build/three.min.js', to: 'three.min.js' },
        { from: 'node_modules/three/build/three.module.js', to: 'three.module.js' }
      ]
    }),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three')
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  externals: {
    fs: 'window.fs',
    three: 'THREE'
  },
  output: {
    library: 'KotOR',
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    pathinfo: false,
  },
});

const launcherConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    launcher: [
      './src/apps/launcher/index.tsx'
    ],
  },
  stats: {
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
  },
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2019',
          tsconfig: 'tsconfig.launcher.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
      'VERSION': JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/launcher/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/launcher", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three')
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  externals: {
    fs: 'window.fs',
    three: 'THREE'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/launcher'),
  },
});

const gameConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    game: [
      './src/apps/game/index.tsx'
    ]
  },
  stats: {
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
  },
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2019',
          tsconfig: 'tsconfig.game.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
      'VERSION': JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/game/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three')
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  externals: {
    fs: 'window.fs',
    three: 'THREE',
    '../../KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/game'),
    globalObject: 'this',
    assetModuleFilename: (pathData) => {
      const { filename } = pathData;
      if (filename.endsWith('.ts')) {
          return '[name].js';
      } else {
          return '[name][ext]';
      }
    },
  },
});

const forgeConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    forge: [
      './src/apps/forge/index.tsx',
      './src/worker/worker-tex.ts'
    ]
  },
  stats: {
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
  },
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2019',
          tsconfig: 'tsconfig.forge.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
      'VERSION': JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/forge/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/forge", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
    new MonacoWebpackPlugin({
      publicPath: 'monaco',
      globalAPI: true,
      languages: ['json']
    }),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three'),
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  externals: {
    fs: 'window.fs',
    three: 'THREE',
    '../../KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/forge'),
    globalObject: 'this',
    assetModuleFilename: (pathData) => {
      const { filename } = pathData;
      if (filename.endsWith('.ts')) {
          return '[name].js';
      } else {
          return '[name][ext]';
      }
    },
  },
});

const debuggerConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    debugger: [
      './src/apps/debugger/index.tsx'
    ]
  },
  stats: {
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
  },
  devtool: !isProd ? 'eval-source-map' : 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2019',
          tsconfig: 'tsconfig.debugger.json',
        },
        exclude: /node_modules/,
      },
      cssRule,
      scssRule,
      ...assetRules
    ],
  },
  plugins: [
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new webpack.DefinePlugin({
      'process.env.VERSION': JSON.stringify(version),
      'VERSION': JSON.stringify(version),
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/debugger/index.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    ...(isProd ? [new MiniCssExtractPlugin({
      filename: 'style.css'
    })] : []),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three'),
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
    }
  },
  externals: {
    fs: 'window.fs',
    three: 'THREE',
    '../../KotOR': 'KotOR',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist/debugger'),
    globalObject: 'this',
    assetModuleFilename: (pathData) => {
      const { filename } = pathData;
      if (filename.endsWith('.ts')) {
          return '[name].js';
      } else {
          return '[name][ext]';
      }
    },
  },
});

module.exports = [
  libraryConfig('KotOR.js', 'green'),
  launcherConfig('Launcher', 'orange'),
  gameConfig('Game Client', 'blue'),
  forgeConfig('Forge Client', 'yellow'),
  debuggerConfig('Debugger', 'purple'),
];
