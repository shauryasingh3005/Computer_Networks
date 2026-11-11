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
  ├─ Active Layer 2 path search
  ├─ ARP cache
  ├─ Stable event queue
  ├─ ICMP echo request/reply model
  └─ TCP handshake event model

Separate route lookup utility
  └─ Longest-prefix match
```

The engine is independent from React. The builder converts its current nodes and edges into a `SimTopology` snapshot and invokes `NetworkSimulator.ping`. UI playback reveals the resulting ordered simulation events; it does not invent a separate path.

## Core models

- `SimDevice` currently has one IPv4 address, subnet mask, and MAC address. Device kinds are host, router, switch, and server.
- `SimLink` joins two devices and has an up/down state and propagation delay.
- `SimulationEvent` records simulation time, event kind, packet ID, optional device ID, and a description.
- `PingResult` reports reachability, simulated RTT or a failure reason, and the ordered event list.
- `TcpHandshakeResult` reports whether a same-subnet connection setup completed, its simulated duration, and ordered handshake events.

## Event and path processing

`EventQueue` orders events by simulation time and preserves insertion order for equal timestamps. Ping validation rejects missing devices, malformed IPv4 configuration, invalid masks, duplicate addresses, and cross-subnet traffic. A breadth-first search finds an active path from the source to the destination through switches only. If none exists, the packet is dropped.

On an ARP cache miss, the model emits an ARP broadcast and reply along the selected path, then caches the mapping. It emits an ICMP echo request and reply over that path. RTT is calculated from link propagation delay in each direction; ARP setup time is shown in the event timeline but excluded from the ICMP RTT result.

The simplified TCP setup uses the same active Layer 2 path and emits SYN, SYN-ACK, and ACK in simulation-time order. It reports three one-way link traversals as handshake duration; ARP resolution is shown before the handshake and excluded from that duration. `longestPrefixMatch` independently chooses the most specific route, using metric as a tie-breaker. The routing lab does not connect this utility to the network simulator's forwarding path.

## UI boundaries

- `/builder` owns editable React Flow node and edge state. Node and link inspector changes update the same topology snapshot passed to the engine.
- `/subnet` uses the engine's pure `calculateSubnet` utility.
- `/debugging` constructs a deterministic broken topology and validates the student's edited address with the same `NetworkSimulator`.
- `/labs/[labId]` serves four interactive activities using the engine or tested pure utilities. Lab state is local to the page and resets on refresh.
- `/learn` is a syllabus outline with launch links; it is not a complete set of lesson pages.

## Tests

Vitest tests the queue, subnet utilities, ARP cache reuse, successful same-subnet ping, link/subnet failures, TCP handshake events, and longest-prefix lookup. Tests are intentionally focused on current behavior; they do not imply support for protocols that are not implemented.