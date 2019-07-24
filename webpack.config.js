var HtmlWebpackPlugin = require("html-webpack-plugin");
module.exports = {
  entry: "./test/e2e/ui-components-local.test.tsx",
  output: {
    path: "dist",
    filename: "index_bundle.js"
  },
  resolve: {
    extensions: [".webpack.js", ".web.js", ".ts", ".tsx", ".js", ".jsx", "json"]
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.ts(x?)$/,
        use: [{ loader: "ts-loader" }]
      }
    ]
  },
  plugins: [new HtmlWebpackPlugin()]
};
