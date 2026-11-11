# Demonstration Guide

## Same-subnet ping

1. Run `npm run dev` and open `/builder`.
2. Use the starter topology: PC-A and PC-B are attached through SW-1.
3. Run the default ping. Step through the ARP request, ARP response, ICMP echo request, and ICMP echo reply.
4. Run the ping again to observe the ARP cache hit (no second ARP request).
5. Select the SW-1-to-PC-B link, disable it, and rerun. The engine should report no active Layer 2 path.
6. Re-enable the link and verify delivery again.

## Troubleshooting challenge

1. Open `/debugging` and test connectivity before changing anything.
2. Use hints only as needed. PC-B's address is on a different `/24` and there is no router.
3. Change PC-B to an unused address in `192.168.1.0/24`, such as `192.168.1.20`.
4. Test again. The challenge should report a reply and show the explanation.

## Subnet calculation

Open `/subnet`, try `192.168.10.24/24`, then test `/31` and `/32` edge behavior. A dotted mask such as `255.255.255.0` is accepted in the second field.

## Guided labs

From `/learn#labs`, launch each lab:

1. **Inspect ARP and ping:** clear PC-A's ARP cache, run ping, and inspect ARP plus ICMP events.
2. **Calculate an IPv4 subnet:** submit `192.168.10.0` for `192.168.10.24/26` to validate the network address and host range.
3. **Follow longest-prefix routing:** look up `10.20.4.15` and observe the `/16` route win over `/8` and `/0`.
4. **Trace a TCP handshake:** start the connection and inspect SYN, SYN-ACK, and ACK timing.

Router packet forwarding, TCP data transfer, UDP, DNS/HTTP, and performance experiment demonstrations in the project brief are not available in this MVP yet; see [Simulation limitations](SIMULATION.md).