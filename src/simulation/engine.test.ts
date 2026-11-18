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

  it("requires a configured gateway for a remote subnet", () => {
    const remote = { ...topology, devices: topology.devices.map((device) => device.id === "pc-b" ? { ...device, ipAddress: "192.168.2.20" } : device) };
    const result = new NetworkSimulator().ping(remote, "pc-a", "pc-b");
    expect(result.reachable).toBe(false);
    expect(result.failure).toContain("no default gateway");
  });
});

describe("routed ICMP ping simulation", () => {
  const singleRouter: SimTopology = {
    devices: [
      { id: "pc-a", name: "PC-A", type: "host", ipAddress: "192.168.1.10", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:01", defaultGateway: "192.168.1.1" },
      { id: "sw-a", name: "SW-A", type: "switch", ipAddress: "192.168.1.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:02" },
      { id: "router", name: "R1", type: "router", ipAddress: "0.0.0.0", subnetMask: "0.0.0.0", macAddress: "02:00:00:00:00:03", interfaces: [
        { id: "eth0", name: "eth0", ipAddress: "192.168.1.1", subnetMask: "255.255.255.0", macAddress: "02:00:00:01:00:01", linkId: "a-r", enabled: true },
        { id: "eth1", name: "eth1", ipAddress: "192.168.2.1", subnetMask: "255.255.255.0", macAddress: "02:00:00:01:00:02", linkId: "r-b", enabled: true },
      ], staticRoutes: [] },
      { id: "sw-b", name: "SW-B", type: "switch", ipAddress: "192.168.2.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:04" },
      { id: "pc-b", name: "PC-B", type: "host", ipAddress: "192.168.2.20", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:05", defaultGateway: "192.168.2.1" },
    ],
    links: [
      { id: "a-sw", sourceId: "pc-a", targetId: "sw-a", up: true, delayMs: 2 },
      { id: "a-r", sourceId: "sw-a", targetId: "router", up: true, delayMs: 3 },
      { id: "r-b", sourceId: "router", targetId: "sw-b", up: true, delayMs: 5 },
      { id: "b-sw", sourceId: "sw-b", targetId: "pc-b", up: true, delayMs: 7 },
    ],
  };

  it("routes an echo request and reply through a router and uses link delays for RTT", () => {
    const result = new NetworkSimulator().ping(singleRouter, "pc-a", "pc-b");
    expect(result.reachable).toBe(true);
    expect(result.rttMs).toBe(34);
    expect(result.events.map((event) => event.kind)).toEqual(expect.arrayContaining([
      "arp-request", "arp-response", "icmp-echo-request", "router-received", "route-lookup", "ttl-decremented",
      "router-forwarded", "packet-delivered", "icmp-echo-reply",
    ]));
    expect(result.events.some((event) => event.linkId === "r-b")).toBe(true);
    expect(result.events.every((event, index) => event.sequence === index)).toBe(true);
  });

  it("reports an unreachable or invalid default gateway", () => {
    const missingGateway = {
      ...singleRouter,
      devices: singleRouter.devices.map((device) => device.id === "pc-a" ? { ...device, defaultGateway: undefined } : device),
    };
    expect(new NetworkSimulator().ping(missingGateway, "pc-a", "pc-b").failure).toContain("no default gateway");

    const invalidGateway = {
      ...singleRouter,
      devices: singleRouter.devices.map((device) => device.id === "pc-a" ? { ...device, defaultGateway: "192.168.3.1" } : device),
    };
    expect(new NetworkSimulator().ping(invalidGateway, "pc-a", "pc-b").failure).toContain("outside the local subnet");
  });

  it("rejects duplicate router interface addresses and missing routes", () => {
    const duplicateAddress = {
      ...singleRouter,
      devices: singleRouter.devices.map((device) => device.id === "router"
        ? { ...device, interfaces: device.interfaces?.map((networkInterface) => ({ ...networkInterface, ipAddress: "192.168.1.10" })) }
        : device),
    };
    expect(new NetworkSimulator().ping(duplicateAddress, "pc-a", "pc-b").failure).toContain("assigned to both");

    const noRoute = {
      ...singleRouter,
      devices: singleRouter.devices.map((device) => device.id === "router"
        ? { ...device, interfaces: device.interfaces?.slice(0, 1) }
        : device),
    };
    expect(new NetworkSimulator().ping(noRoute, "pc-a", "pc-b").failure).toContain("No matching route");
  });

  it("reports a missing return route and inactive router link", () => {
    const withoutReturnRoute = {
      ...singleRouter,
      devices: singleRouter.devices.map((device) => device.id === "pc-b"
        ? { ...device, defaultGateway: undefined }
        : device),
    };
    expect(new NetworkSimulator().ping(withoutReturnRoute, "pc-a", "pc-b").failure).toContain("Missing return route");

    const broken = {
      ...singleRouter,
      links: singleRouter.links.map((link) => link.id === "r-b" ? { ...link, up: false } : link),
    };
    expect(new NetworkSimulator().ping(broken, "pc-a", "pc-b").failure).toContain("is down");
  });

  it("drops a routed packet when TTL expires at the first router", () => {
    const result = new NetworkSimulator().ping(singleRouter, "pc-a", "pc-b", { ttl: 1 });
    expect(result.reachable).toBe(false);
    expect(result.failure).toContain("TTL expired");
    expect(result.events.map((event) => event.kind)).toContain("packet-dropped");
  });

  it("uses static routes across two routers in both directions", () => {
    const multiRouter: SimTopology = {
      devices: [
        singleRouter.devices[0],
        singleRouter.devices[1],
        {
          id: "r1", name: "R1", type: "router", ipAddress: "0.0.0.0", subnetMask: "0.0.0.0", macAddress: "02:00:00:00:01:01",
          interfaces: [
            { id: "eth0", name: "eth0", ipAddress: "192.168.1.1", subnetMask: "255.255.255.0", macAddress: "02:00:00:01:00:01", linkId: "a-r1", enabled: true },
            { id: "eth1", name: "eth1", ipAddress: "10.0.0.1", subnetMask: "255.255.255.252", macAddress: "02:00:00:01:00:02", linkId: "r1-r2", enabled: true },
          ],
          staticRoutes: [{ destination: "192.168.2.0", prefixLength: 24, nextHop: "10.0.0.2", interfaceName: "eth1", metric: 1 }],
        },
        {
          id: "r2", name: "R2", type: "router", ipAddress: "0.0.0.0", subnetMask: "0.0.0.0", macAddress: "02:00:00:00:02:01",
          interfaces: [
            { id: "eth0", name: "eth0", ipAddress: "10.0.0.2", subnetMask: "255.255.255.252", macAddress: "02:00:00:02:00:01", linkId: "r1-r2", enabled: true },
            { id: "eth1", name: "eth1", ipAddress: "192.168.2.1", subnetMask: "255.255.255.0", macAddress: "02:00:00:02:00:02", linkId: "r2-b", enabled: true },
          ],
          staticRoutes: [{ destination: "192.168.1.0", prefixLength: 24, nextHop: "10.0.0.1", interfaceName: "eth0", metric: 1 }],
        },
        singleRouter.devices[3],
        singleRouter.devices[4],
      ],
      links: [
        { id: "a-sw", sourceId: "pc-a", targetId: "sw-a", up: true, delayMs: 2 },
        { id: "a-r1", sourceId: "sw-a", targetId: "r1", up: true, delayMs: 3 },
        { id: "r1-r2", sourceId: "r1", targetId: "r2", up: true, delayMs: 4 },
        { id: "r2-b", sourceId: "r2", targetId: "sw-b", up: true, delayMs: 5 },
        { id: "b-sw", sourceId: "sw-b", targetId: "pc-b", up: true, delayMs: 7 },
      ],
    };
    const result = new NetworkSimulator().ping(multiRouter, "pc-a", "pc-b");
    expect(result.reachable).toBe(true);
    expect(result.rttMs).toBe(42);
    expect(result.events.filter((event) => event.kind === "route-lookup").map((event) => event.deviceId)).toEqual(["r1", "r2", "r2", "r1"]);

    const unreachableNextHop = {
      ...multiRouter,
      devices: multiRouter.devices.map((device) => device.id === "r1"
        ? { ...device, staticRoutes: device.staticRoutes?.map((route) => ({ ...route, nextHop: "10.0.0.3" })) }
        : device),
    };
    expect(new NetworkSimulator().ping(unreachableNextHop, "pc-a", "pc-b").failure).toContain("next hop 10.0.0.3 is unreachable");
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