var HtmlWebpackPlugin = require("html-webpack-plugin");
var webpack = require("webpack");

module.exports = {
  entry: "./test/e2e/ui-components-local.test.tsx",
  output: {
    path: "dist",
    filename: "index_bundle.js"
  },
  resolve: {
    extensions: [
      ".webpack.js",
      ".web.js",
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      "json"
    ],
    alias: {
      fs: "browserfs/dist/shims/fs.js",
      buffer: "browserfs/dist/shims/buffer.js",
      path: "browserfs/dist/shims/path.js",
      processGlobal: "browserfs/dist/shims/process.js",
      bufferGlobal: "browserfs/dist/shims/bufferGlobal.js",
      bfsGlobal: require.resolve("browserfs")
    }
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: [{ loader: "ts-loader" }]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin(),
    // Expose BrowserFS, process, and Buffer globals.
    // NOTE: If you intend to use BrowserFS in a script tag, you do not need
    // to expose a BrowserFS global.
    new webpack.ProvidePlugin({
      BrowserFS: "bfsGlobal",
      process: "processGlobal",
      Buffer: "bufferGlobal"
    })
  ],
  // DISABLE Webpack's built-in process and Buffer polyfills!
  node: {
    process: false,
    Buffer: false
  }
};
