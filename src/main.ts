import * as core from '@actions/core'
import {HttpClient} from '@actions/http-client'

interface GraphQLResponse {
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
  const queryObject = {
    query: '{ syncStatus }',
    variables: null,
    operationName: null
  }
  let portCheckAttempt = 1
  let networkSyncAttempt = 1
  let networkIsSynced = false

  core.info('\nAction input parameters:')
  core.info(`mina-graphql-port: ${minaDaemonGraphQlPort}`)
  core.info(`max-attempts: ${maxAttempts}`)
  core.info(`polling-interval-ms: ${pollingIntervalMs}`)

  core.info('\nWaiting for the Mina Daemon GraphQL port to be available...')

  // Wait for GraphQL port to be ready
  while (portCheckAttempt <= maxAttempts) {
    try {
      await new HttpClient('mina-network-action').get(minaDaemonGraphQlEndpoint)
      break
    } catch (error) {
      if (portCheckAttempt === maxAttempts) {
        core.setFailed(
          '\nMaximum port check attempts reached. GraphQL port not available.'
        )
        return
      }
      await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
      portCheckAttempt++
    }
  }

  core.info(
    '\nMina Daemon GraphQL port is ready.\nWaiting for the network to sync...\n'
  )

  // Wait for the network to sync
  while (networkSyncAttempt <= maxAttempts && !networkIsSynced) {
    const response = await new HttpClient(
      'mina-network-action'
    ).postJson<GraphQLResponse>(minaDaemonGraphQlEndpoint, queryObject)
    if (!response || !response.result || !response.result.data) {
      core.info(
        `Empty response received. Retrying in ${
          pollingIntervalMs / 1000
        } seconds...`
      )
      await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
    } else if (response.result.data.syncStatus === 'SYNCED') {
      networkIsSynced = true
      core.info('Network is synced.')
    } else {
      core.info(
        `Network is not synced. Retrying in ${
          pollingIntervalMs / 1000
        } seconds...`
      )
      await new Promise(resolve => setTimeout(resolve, pollingIntervalMs))
    }
    networkSyncAttempt++
  }

  if (!networkIsSynced) {
    core.setFailed(
      '\nMaximum network sync attempts reached. Network is not synced.'
    )
  } else {
    core.info('\nNetwork is ready to use.')
  }

  const runTime = Math.round((performance.now() - startTime) / 1000).toFixed(2)
  core.info(`Done. Runtime: ${runTime} seconds.\n`)
}

if (!process.env.JEST_WORKER_ID) {
  run().catch(error =>
    core.setFailed(error instanceof Error ? error.message : String(error))
  )
}
