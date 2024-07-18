import * as core from '@actions/core'
import { HttpClient } from '@actions/http-client'
import { wait } from './wait'

interface GraphQlResponse {
  data?: {
    syncStatus?: string
  }
  errors?: {
    message: string
  }[]
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const startTime = performance.now()
  const minaDaemonGraphQlPort = core.getInput('mina-graphql-port')
  const maxAttempts = Number(core.getInput('max-attempts'))
  const pollingIntervalMs = Number(core.getInput('polling-interval-ms'))
  const minaDaemonGraphQlEndpoint = `http://127.0.0.1:${minaDaemonGraphQlPort}/graphql`
  const syncStatusGraphQlQuery = {
    query: '{ syncStatus }',
    variables: null,
    operationName: null
  }
  let blockchainSyncAttempt = 1
  let blockchainIsReady = false

  core.info('\n')
  core.info('Action input parameters:')
  core.info(`mina-graphql-port: ${minaDaemonGraphQlPort}`)
  core.info(`max-attempts: ${maxAttempts}`)
  core.info(`polling-interval-ms: ${pollingIntervalMs}`)
  core.info('\nWaiting for the blockchain network readiness.\n')

  // Wait for the blockchain network to be ready to use
  while (blockchainSyncAttempt <= maxAttempts && !blockchainIsReady) {
    try {
      const response = await new HttpClient(
        'mina-network-action'
      ).postJson<GraphQlResponse>(
        minaDaemonGraphQlEndpoint,
        syncStatusGraphQlQuery
      )
      if (response.statusCode >= 400) {
        await wait(pollingIntervalMs)
      } else {
        const result = response.result
        if (result?.data?.syncStatus === 'SYNCED') {
          blockchainIsReady = true
        } else {
          await wait(pollingIntervalMs)
        }
      }
    } catch (_) {
      await wait(pollingIntervalMs)
    }
    logBlockchainIsNotReadyYet(pollingIntervalMs)
    blockchainSyncAttempt++
  }
  if (!blockchainIsReady) {
    core.setFailed(
      '\nMaximum network sync attempts reached. The blockchain network is not ready!'
    )
  } else {
    core.info('\nBlockchain network is ready to use.')
  }
  const runTimeSeconds = Math.round((performance.now() - startTime) / 1000)
  core.info(`Total wait time: ${secondsToHms(runTimeSeconds)}.\n`)
}

function logBlockchainIsNotReadyYet(pollingIntervalMs: number): void {
  core.info(
    `Blockchain network is not ready yet. Retrying in ${
      pollingIntervalMs / 1000
    } seconds.`
  )
}

/**
 * Converts seconds to human readable time format (HH hours, MM minutes, SS seconds).
 * @param {number | string} seconds - The number of seconds to convert.
 * @returns {string} The human readable time format.
 */
export function secondsToHms(seconds: number | string): string {
  seconds = Number(seconds)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor((seconds % 3600) % 60)
  let hDisplay = ''
  if (h > 0) {
    hDisplay = h + (h === 1 ? ' hour, ' : ' hours, ')
  }
  let mDisplay = ''
  if (m > 0) {
    mDisplay = m + (m === 1 ? ' minute, ' : ' minutes, ')
  }
  let sDisplay = ''
  if (s > 0) {
    sDisplay = s + (s === 1 ? ' second' : ' seconds')
  }
  const result = hDisplay + mDisplay + sDisplay
  return result.endsWith(', ') ? result.slice(0, -2) : result
}
