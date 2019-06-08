const config = require('./webpack.config.js')
module.exports = Object.assign(config, {
  optimization: {
    nodeEnv: false,
  },
  devtool: 'source-map',
  module: {
    rules: [
      ...config.module.rules,
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
      },
    ],
  },
})
