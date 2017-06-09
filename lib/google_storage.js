'use strict'

const { PassThrough } = require('stream')
const gcs = require('@google-cloud/storage')
const Promise = require('bluebird')
const isStream = require('is-stream')

const defaultOptions = {
  promise: Promise
}

exports = module.exports = (opts = {}) => {
  const options = Object.assign({}, defaultOptions, opts)
  const client = gcs(options)

  return new Storage(client)
}

function Storage (client) {
  this.client = client
  return this
}

Storage.prototype.bucket = function (name) {
  return new Bucket(this, name)
}

function Bucket (storage, name) {
  if (!name || typeof name !== 'string') {
    throw new Error('you must give a name to your bucket')
  }
  this.storage = storage
  this.name = name
  this._bucket = storage.client.bucket(name)
  return this
}

Bucket.prototype.upload = Promise.method(function (data, opts = {}) {
  if (!opts.key || typeof opts.key !== 'string') {
    throw new Error('you must specify a string as key for uploaded file')
  }
  if (!(isStream(data)) && !(Buffer.isBuffer(data))) {
    throw new Error('data should a readable stream or a buffer')
  }
  const newFile = this._bucket.file(opts.key)

  let inputStream = data

  if (!(isStream(data))) {
    inputStream = new PassThrough()
    inputStream.end(data)
  }

  const params = {
    predefinedAcl: opts.acl === 'public' ? 'publicRead' : 'projectPrivate',
    metadata: {}
  }

  if (opts.contentType) {
    params.metadata.contentType = opts.contentType
  }

  return new Promise((resolve, reject) => {
    inputStream
      .pipe(newFile.createWriteStream(params))
      .on('error', reject)
      .on('finish', () => {
        resolve({ Location: this.getUrl(opts.key) })
      })
  })
})

Bucket.prototype.getUrl = function (key) {
  return `http://storage.googleapis.com/${this.name}/${key}`
}
