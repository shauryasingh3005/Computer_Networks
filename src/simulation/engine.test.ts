import { describe, expect, it } from "vitest";
import { areInSameSubnet, calculateSubnet, EventQueue, isValidSubnetMask, NetworkSimulator } from "./engine";
import { longestPrefixMatch, type StaticRoute } from "./routing";
import { simulateAttackLoad } from "./attack-demo";
import type { SimTopology } from "./types";

const topology: SimTopology = {
  devices: [
    { id: "pc-a", name: "PC-A", type: "host", ipAddress: "192.168.1.10", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:01" },
    { id: "switch", name: "SW-1", type: "switch", ipAddress: "192.168.1.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:02" },
    { id: "pc-b", name: "PC-B", type: "host", ipAddress: "192.168.1.20", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:03" },
  ],
  links: [
    { id: "a-sw", sourceId: "pc-a", targetId: "switch", up: true, delayMs: 2 },
    { id: "sw-b", sourceId: "switch", targetId: "pc-b", up: true, delayMs: 3 },
  ],
};

describe("event queue", () => {
  it("orders by simulation time and preserves insertion order for ties", () => {
    const queue = new EventQueue<string>();
    queue.schedule(10, "later");
    queue.schedule(4, "first");
    queue.schedule(4, "second");
    expect(queue.run()).toEqual(["first", "second", "later"]);
    expect(queue.timeMs).toBe(10);
  });
});

describe("IPv4 validation", () => {
  it("compares subnet addresses and rejects non-contiguous masks", () => {
    expect(areInSameSubnet("192.168.1.10", "255.255.255.0", "192.168.1.20", "255.255.255.0")).toBe(true);
    expect(areInSameSubnet("192.168.1.10", "255.255.255.0", "192.168.2.20", "255.255.255.0")).toBe(false);
    expect(isValidSubnetMask("255.255.255.0")).toBe(true);
    expect(isValidSubnetMask("255.0.255.0")).toBe(false);
  });

  it("calculates subnet boundaries from CIDR and dotted masks", () => {
    expect(calculateSubnet("192.168.1.34", "24")).toMatchObject({
      subnetMask: "255.255.255.0",
      networkAddress: "192.168.1.0",
      broadcastAddress: "192.168.1.255",
      firstUsableHost: "192.168.1.1",
      lastUsableHost: "192.168.1.254",
      usableAddressCount: 254,
    });
    expect(calculateSubnet("10.0.0.0", "255.255.255.254")).toMatchObject({ usableAddressCount: 2, firstUsableHost: "10.0.0.0", lastUsableHost: "10.0.0.1" });
    expect(calculateSubnet("10.0.0.1", "32")).toMatchObject({ usableAddressCount: 1, firstUsableHost: "10.0.0.1", lastUsableHost: "10.0.0.1" });
    expect(calculateSubnet("192.168.1.2", "255.0.255.0")).toBeUndefined();
  });
});

describe("ICMP ping simulation", () => {
  it("resolves ARP and delivers a request and reply through an active switch", () => {
    const result = new NetworkSimulator().ping(topology, "pc-a", "pc-b");
    expect(result.reachable).toBe(true);
    expect(result.rttMs).toBe(10);
    expect(result.events.map((event) => event.kind)).toContain("arp-request");
    expect(result.events.map((event) => event.kind)).toContain("arp-response");
    expect(result.events.filter((event) => event.kind === "packet-delivered")).toHaveLength(2);
    expect(result.events.every((event, index) => event.sequence === index)).toBe(true);
  });

  it("uses its ARP cache for the next ping", () => {
    const simulator = new NetworkSimulator();
    simulator.ping(topology, "pc-a", "pc-b");
    const second = simulator.ping(topology, "pc-a", "pc-b");
    expect(second.reachable).toBe(true);
    expect(second.events.some((event) => event.kind === "arp-request")).toBe(false);
  });

  it("drops the request when a required link is down", () => {
    const broken = { ...topology, links: topology.links.map((link) => link.id === "sw-b" ? { ...link, up: false } : link) };
    const result = new NetworkSimulator().ping(broken, "pc-a", "pc-b");
    expect(result.reachable).toBe(false);
    expect(result.failure).toContain("No active Layer 2 path");
    expect(result.events.map((event) => event.kind)).toContain("packet-dropped");
  });

  it("does not route to a remote subnet without router support", () => {
    const remote = { ...topology, devices: topology.devices.map((device) => device.id === "pc-b" ? { ...device, ipAddress: "192.168.2.20" } : device) };
    const result = new NetworkSimulator().ping(remote, "pc-a", "pc-b");
    expect(result.reachable).toBe(false);
    expect(result.failure).toContain("outside the local subnet");
  });
});

describe("TCP handshake simulation", () => {
  it("emits SYN, SYN-ACK, and ACK over the active topology path", () => {
    const result = new NetworkSimulator().tcpHandshake(topology, "pc-a", "pc-b");
    expect(result.established).toBe(true);
    expect(result.durationMs).toBe(15);
    expect(result.events.map((event) => event.kind)).toEqual(expect.arrayContaining(["tcp-syn", "tcp-syn-ack", "tcp-ack", "tcp-established"]));
    expect(result.events.filter((event) => event.kind.startsWith("tcp-")).map((event) => event.timeMs)).toEqual([5, 10, 15, 20]);
  });

  it("fails when the connection path is broken", () => {
    const broken = { ...topology, links: topology.links.map((link) => link.id === "sw-b" ? { ...link, up: false } : link) };
    expect(new NetworkSimulator().tcpHandshake(broken, "pc-a", "pc-b").established).toBe(false);
  });
});

describe("longest-prefix route lookup", () => {
  const routes: StaticRoute[] = [
    { destination: "0.0.0.0", prefixLength: 0, nextHop: "192.168.1.1", interfaceName: "eth0", metric: 1 },
    { destination: "10.0.0.0", prefixLength: 8, nextHop: "192.168.1.2", interfaceName: "eth1", metric: 5 },
    { destination: "10.12.0.0", prefixLength: 16, nextHop: "192.168.1.3", interfaceName: "eth2", metric: 9 },
  ];

  it("prefers the most specific matching prefix and uses metric to break ties", () => {
    expect(longestPrefixMatch(routes, "10.12.3.4")?.prefixLength).toBe(16);
    expect(longestPrefixMatch(routes, "10.20.3.4")?.prefixLength).toBe(8);
    expect(longestPrefixMatch(routes, "172.16.0.1")?.prefixLength).toBe(0);
    expect(longestPrefixMatch(routes.slice(1), "172.16.0.1")).toBeUndefined();
  });
});

describe("attack demonstration load model", () => {
  it("keeps baseline load without generating an attack", () => {
    expect(simulateAttackLoad(120, false, false)).toMatchObject({
      baselineLoad: 25,
      attackPressure: 0,
      totalLoad: 25,
      overloaded: false,
    });
  });

  it("models overload and mitigation without exceeding service capacity", () => {
    expect(simulateAttackLoad(120, true, false)).toMatchObject({
      attackPressure: 120,
      totalLoad: 145,
      utilizationPercent: 100,
      overloaded: true,
    });
    expect(simulateAttackLoad(120, true, true)).toMatchObject({
      effectiveAttackPressure: 42,
      totalLoad: 67,
      utilizationPercent: 67,
      overloaded: false,
    });
  });

  it("clamps the configured pressure to the model's range", () => {
    expect(simulateAttackLoad(500, true, false).attackPressure).toBe(150);
    expect(simulateAttackLoad(-10, true, false).attackPressure).toBe(0);
  });
});