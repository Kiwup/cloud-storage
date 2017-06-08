'use strict'

const S3 = require('aws-sdk/clients/s3')
const Promise = require('bluebird')
const isStream = require('is-stream')

exports = module.exports = ({accessKeyId, secretAccessKey, region}) => {
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
