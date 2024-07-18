import * as core from '@actions/core'
import { HttpClient } from '@actions/http-client'
import { run, secondsToHms } from '../src/main'
import * as wait from '../src/wait'

function mockCoreInputs(inputs: Record<string, string>): void {
  jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
    return inputs[name] || ''
  })
}

function mockCoreMethods(): void {
  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
}

function mockHttpPostJson(response: any): void {
  jest.spyOn(HttpClient.prototype, 'postJson').mockResolvedValue(response)
}

describe('Mina network GitHub Action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(wait, 'wait').mockImplementation(jest.fn())
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
      result: { data: { syncStatus: 'NOT_SYNCED' } }
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
      result: { errors: [{ message: 'Some error' }] }
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
      result: { wrongData: { wrongKey: 'value' } }
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

  it('should retry on server error', async () => {
    mockHttpPostJson({
      statusCode: 500,
      headers: {},
      result: { data: { syncStatus: 'NOT_SYNCED' } }
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

describe('secondsToHms()', () => {
  it('converts zero seconds correctly', () => {
    expect(secondsToHms(0)).toBe('')
  })

  it('converts seconds within a minute correctly', () => {
    expect(secondsToHms(45)).toBe('45 seconds')
  })

  it('converts 60 seconds correctly', () => {
    expect(secondsToHms(60)).toBe('1 minute')
  })

  it('converts multiple minutes correctly', () => {
    expect(secondsToHms(300)).toBe('5 minutes')
  })

  it('converts exact hours correctly', () => {
    expect(secondsToHms(3600)).toBe('1 hour')
  })

  it('converts hours and minutes correctly', () => {
    expect(secondsToHms(3660)).toBe('1 hour, 1 minute')
  })

  it('converts hours, minutes, and seconds correctly', () => {
    expect(secondsToHms(3665)).toBe('1 hour, 1 minute, 5 seconds')
  })

  it('converts multiple hours correctly', () => {
    expect(secondsToHms(7200)).toBe('2 hours')
  })

  it('converts multiple hours, minutes and seconds correctly', () => {
    expect(secondsToHms(7385)).toBe('2 hours, 3 minutes, 5 seconds')
  })

  it('handles large values correctly', () => {
    expect(secondsToHms(86400)).toBe('24 hours')
  })

  it('handles odd values correctly', () => {
    expect(secondsToHms(5401)).toBe('1 hour, 30 minutes, 1 second')
  })

  it('handles combinations without seconds correctly', () => {
    expect(secondsToHms(3900)).toBe('1 hour, 5 minutes')
  })

  it('handles combinations without minutes correctly', () => {
    expect(secondsToHms(7205)).toBe('2 hours, 5 seconds')
  })
})
