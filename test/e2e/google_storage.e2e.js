'use strict'

const fs = require('fs')
const path = require('path')
const test = require('tape')
const { googleStorage } = require('../../.')
const {
  uploadPublic,
  uploadPublicWithContentType,
  uploadRestricted
} = require('./upload')
const {
  getReadStream,
  getReadStreamIfNoneMatch
} = require('./get_read_stream')

const { GCP_PROJECT_ID, GCP_REGION } = process.env

if (!GCP_PROJECT_ID || !GCP_REGION) {
  throw new Error('Missing env vars GCP_PROJECT_ID, GCP_REGION')
}

const samplePath = path.join(__dirname, 'sample.json')
const testObject = 'test2'

const storage = googleStorage({
  projectId: GCP_PROJECT_ID,
  keyFilename: './test/e2e/gcp_key.json'
})

function setup (testBucket, t) {
  t.test('create test bucket', (t) => {
    // native google API
    storage.client.createBucket(testBucket, {
      regional: true,
      location: GCP_REGION
    }, t.end)
  })
}

function teardown (testBucket, t) {
  const bucket = storage.client.bucket(testBucket)
  t.test('delete test object', (t) => {
    // native google API
    bucket.deleteFiles(t.end)
  })
  t.test('remove test bucket', (t) => {
    // native google API
    bucket.delete(t.end)
  })
}

const testBucket = `cloud-storage-e2e-${Date.now()}`

test('Google > upload a buffer with public access', (t) => {
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
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })
  teardown(testBucket, t)
})

test('Google > upload a buffer with restricted access', (t) => {
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
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('Google > upload a buffer publicly and specifying content-type', (t) => {
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
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('Google > upload a stream with public access', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublic(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('Google > upload a stream with restricted access', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadRestricted(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('Google > upload a stream publicly and specifying content-type', (t) => {
  setup(testBucket, t)

  t.test('upload a stream', (t) => {
    const data = fs.createReadStream(samplePath)
    data.on('error', t.end)
    uploadPublicWithContentType(storage, testBucket, testObject, t, data)
  })

  t.test('test existence', (t) => {
    storage.bucket(testBucket).exists({key: testObject})
      .then((data) => {
        t.ok(data, 'should return data')
        t.end()
      })
      .catch(t.end)
  })

  teardown(testBucket, t)
})

test('test existence of non created bucket', (t) => {
  storage.bucket(`foo${Date.now()}`).exists({key: 'foobar'})
    .then(() => {
      t.end(new Error('should not exists'))
    })
    .catch(() => {
      t.ok(true, 'it should reject')
      t.end()
    })
})
