'use strict'

const test = require('tape')
const proxyquire = require('proxyquire')

const s3Mock = () => {}
const googleStorageMock = () => {}

const cloudStorage = proxyquire('../../.', {
  './lib/s3': s3Mock,
  './lib/google_storage': googleStorageMock
})

test('Index > it should export a function', (t) => {
  t.equal(cloudStorage('s3'), s3Mock, 'that return s3 adapter when parameter is `s3`')
  t.equal(cloudStorage('googleStorage'), googleStorageMock, 'that return Google Storage adapter when parameter is `googleStorage`')
  t.throws(() => cloudStorage('azureBlob'), 'that should throw when requesting an unsupported provider')
  t.equal(cloudStorage.s3, s3Mock, 'that also export s3 adapter as property of exported function')
  t.equal(cloudStorage.googleStorage, googleStorageMock, 'that also export Google Storage adapter as property of exported function')
  t.end()
})
