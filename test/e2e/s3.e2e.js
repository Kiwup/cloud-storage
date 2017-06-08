'use strict'

const fs = require('fs')
const path = require('path')
const test = require('tape')
const { s3 } = require('../../.')
const {
  uploadPublic,
  uploadPublicWithContentType,
  uploadRestricted
} = require('./upload')

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION) {
  throw new Error('Missing env vars S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_REGION')
}

const samplePath = path.join(__dirname, 'sample.json')
const testBucket = `cloud-storage-e2e-${Date.now()}`
const testObject = 'test'
const storage = s3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: S3_REGION
})

function setup (t) {
  t.test('create test bucket', (t) => {
    // native aws-sdk API
    storage.client.createBucket({
      Bucket: testBucket,
      CreateBucketConfiguration: {
        LocationConstraint: S3_REGION
      }
    }, t.end)
  })
}

function teardown (t) {
  t.test('delete test object', (t) => {
    // native aws-sdk API
    storage.client.deleteObject({
      Bucket: testBucket,
      Key: testObject
    }, t.end)
  })
  t.test('remove test bucket', (t) => {
    // native aws-sdk API
    storage.client.deleteBucket({
      Bucket: testBucket
    }, t.end)
  })
}

test('S3 > upload a buffer with public access', (t) => {
  setup(t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadPublic(storage, testBucket, testObject, t, data)
    })
  })

  teardown(t)
})

test('S3 > upload a buffer with restricted access', (t) => {
  setup(t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadRestricted(storage, testBucket, testObject, t, data)
    })
  })

  teardown(t)
})

test('S3 > upload a buffer publicly and specifying content-type', (t) => {
  setup(t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadPublicWithContentType(storage, testBucket, testObject, t, data)
    })
  })

  teardown(t)
})

test('S3 > upload a stream with public access', (t) => {
  setup(t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublic(storage, testBucket, testObject, t, data)
  })

  teardown(t)
})

test('S3 > upload a stream with restricted access', (t) => {
  setup(t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadRestricted(storage, testBucket, testObject, t, data)
  })

  teardown(t)
})

test('S3 > upload a stream publicly and specifying content-type', (t) => {
  setup(t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublicWithContentType(storage, testBucket, testObject, t, data)
  })

  teardown(t)
})
