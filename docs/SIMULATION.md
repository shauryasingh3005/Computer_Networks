# Simulation Scope and Limitations

## Implemented

- IPv4 dotted-decimal validation and contiguous subnet-mask validation.
- CIDR and dotted-mask subnet calculations, including `/31` point-to-point and `/32` single-address handling.
- Duplicate IPv4 address and link-reference validation.
- Active-link path search across directly attached hosts and Layer 2 switches.
- A stable discrete event queue with simulation time in milliseconds.
- Educational ARP request/reply events and a per-source ARP cache. The cache can be cleared in code; the builder resets it when topology or configuration changes.
- ICMP echo request/reply success and packet drop results for the supported topology.
- Longest-prefix route selection, including default routes, for the routing lab.
- A simplified TCP three-way handshake event sequence over the supported active Layer 2 path.
- Link propagation delay contributes to event time and ping RTT.

## Simplifications

- A switch is represented as a graph transit node. The current model does not learn MAC addresses or implement per-port forwarding tables.
- ARP is an educational event model, not a complete Ethernet broadcast-domain implementation. Cache entries have no expiration timer.
- ICMP is a simplified echo exchange. TTL, fragmentation, checksums, and ICMP unreachable/time-exceeded packet headers are not modeled.
- Link bandwidth, packet loss, queue capacity, duplex mode, and transmission serialization delay are not implemented.
- The builder can display router and server devices, but only switches may transit a ping path. Router interface configuration, routing tables, and routed traffic are not implemented.
- The routing lab selects a route from a fixed sample table; that lookup is not connected to router forwarding in the packet simulator.
- TCP models only setup event ordering and simulated duration. Sequence numbers, ports, data transfer, retransmissions, connection teardown, and full RFC behavior are not modeled.
- UDP, DNS, HTTP, IPv6, distance-vector routing, and link-state routing are not implemented.
- The timeline is generated from the engine's deterministic event list and revealed through UI playback. Browser timers control presentation only; protocol timing is determined by simulation timestamps.
- Topologies and edits are in-memory only. Refreshing the page resets them.
- Attack walkthroughs on the Learn page are separate, browser-only teaching models. They do not create or send packets. The service-availability demo uses invented capacity units to illustrate overload and mitigation; its values are not traffic rates or real performance measurements.

## Interpreting results

All timings are simulated values based on configured link propagation delay. They are not measurements of the user's real network. An unreachable result is not converted into a successful packet animation or ping response.