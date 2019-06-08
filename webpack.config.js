const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = {
  mode: 'development',
  target: 'node',
  externals: [ nodeExternals() ],
  entry: {
    main: './index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'index.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['*', '.ts', '.js'],
  },
  module: {
    rules: [{ test: /\.ts$/, loader: 'babel-loader' }],
  },
}
