import * as core from '@actions/core'
import {HttpClient} from '@actions/http-client'
import {run} from '../src/main'

function mockCoreInputs(inputs: Record<string, string>) {
  jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return inputs[name] || ''
  })
}

function mockCoreMethods() {
  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
}

function mockHttpPostJson(response: any) {
  jest.spyOn(HttpClient.prototype, 'postJson').mockResolvedValue(response)
}

describe('Mina network GitHub Action', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
  })

  it('should wait for the successful network sync', async () => {
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockHttpPostJson({
      statusCode: 200,
      headers: {},
      result: {
        data: {
          syncStatus: 'SYNCED'
        }
      }
    })
    mockCoreMethods()
    await run()
    expect(core.info).toHaveBeenCalledWith(
      '\nBlockchain network is ready to use.'
    )
  })

  it('should fail if GraphQL endpoint is never available', async () => {
    mockHttpPostJson(Promise.reject(new Error('Network Error')))
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      '\nMaximum network sync attempts reached. The blockchain network is not ready!'
    )
  })

  it('should fail if network does not sync within max attempts', async () => {
    mockHttpPostJson({
      statusCode: 200,
      headers: {},
      result: {data: {syncStatus: 'NOT_SYNCED'}}
    })
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      '\nMaximum network sync attempts reached. The blockchain network is not ready!'
    )
  })

  it('should retry when an empty GraphQL response is received', async () => {
    mockHttpPostJson({
      statusCode: 200,
      headers: {},
      result: {}
    })
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.info).toHaveBeenCalledWith(
      'Blockchain network is not ready yet. Retrying in 0.1 seconds.'
    )
  })

  it('should retry when GraphQL query returns an error', async () => {
    mockHttpPostJson({
      statusCode: 200,
      headers: {},
      result: {errors: [{message: 'Some error'}]}
    })
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.info).toHaveBeenCalledWith(
      'Blockchain network is not ready yet. Retrying in 0.1 seconds.'
    )
  })

  it('should retry when a malformed GraphQL response is received', async () => {
    mockHttpPostJson({
      statusCode: 200,
      headers: {},
      result: {wrongData: {wrongKey: 'value'}}
    })
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.info).toHaveBeenCalledWith(
      'Blockchain network is not ready yet. Retrying in 0.1 seconds.'
    )
  })
})
