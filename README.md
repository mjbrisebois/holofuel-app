
# HoloFuel UI

## Development

There will be 4 components running for development

1. Sim2h Sever
1. Holochain Conductor 
2. Chaperone development server
3. Web UI

Enter `nix-shell` for development environment dependencies.

### Holochain Conductor (and sim2h)

```bash
make start-hcc
```

### Chaperone development server

```bash
make start-chaperone
```

### Web UI

```bash
npm run build
```

Finally, run a simple HTTP server from the root of this git repo.
