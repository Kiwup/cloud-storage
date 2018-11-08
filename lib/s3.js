'use strict'

const S3 = require('aws-sdk/clients/s3')
const Promise = require('bluebird')
const isStream = require('is-stream')

exports = module.exports = ({ accessKeyId, secretAccessKey, region }) => {
  if (typeof accessKeyId !== 'string') {
    throw new TypeError('Invalid accessKeyId')
  }
  if (typeof secretAccessKey !== 'string') {
    throw new TypeError('Invalid secretAccessKey')
  }
  if (typeof region !== 'string') {
    throw new TypeError('Invalid region')
  }

  const client = new S3({
    apiVersion: '2006-03-01',
    accessKeyId,
    secretAccessKey,
    region
  })

  Promise.promisifyAll(Object.getPrototypeOf(client))

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

  const params = {
    Body: data,
    Key: opts.key,
    Bucket: this.name
  }

  if (opts.acl === 'public') {
    params.ACL = 'public-read'
  }

  if (opts.contentType) {
    params.ContentType = opts.contentType
  }

  return this.storage.client.uploadAsync(params)
})

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

  const params = {
    Bucket: this.name,
    Key: opts.key
  }

  if (opts.ifNoneMatch) {
    params.IfNoneMatch = opts.ifNoneMatch
  }

  const request = this.storage.client.getObject(params)

  request.on('httpHeaders', (statusCode, headers) => {
    refObj.etag = headers.etag
  })

  return request.createReadStream()
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

  const params = {
    Bucket: this.name,
    Key: opts.key
  }

  return this.storage.client.headObjectAsync(params)
    .then((data) => !!data)
}
