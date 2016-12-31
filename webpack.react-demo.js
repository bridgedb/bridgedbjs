var HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  entry: './src/ui/react-demo.tsx',
  output: {
    path: 'dist',
    filename: 'index_bundle.js'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    loaders: [
      { test: /\.ts(x?)$/, loader: 'ts-loader' }
    ]
  },
  plugins: [new HtmlWebpackPlugin()]
};
