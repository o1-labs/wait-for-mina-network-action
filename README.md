# GitHub Action to wait for the Mina Network readiness

This GitHub Action will be useful should you ever need to run the [Mina Network](https://hub.docker.com/r/o1labs/mina-local-network) as the [Docker service](https://docs.github.com/en/actions/using-containerized-services/about-service-containers) within your CI/CD pipeline.

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
      - name: Wait for Mina Network readiness
        uses: o1-labs/wait-for-mina-network-action@v1.0
        with:
          mina-graphql-port: 3085    # Default value
          max-attempts: 60           # Default value
          polling-interval-ms: 10000 # Default value
      ...
```
