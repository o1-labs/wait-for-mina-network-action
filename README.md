# GitHub Action to wait for the Mina network readiness

You can use this GitHub Action in your CI/CD pipelines to automate the network readiness checks when you use the [o1labs/mina-local-network](https://hub.docker.com/r/o1labs/mina-local-network) lightweight Mina Docker images as your job or jobs [service container](https://docs.github.com/en/actions/using-containerized-services/about-service-containers).

## Example usage

```yaml
...
jobs:
  my-job:
    ...
    services:
      mina-local-network:
        image: o1labs/mina-local-network:rampup-latest-lightnet
        env:
          NETWORK_TYPE: 'single-node'
          PROOF_LEVEL: 'none'
        ports:
          - 3085:3085
          - 5432:5432
          - 8080:8080
          - 8181:8181
      ...
    steps:
      - name: Wait for Mina network readiness
        uses: o1-labs/wait-for-mina-network-action@v1
        with:
          mina-graphql-port: 3085    # Default value
          max-attempts: 60           # Default value
          polling-interval-ms: 10000 # Default value
      ...
```
