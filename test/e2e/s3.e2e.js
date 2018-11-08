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
const {
  getReadStream,
  getReadStreamIfNoneMatch
} = require('./get_read_stream')

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env

if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_REGION) {
  throw new Error('Missing env vars S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and S3_REGION')
}

const samplePath = path.join(__dirname, 'sample.json')
const testObject = 'test'
const storage = s3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  region: S3_REGION
})

function setup (testBucket, t) {
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

function teardown (testBucket, t) {
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

const testBucket = `cloud-storage-e2e-${Date.now()}`

test('S3 > upload a buffer with public access', (t) => {
  setup(testBucket, t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadPublic(storage, testBucket, testObject, t, data)
    })
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('S3 > upload a buffer with restricted access', (t) => {
  const refObj = {}
  setup(testBucket, t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadRestricted(storage, testBucket, testObject, t, data)
    })
  })

  t.test('stream back uploaded buffer', (t) => {
    getReadStream(storage, testBucket, testObject, t, refObj)
  })

  t.test('stream back uploaded buffer (using previous etag)', (t) => {
    getReadStreamIfNoneMatch(storage, testBucket, testObject, t, refObj.etag)
  })

  t.test('stream back uploaded buffer (using a fake etag)', (t) => {
    getReadStream(storage, testBucket, testObject, t, {}, 'shouldnevermatch')
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('S3 > upload a buffer publicly and specifying content-type', (t) => {
  setup(testBucket, t)

  t.test('upload a buffer', (t) => {
    fs.readFile(samplePath, (err, data) => {
      if (err) {
        return t.end(err)
      }
      uploadPublicWithContentType(storage, testBucket, testObject, t, data)
    })
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('S3 > upload a stream with public access', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublic(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('S3 > upload a stream with restricted access', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadRestricted(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('S3 > upload a stream publicly and specifying content-type', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublicWithContentType(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({ key: testObject })
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  t.test('test existence of non created object', (t) => {
    storage.bucket(testBucket).exists({ key: 'foobar' })
      .then(() => {
        t.end(new Error('should not exists'))
      })
      .catch(() => {
        t.ok(true, 'it should reject')
        t.end()
      })
  })

  teardown(testBucket, t)
})

test('test existence of non created bucket', (t) => {
  storage.bucket(`foo${Date.now()}`).exists({ key: 'foobar' })
    .then(() => {
      t.end(new Error('should not exists'))
    })
    .catch(() => {
      t.ok(true, 'it should reject')
      t.end()
    })
})
