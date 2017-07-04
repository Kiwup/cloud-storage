'use strict'

const getReadStream = (storage, testBucket, testObject, t, refObj = {}, etag) => {
  const bucket = storage.bucket(testBucket)
  const opts = {key: testObject}
  if (etag) {
    opts.ifNoneMatch = etag
  }
  const stream = bucket.getReadStream(opts, refObj)
  stream
    .on('data', (buf) => {
      const data = JSON.parse(buf.toString())
      t.equal(data.test, 'ok', 'it should stream expected document')
      t.ok(typeof refObj.etag === 'string', 'it should add etag to refObj')
    })
    .on('error', t.end)
    .on('finish', t.end)
}

const getReadStreamIfNoneMatch = (storage, testBucket, testObject, t, etag) => {
  t.ok(!!etag, 'etag should not be falsy')
  const bucket = storage.bucket(testBucket)
  const stream = bucket.getReadStream({key: testObject, ifNoneMatch: etag})
  stream
    .on('data', (buf) => {
      t.end(new Error('it should no parse data'))
    })
    .on('error', (err) => {
      t.equal(err.statusCode, 304, 'it should generate an error event with statusCode 304')
      t.end()
    })
    .on('finish', t.end)
}

module.exports = {
  getReadStream,
  getReadStreamIfNoneMatch
}
