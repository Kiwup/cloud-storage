'use strict'

const request = require('request-promise')

const uploadPublicWithContentType = (storage, testBucket, testObject, t, data) => {
  const bucket = storage.bucket(testBucket)
  bucket.upload(data, {key: testObject, acl: 'public', contentType: 'application/json'})
    .then((result) => {
      t.ok(result && result.Location, 'upload OK')
      return result.Location
    })
    .then((url) => request({
      uri: url,
      transform: (body, response) => {
        t.equal(response.headers['content-type'], 'application/json')
        return JSON.parse(body)
      }
    }))
    .then((data) => {
      t.equal(data.test, 'ok')
      t.end()
    })
    .catch(t.end)
}

const uploadPublic = (storage, testBucket, testObject, t, data) => {
  const bucket = storage.bucket(testBucket)
  const start = new Date()
  bucket.upload(data, {key: testObject, acl: 'public'})
    .then((result) => {
      t.ok(result && result.Location, 'upload OK')
      console.log(`upload time: ${new Date() - start}ms`)
      return result.Location
    })
    .then((url) => request.get({ url, json: true }))
    .then((data) => {
      t.equal(data.test, 'ok')
      t.end()
    })
    .catch(t.end)
}

const uploadRestricted = (storage, testBucket, testObject, t, data) => {
  const bucket = storage.bucket(testBucket)
  bucket.upload(data, {key: testObject})
    .then((result) => {
      t.ok(result && result.Location, 'upload OK')
      return result.Location
    })
    .then((url) => request.get({ url, json: true }))
    .then((data) => {
      t.end(new Error('Object should not be accessible'))
    })
    .catch((err) => {
      t.equal(err.statusCode, 403, 'Object access is not authorized')
      t.end()
    })
}

module.exports = {
  uploadPublicWithContentType,
  uploadPublic,
  uploadRestricted
}
