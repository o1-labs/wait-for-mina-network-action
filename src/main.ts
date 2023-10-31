import * as core from '@actions/core'
import {HttpClient} from '@actions/http-client'

interface GraphQlResponse {
  data?: {
    syncStatus?: string
  }
  errors?: {
    message: string
  }[]
}

export async function run(): Promise<void> {
  const startTime = performance.now()
  const minaDaemonGraphQlPort = core.getInput('mina-graphql-port')
  const maxAttempts = Number(core.getInput('max-attempts'))
  const pollingIntervalMs = Number(core.getInput('polling-interval-ms'))
  const minaDaemonGraphQlEndpoint = `http://localhost:${minaDaemonGraphQlPort}/graphql`
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
        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
      } else {
        const result = response.result
        if (result?.data?.syncStatus === 'SYNCED') {
          blockchainIsReady = true
        } else {
          await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
        }
      }
    } catch (_) {
      await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
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

function secondsToHms(seconds: number | string): string {
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
  return hDisplay + mDisplay + sDisplay
}

if (!process.env.JEST_WORKER_ID) {
  run().catch(error =>
    core.setFailed(error instanceof Error ? error.message : String(error))
  )
}
