'use strict'

const s3 = require('./lib/s3')

function adapter (provider) {
  if (provider === 's3') {
    return s3
  }
}

adapter.s3 = s3

exports = module.exports = adapter
