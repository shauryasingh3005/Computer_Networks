<<<<<<< HEAD
# NetLab

NetLab is a local-first computer networks learning and simulation project. The current MVP combines a React Flow topology editor, deterministic Ethernet/ARP/IPv4/ICMP ping, a subnet calculator, longest-prefix route lookup, an educational TCP handshake, four interactive guided labs, and a repairable troubleshooting challenge.

Packet delivery currently supports hosts on a shared IPv4 subnet connected directly or through Layer 2 switches. The route-selection lab exercises longest-prefix matching against a sample table, but it does not forward packets through routers. The TCP lab models handshake events only. See [Simulation limitations](docs/SIMULATION.md) before using it as a protocol reference.

## Requirements

- Node.js 24 or newer
- npm 11 or newer

No database, backend, credentials, or external network service is required. Next.js's Geist font is loaded through `next/font` at build time.

## Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Main routes include `/`, `/learn`, `/builder`, `/subnet`, `/debugging`, and `/labs/1` through `/labs/4`.

## Try the current features

1. Open **Network builder**. The starter topology has two hosts on the same subnet connected through a switch.
2. Select a host to edit its name, IPv4 address, and subnet mask. Drag a connection handle to connect devices; select a link to change its delay or disable it.
3. Choose a ping source and destination, then run the test. The event timeline shows generated ARP and ICMP events. Use play, pause, step, and speed controls to review the sequence.
4. Open **Subnet calculator** to calculate network and broadcast addresses, host range, and usable-address count from a CIDR prefix or dotted mask.
5. Open **Troubleshoot** and repair PC-B's address so both hosts are in the same `/24`. Hints are staged; the scenario validates the repair through the same simulator.
6. On `/learn#labs`, launch one of four interactive labs: inspect ARP and ping; calculate and validate an IPv4 network address; select a route with longest-prefix matching; or trace a TCP three-way handshake.

Topology and progress are held in browser memory and reset on refresh. Saving experiments and user progress are not implemented.

## Development checks

```bash
npm test
npm run lint
npm run build
```

The simulation tests exercise event ordering, IPv4 and subnet calculations, ARP cache behavior, delivery through a switch, unreachable cases, longest-prefix matching, and TCP handshake order/timing.

## Architecture

- `src/app/` contains the dashboard, learning outline, builder, subnet calculator, troubleshooting UI, and guided lab routes.
- `src/simulation/types.ts` contains the simulation's device, link, topology, event, and result types.
- `src/simulation/engine.ts` contains IPv4 validation, subnet calculations, active Layer 2 path discovery, the discrete event queue, ARP cache, ICMP ping, and simplified TCP handshake behavior. It has no React dependency.
- `src/simulation/routing.ts` implements longest-prefix matching for the route-selection lab. It does not connect router forwarding to packet delivery.
- `src/simulation/engine.test.ts` contains focused unit tests for the engine.

See [Architecture](docs/ARCHITECTURE.md), [Simulation limitations](docs/SIMULATION.md), and [Demonstration guide](docs/DEMO.md).
=======
# Computer_Networks
>>>>>>> 115f2e98b388bb80395880f982b07d98107b282f
