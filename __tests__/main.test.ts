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

function mockHttpGet(response: any) {
  jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue(response)
}

function mockHttpPostJson(response: any) {
  jest.spyOn(HttpClient.prototype, 'postJson').mockResolvedValue(response)
}

describe('Mina Network GitHub Action', () => {
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
    mockHttpGet({
      message: {} as any,
      readBody: Promise.resolve({}) as any
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
    expect(core.info).toHaveBeenCalledWith('Network is synced.')
  })

  it('should fail if GraphQL endpoint is never available', async () => {
    mockHttpGet(Promise.reject(new Error('Network Error')))
    mockCoreInputs({
      'mina-graphql-port': '3085',
      'max-attempts': '3',
      'polling-interval-ms': '100'
    })
    mockCoreMethods()
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(
      '\nMaximum port check attempts reached. GraphQL port not available.'
    )
  })

  it('should fail if network does not sync within max attempts', async () => {
    mockHttpGet({
      message: {} as any,
      readBody: Promise.resolve({}) as any
    })
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
      '\nMaximum network sync attempts reached. Network is not synced.'
    )
  })

  it('should retry when an empty GraphQL response is received', async () => {
    mockHttpGet({
      message: {} as any,
      readBody: Promise.resolve({}) as any
    })
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
      'Empty response received. Retrying in 0.1 seconds...'
    )
  })

  it('should retry when GraphQL query returns an error', async () => {
    mockHttpGet({
      message: {} as any,
      readBody: Promise.resolve({}) as any
    })
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
      'Empty response received. Retrying in 0.1 seconds...'
    )
  })

  it('should retry when a malformed GraphQL response is received', async () => {
    mockHttpGet({
      message: {} as any,
      readBody: Promise.resolve({}) as any
    })
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
      'Empty response received. Retrying in 0.1 seconds...'
    )
  })
})
