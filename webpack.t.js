module.exports = Object.assign(require('./webpack.config.js'), {
  optimization: {
    nodeEnv: false,
  },
})
