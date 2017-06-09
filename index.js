'use strict'

const s3 = require('./lib/s3')
const googleStorage = require('./lib/google_storage')

function adapter (provider) {
  if (provider === 's3') {
    return s3
  } else if (provider === 'googleStorage') {
    return googleStorage
  }
  throw new Error('unsupported provider. must be `s3` or `googleStorage`')
}

adapter.s3 = s3
adapter.googleStorage = googleStorage

exports = module.exports = adapter
