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

/**
 * Upload a stream or a buffer to a remote object
 *
 * @param {ReadStream|Buffer} data - Data to upload
 * @param {Object} opts - options
 * @param {String} opts.key - remote object key inside bucket
 * @returns {Promise<Object|Error>} it resolves to an object with `Location` (http url to access bucket)
 */
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
    resumable: false,
    validation: 'crc32c',
    metadata: {}
  }

  if (opts.contentType) {
    params.metadata.contentType = opts.contentType
  }

  params.metadata.cacheControl = opts.cacheControl || 'no-cache'

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

/**
 * Get readable stream from remote object
 *
 * @param {Object} opts - options
 * @param {String} opts.key - remote object key inside bucket
 * @param {String} opts.ifNoneMatch - etag
 * @param {Object} refObj - this object will be extended with etag after request
 * @returns {ReadStream}
 */
Bucket.prototype.getReadStream = function (opts = {}, refObj = {}) {
  if (!opts.key || typeof opts.key !== 'string') {
    throw new Error('you must specify a string as key for uploaded file')
  }

  const remoteFile = this._bucket.file(opts.key)

  if (opts.ifNoneMatch) {
    remoteFile.interceptors.push({
      request: (reqOpts) => {
        reqOpts.headers = reqOpts.headers || {}
        reqOpts.headers['If-None-Match'] = opts.ifNoneMatch
        return reqOpts
      }
    })
  }

  return remoteFile.createReadStream()
    .on('error', (err) => {
      err.statusCode = err.code
    })
    .on('response', (resp) => {
      refObj.etag = resp.headers.etag
    })
}

/**
 * check remote object existence
 *
 * @param {Object} opts - options
 * @param {String} opts.key - remote object key inside bucket
 * @returns {Promise<true|Error>}
 */
Bucket.prototype.exists = function (opts = {}) {
  if (!opts.key || typeof opts.key !== 'string') {
    throw new Error('you must specify a string as key for uploaded file')
  }

  return this._bucket.file(opts.key).exists()
    .then((data) => {
      const exists = data[0]
      if (exists) {
        return exists
      } else {
        throw new Error(`object ${opts.key} does not exist`)
      }
    })
}
