# NetLab Architecture

## Runtime shape

NetLab is a Next.js App Router application. The initial version runs entirely in the browser; it has no API, database, authentication, or persistence layer.

```text
React UI
  ├─ Dashboard and learning outline
  ├─ React Flow topology editor
  ├─ Four guided lab activities
  ├─ Subnet calculator
  └─ Troubleshooting challenge
       │ topology snapshot
       ▼
Simulation engine (plain TypeScript)
  ├─ IPv4 and subnet utilities
  ├─ Active Layer 2 path search across switches
  ├─ Router interfaces and connected/static routing tables
  ├─ Longest-prefix route selection and TTL handling
  ├─ ARP cache
  ├─ Stable event queue
  ├─ ICMP echo request/reply model
  └─ TCP handshake event model

Separate route lookup utility
  └─ Longest-prefix match
```

The engine is independent from React. The builder converts its current nodes and edges into a `SimTopology` snapshot and invokes `NetworkSimulator.ping`. UI playback reveals the resulting ordered simulation events; it does not invent a separate path.

## Core models

- Hosts and servers have one IPv4 address, subnet mask, MAC address, and optional default gateway. Routers have per-link interfaces with independent IPv4 configuration and optional static routes. The legacy single-address router shape is accepted when it has one connected link.
- `SimLink` joins two devices and has an up/down state and propagation delay.
- `SimulationEvent` records simulation time, event kind, packet ID, optional device ID, and a description.
- `PingResult` reports reachability, simulated RTT or a failure reason, and the ordered event list.
- `TcpHandshakeResult` reports whether a same-subnet connection setup completed, its simulated duration, and ordered handshake events.

## Event and path processing

`EventQueue` orders events by simulation time and preserves insertion order for equal timestamps. Ping validation rejects missing devices, malformed IPv4 configuration, invalid masks, duplicate addresses, and invalid route/interface references. Same-subnet traffic retains the direct Layer 2 path through switches. For remote subnets, the host resolves its configured gateway, and each router performs longest-prefix matching over active connected networks and configured static routes. Static routes resolve their next hop through the selected interface. Routers are forwarding points, not Layer 2 transit switches.

On an ARP cache miss, the model emits an ARP request/reply for the local next hop and caches the mapping per device/interface. Routed packets generate router receive, route lookup, TTL decrement, and forwarding events tied to the traversed React Flow links. A missing gateway, route, next hop, inactive link, or expired TTL produces a packet drop; the reply is routed independently, so missing return routes fail explicitly. RTT is the sum of the configured link propagation delays in both directions. ARP resolution appears in the timeline but, consistent with the existing same-subnet model, is excluded from RTT.

The simplified TCP setup uses the same active Layer 2 path and emits SYN, SYN-ACK, and ACK in simulation-time order. It reports three one-way link traversals as handshake duration; ARP resolution is shown before the handshake and excluded from that duration. `longestPrefixMatch` independently chooses the most specific route, using metric as a tie-breaker. The routing lab does not connect this utility to the network simulator's forwarding path.

## UI boundaries

- `/builder` owns editable React Flow node and edge state. Node, gateway, router-interface, static-route, and link inspector changes update the same topology snapshot passed to the engine.
- `/subnet` uses the engine's pure `calculateSubnet` utility.
- `/debugging` constructs a deterministic broken topology and validates the student's edited address with the same `NetworkSimulator`.
- `/labs/[labId]` serves four interactive activities using the engine or tested pure utilities. Lab state is local to the page and resets on refresh.
- `/incidents` is a separate, local NOC and incident-response exercise. Six fictional environments and their incident packs reuse `SimTopology`; a deterministic scenario model derives traffic, queue, availability, latency, loss, resource, alert, and recovery metrics from the current phase and intensity. The UI provides animated local packet flows, inspection, hints, defensive controls, and an after-action report. It does not send network traffic or persist scenario state.
- `/learn` is a syllabus outline with launch links; it is not a complete set of lesson pages.

## Tests

Vitest tests the queue, subnet utilities, ARP cache reuse, same-subnet ping, single- and multi-router ICMP forwarding, static routes, missing gateways and return routes, link failures, TTL expiry, TCP handshake events, longest-prefix lookup, and incident progression through attack, impact, defense, recovery, and reporting across all scenario packs. Tests are intentionally focused on current behavior; they do not imply support for protocols that are not implemented.