# Simulation Scope and Limitations

## Implemented

- IPv4 dotted-decimal validation and contiguous subnet-mask validation.
- CIDR and dotted-mask subnet calculations, including `/31` point-to-point and `/32` single-address handling.
- Duplicate IPv4 address and link-reference validation.
- Active-link path search across directly attached hosts and Layer 2 switches.
- Multiple router interfaces, each associated with a physical link and its own IPv4 address and subnet mask.
- Automatically derived directly connected routes and per-router static routes selected with longest-prefix matching.
- Host/server default gateways, next-hop reachability checks, bidirectional inter-subnet ICMP ping, and router-interface/link status checks.
- Router forwarding events with TTL decrement/expiry and explicit failures for missing gateways, routes, next hops, and return routes.
- A stable discrete event queue with simulation time in milliseconds.
- Educational ARP request/reply events and a per-device/interface ARP cache. The builder resets it when topology or configuration changes.
- ICMP echo request/reply success and packet drop results for the supported topology.
- Longest-prefix route selection, including default routes, for router forwarding and the routing lab.
- A simplified TCP three-way handshake event sequence over the supported active Layer 2 path.
- Link propagation delay contributes to event time and ping RTT.

## Simplifications

- A switch is represented as a graph transit node. The current model does not learn MAC addresses or implement per-port forwarding tables or VLAN segmentation.
- ARP is an educational event model, not a complete Ethernet broadcast-domain implementation. Cache entries have no expiration timer.
- ICMP is a simplified echo exchange. TTL decrements at simulated routers and expiry is modeled, but fragmentation, checksums, and ICMP unreachable/time-exceeded packet headers are not.
- Link bandwidth, packet loss, queue capacity, duplex mode, and transmission serialization delay are not implemented.
- Router forwarding is limited to connected networks and manually configured static routes; dynamic routing protocols are not implemented.
- The routing lab also demonstrates longest-prefix lookup using a fixed sample table.
- TCP models only setup event ordering and simulated duration. Sequence numbers, ports, data transfer, retransmissions, connection teardown, and full RFC behavior are not modeled.
- UDP, DNS, HTTP, IPv6, distance-vector routing, and link-state routing are not implemented.
- The timeline is generated from the engine's deterministic event list and revealed through UI playback. Browser timers control presentation only; protocol timing is determined by simulation timestamps.
- Topologies and edits are in-memory only. Refreshing the page resets them.
- Attack walkthroughs on the Learn page are separate, browser-only teaching models. They do not create or send packets. The service-availability demo uses invented capacity units to illustrate overload and mitigation; its values are not traffic rates or real performance measurements.

## Interpreting results

All timings are simulated values based on configured link propagation delay. Ping RTT sums the traversed link delays in both directions; ARP setup is shown in the event timeline but excluded from RTT. These are not measurements of the user's real network. An unreachable result is not converted into a successful packet animation or ping response.