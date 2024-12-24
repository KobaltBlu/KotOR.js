const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CircularDependencyPlugin = require('circular-dependency-plugin');

const isProd = (process.env.NODE_ENV?.trim() === 'production');
console.log('NODE_ENV', process.env.NODE_ENV);
console.log('isProd', isProd ? 'true' : 'false');

const libraryConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    KotOR: [
      './src/KotOR.ts'
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
  devtool: !isProd ? 'eval-source-map' : undefined,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.html$/,
        use: 'raw-loader'
      },
    ],
  },
  plugins: [
    // new CircularDependencyPlugin({
    //   // exclude detection of files based on a RegExp
    //   exclude: /a\.js|node_modules/,
    //   // include specific files based on a RegExp
    //   include: /src/,
    //   // add errors to webpack instead of warnings
    //   failOnError: true,
    //   // allow import cycles that include an asyncronous import,
    //   // e.g. via import(/* webpackMode: "weak" */ './file.js')
    //   allowAsyncCycles: false,
    //   // set the current working directory for displaying module paths
    //   cwd: process.cwd(),
    // }),
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/icons", to: "assets/icons" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
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
      // "buffer": require.resolve("buffer"),
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
      './src/apps/launcher/launcher.tsx', 
      './src/apps/launcher/app.scss'
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
  devtool: !isProd ? 'eval-source-map' : undefined,
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
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/launcher/launcher.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/launcher", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'launcher.css'
    }),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three')
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
      // "buffer": require.resolve("buffer"),
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
      './src/apps/game/game.ts', 
      './src/apps/game/game.scss'
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
  devtool: !isProd ? 'eval-source-map' : undefined,
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
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/game/game.html'
    }),
    new CopyPlugin({
      patterns: [
        // { from: "src/assets/game", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'game.css'
    }),
  ],
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three')
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      "path": require.resolve("path-browserify"),
      // "buffer": require.resolve("buffer"), 
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
  },
});

const forgeConfig = (name, color) => ({
  mode: isProd ? 'production': 'development',
  entry: {
    forge: [
      './src/apps/forge/forge.tsx', 
      './src/apps/forge/forge.scss',
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
  devtool: !isProd ? 'eval-source-map' : undefined,
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
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/forge/forge.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "src/assets/forge", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'forge.css'
    }),
    new MonacoWebpackPlugin({
      publicPath: '/monaco',
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
      // "buffer": require.resolve("buffer"), 
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
      './src/apps/debugger/debugger.tsx', 
      './src/apps/debugger/debugger.scss'
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
  devtool: !isProd ? 'eval-source-map' : undefined,
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
            configFile: "tsconfig.debugger.json"
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
              publicPath: 'dist/debugger',
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
    new WebpackBar({
      color,
      name,
      reporters: ['fancy'],
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'src/apps/debugger/debugger.html'
    }),
    new CopyPlugin({
      patterns: [
        // { from: "src/assets/debugger", to: "" },
        { from: "src/assets/icons/icon.ico", to: "favicon.ico" },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'debugger.css'
    }),
    new MonacoWebpackPlugin({
      publicPath: '/monaco',
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
      // "buffer": require.resolve("buffer"), 
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