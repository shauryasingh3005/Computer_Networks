import type { PingResult, SimLink, SimTopology, SimulationEvent, TcpHandshakeResult } from "./types";

interface ScheduledEvent<T> {
  timeMs: number;
  sequence: number;
  value: T;
}

export class EventQueue<T> {
  private readonly events: ScheduledEvent<T>[] = [];
  private nextSequence = 0;
  timeMs = 0;

  schedule(timeMs: number, value: T): void {
    const event = { timeMs: Math.max(this.timeMs, timeMs), sequence: this.nextSequence++, value };
    const index = this.events.findIndex((queued) => queued.timeMs > event.timeMs);
    if (index === -1) this.events.push(event);
    else this.events.splice(index, 0, event);
  }

  step(): T | undefined {
    const event = this.events.shift();
    if (!event) return undefined;
    this.timeMs = event.timeMs;
    return event.value;
  }

  run(): T[] {
    const values: T[] = [];
    let value = this.step();
    while (value !== undefined) {
      values.push(value);
      value = this.step();
    }
    return values;
  }

  get size(): number {
    return this.events.length;
  }
}

export function ipv4ToNumber(address: string): number | undefined {
  const octets = address.split(".");
  if (octets.length !== 4) return undefined;
  let value = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return undefined;
    const parsed = Number(octet);
    if (parsed > 255) return undefined;
    value = value * 256 + parsed;
  }
  return value;
}

export function isValidSubnetMask(mask: string): boolean {
  const value = ipv4ToNumber(mask);
  if (value === undefined) return false;
  const inverse = (~value) >>> 0;
  return (inverse & (inverse + 1)) === 0;
}

export function areInSameSubnet(firstIp: string, firstMask: string, secondIp: string, secondMask: string): boolean {
  const first = ipv4ToNumber(firstIp);
  const second = ipv4ToNumber(secondIp);
  const firstMaskNumber = ipv4ToNumber(firstMask);
  const secondMaskNumber = ipv4ToNumber(secondMask);
  if (first === undefined || second === undefined || firstMaskNumber === undefined || secondMaskNumber === undefined) return false;
  if (!isValidSubnetMask(firstMask) || !isValidSubnetMask(secondMask) || firstMaskNumber !== secondMaskNumber) return false;
  return (first & firstMaskNumber) === (second & secondMaskNumber);
}

export interface SubnetCalculation {
  address: string;
  prefixLength: number;
  subnetMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableHost: string;
  lastUsableHost: string;
  usableAddressCount: number;
}

function numberToIpv4(value: number): string {
  const unsigned = value >>> 0;
  return [24, 16, 8, 0].map((shift) => (unsigned >>> shift) & 255).join(".");
}

export function calculateSubnet(address: string, cidrOrMask: string): SubnetCalculation | undefined {
  const ipValue = ipv4ToNumber(address);
  if (ipValue === undefined) return undefined;
  let prefixLength: number;
  if (/^\d{1,2}$/.test(cidrOrMask)) prefixLength = Number(cidrOrMask);
  else {
    const maskValue = ipv4ToNumber(cidrOrMask);
    if (maskValue === undefined || !isValidSubnetMask(cidrOrMask)) return undefined;
    prefixLength = 0;
    let bits = maskValue >>> 0;
    while (bits & 0x80000000) {
      prefixLength += 1;
      bits = (bits << 1) >>> 0;
    }
  }
  if (prefixLength < 0 || prefixLength > 32) return undefined;
  const maskValue = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  const networkValue = (ipValue & maskValue) >>> 0;
  const broadcastValue = (networkValue | (~maskValue >>> 0)) >>> 0;
  const totalAddresses = 2 ** (32 - prefixLength);
  const usableAddressCount = prefixLength === 32 ? 1 : prefixLength === 31 ? 2 : totalAddresses - 2;
  const firstValue = prefixLength >= 31 ? networkValue : networkValue + 1;
  const lastValue = prefixLength >= 31 ? broadcastValue : broadcastValue - 1;
  return {
    address,
    prefixLength,
    subnetMask: numberToIpv4(maskValue),
    networkAddress: numberToIpv4(networkValue),
    broadcastAddress: numberToIpv4(broadcastValue),
    firstUsableHost: numberToIpv4(firstValue),
    lastUsableHost: numberToIpv4(lastValue),
    usableAddressCount,
  };
}

export function validateTopology(topology: SimTopology): string[] {
  const errors: string[] = [];
  const ids = new Set(topology.devices.map((device) => device.id));
  const addresses = new Map<string, string>();
  for (const device of topology.devices) {
    const address = ipv4ToNumber(device.ipAddress);
    if (address === undefined) errors.push(`${device.name} has an invalid IPv4 address.`);
    if (!isValidSubnetMask(device.subnetMask)) errors.push(`${device.name} has an invalid subnet mask.`);
    if (address !== undefined) {
      const owner = addresses.get(device.ipAddress);
      if (owner) errors.push(`${device.ipAddress} is assigned to both ${owner} and ${device.name}.`);
      else addresses.set(device.ipAddress, device.name);
    }
  }
  for (const link of topology.links) {
    if (!ids.has(link.sourceId) || !ids.has(link.targetId)) errors.push(`Link ${link.id} references a missing device.`);
    if (link.sourceId === link.targetId) errors.push(`Link ${link.id} connects a device to itself.`);
    if (link.delayMs < 0 || !Number.isFinite(link.delayMs)) errors.push(`Link ${link.id} has an invalid delay.`);
  }
  return errors;
}

function findLayer2Path(topology: SimTopology, sourceId: string, destinationId: string): SimLink[] | undefined {
  const devices = new Map(topology.devices.map((device) => [device.id, device]));
  const queue: Array<{ deviceId: string; links: SimLink[] }> = [{ deviceId: sourceId, links: [] }];
  const visited = new Set([sourceId]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.deviceId === destinationId) return current.links;
    for (const link of topology.links) {
      if (!link.up) continue;
      const nextId = link.sourceId === current.deviceId ? link.targetId : link.targetId === current.deviceId ? link.sourceId : undefined;
      if (!nextId || visited.has(nextId)) continue;
      const nextDevice = devices.get(nextId);
      if (!nextDevice || (nextId !== destinationId && nextDevice.type !== "switch")) continue;
      visited.add(nextId);
      queue.push({ deviceId: nextId, links: [...current.links, link] });
    }
  }
  return undefined;
}

export class NetworkSimulator {
  private readonly arpCache = new Map<string, Map<string, string>>();
  private packetCounter = 0;

  clearArpCache(deviceId?: string): void {
    if (deviceId) this.arpCache.delete(deviceId);
    else this.arpCache.clear();
  }

  ping(topology: SimTopology, sourceId: string, destinationId: string): PingResult {
    const events: SimulationEvent[] = [];
    const queue = new EventQueue<SimulationEvent>();
    const devices = new Map(topology.devices.map((device) => [device.id, device]));
    const source = devices.get(sourceId);
    const destination = devices.get(destinationId);
    const packetId = `ICMP-${++this.packetCounter}`;

    const emit = (timeMs: number, kind: SimulationEvent["kind"], message: string, deviceId?: string, eventPacketId = packetId) => {
      queue.schedule(timeMs, { sequence: 0, timeMs, kind, packetId: eventPacketId, deviceId, message });
    };
    const fail = (reason: string): PingResult => {
      emit(queue.timeMs, "packet-dropped", reason, sourceId);
      events.push(...queue.run());
      return { sourceId, destinationId, reachable: false, failure: reason, events: events.map((event, sequence) => ({ ...event, sequence })) };
    };

    if (!source || !destination) return fail("Select an existing source and destination device.");
    const errors = validateTopology(topology);
    if (errors.length) return fail(errors[0]);
    if (source.id === destination.id) return fail("Source and destination must be different devices.");
    if (!areInSameSubnet(source.ipAddress, source.subnetMask, destination.ipAddress, destination.subnetMask)) {
      return fail("Destination is outside the local subnet. A configured router and route are required; routed ping is not implemented yet.");
    }

    const path = findLayer2Path(topology, source.id, destination.id);
    if (!path) return fail("No active Layer 2 path reaches the destination. Check the links and switch connections.");

    emit(0, "packet-created", `Created ICMP echo request from ${source.ipAddress} to ${destination.ipAddress}.`, source.id);
    const cachedMac = this.arpCache.get(source.id)?.get(destination.ipAddress);
    let forwardTime = 0;
    const deviceById = devices;
    let currentId = source.id;

    if (!cachedMac) {
      emit(0, "arp-request", `${source.name} broadcasts: who has ${destination.ipAddress}?`, source.id, `ARP-${this.packetCounter}`);
      for (const link of path) {
        forwardTime += link.delayMs;
        currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
        const currentDevice = deviceById.get(currentId);
        if (currentDevice?.type === "switch") emit(forwardTime, "frame-forwarded", `${currentDevice.name} floods the ARP broadcast.`, currentId, `ARP-${this.packetCounter}`);
      }
      emit(forwardTime, "arp-response", `${destination.name} replies with ${destination.macAddress}.`, destination.id, `ARP-${this.packetCounter}`);
      const cache = this.arpCache.get(source.id) ?? new Map<string, string>();
      cache.set(destination.ipAddress, destination.macAddress);
      this.arpCache.set(source.id, cache);
    }

    currentId = source.id;
    let packetTime = forwardTime;
    emit(packetTime, "icmp-echo-request", `${source.name} sends an ICMP echo request to ${destination.name}.`, source.id);
    for (const link of path) {
      packetTime += link.delayMs;
      currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
      const currentDevice = deviceById.get(currentId);
      if (currentDevice?.type === "switch") emit(packetTime, "frame-forwarded", `${currentDevice.name} forwards the frame toward ${destination.name}.`, currentId);
    }
    emit(packetTime, "packet-delivered", `${destination.name} received the ICMP echo request.`, destination.id);

    let replyTime = packetTime;
    emit(replyTime, "icmp-echo-reply", `${destination.name} sends an ICMP echo reply.`, destination.id, `ICMP-${this.packetCounter}-REPLY`);
    currentId = destination.id;
    for (const link of [...path].reverse()) {
      replyTime += link.delayMs;
      currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
      const currentDevice = deviceById.get(currentId);
      if (currentDevice?.type === "switch") emit(replyTime, "frame-forwarded", `${currentDevice.name} forwards the reply toward ${source.name}.`, currentId, `ICMP-${this.packetCounter}-REPLY`);
    }
    emit(replyTime, "packet-delivered", `${source.name} received the echo reply.`, source.id, `ICMP-${this.packetCounter}-REPLY`);
    events.push(...queue.run());
    return { sourceId, destinationId, reachable: true, rttMs: replyTime - forwardTime, events: events.map((event, sequence) => ({ ...event, sequence })) };
  }

  tcpHandshake(topology: SimTopology, sourceId: string, destinationId: string): TcpHandshakeResult {
    const events: SimulationEvent[] = [];
    const queue = new EventQueue<SimulationEvent>();
    const devices = new Map(topology.devices.map((device) => [device.id, device]));
    const source = devices.get(sourceId);
    const destination = devices.get(destinationId);
    const packetId = `TCP-${++this.packetCounter}`;
    const emit = (timeMs: number, kind: SimulationEvent["kind"], message: string, deviceId?: string, eventPacketId = packetId) => {
      queue.schedule(timeMs, { sequence: 0, timeMs, kind, packetId: eventPacketId, deviceId, message });
    };
    const fail = (reason: string): TcpHandshakeResult => {
      emit(queue.timeMs, "packet-dropped", reason, sourceId);
      events.push(...queue.run());
      return { sourceId, destinationId, established: false, failure: reason, events: events.map((event, sequence) => ({ ...event, sequence })) };
    };

    if (!source || !destination) return fail("Select an existing source and destination device.");
    const errors = validateTopology(topology);
    if (errors.length) return fail(errors[0]);
    if (source.id === destination.id) return fail("Source and destination must be different devices.");
    if (!areInSameSubnet(source.ipAddress, source.subnetMask, destination.ipAddress, destination.subnetMask)) {
      return fail("TCP handshake requires hosts on the same subnet until router forwarding is implemented.");
    }
    const path = findLayer2Path(topology, source.id, destination.id);
    if (!path) return fail("No active Layer 2 path reaches the destination. Check the links and switch connections.");

    emit(0, "packet-created", `Created TCP connection request from ${source.ipAddress} to ${destination.ipAddress}.`, source.id);
    let arpTime = 0;
    if (!this.arpCache.get(source.id)?.has(destination.ipAddress)) {
      emit(0, "arp-request", `${source.name} broadcasts: who has ${destination.ipAddress}?`, source.id, `ARP-${this.packetCounter}`);
      let currentId = source.id;
      for (const link of path) {
        arpTime += link.delayMs;
        currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
        if (devices.get(currentId)?.type === "switch") emit(arpTime, "frame-forwarded", `${devices.get(currentId)!.name} floods the ARP broadcast.`, currentId, `ARP-${this.packetCounter}`);
      }
      emit(arpTime, "arp-response", `${destination.name} replies with ${destination.macAddress}.`, destination.id, `ARP-${this.packetCounter}`);
      const cache = this.arpCache.get(source.id) ?? new Map<string, string>();
      cache.set(destination.ipAddress, destination.macAddress);
      this.arpCache.set(source.id, cache);
    }

    const oneWayDelay = path.reduce((total, link) => total + link.delayMs, 0);
    const synAckId = `${packetId}-SYN-ACK`;
    const ackId = `${packetId}-ACK`;
    emit(arpTime, "tcp-syn", `${source.name} sends SYN to ${destination.name}.`, source.id);
    let currentId = source.id;
    let timeMs = arpTime;
    for (const link of path) {
      timeMs += link.delayMs;
      currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
      if (devices.get(currentId)?.type === "switch") emit(timeMs, "frame-forwarded", `${devices.get(currentId)!.name} forwards the SYN segment.`, currentId);
    }
    emit(timeMs, "tcp-syn-ack", `${destination.name} replies with SYN-ACK.`, destination.id, synAckId);
    currentId = destination.id;
    for (const link of [...path].reverse()) {
      timeMs += link.delayMs;
      currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
      if (devices.get(currentId)?.type === "switch") emit(timeMs, "frame-forwarded", `${devices.get(currentId)!.name} forwards the SYN-ACK segment.`, currentId, synAckId);
    }
    emit(timeMs, "tcp-ack", `${source.name} acknowledges the SYN-ACK.`, source.id, ackId);
    currentId = source.id;
    for (const link of path) {
      timeMs += link.delayMs;
      currentId = link.sourceId === currentId ? link.targetId : link.sourceId;
      if (devices.get(currentId)?.type === "switch") emit(timeMs, "frame-forwarded", `${devices.get(currentId)!.name} forwards the final ACK.`, currentId, ackId);
    }
    emit(timeMs, "tcp-established", `Connection established after the three-way handshake (${oneWayDelay * 3} ms simulated).`, destination.id, ackId);
    events.push(...queue.run());
    return { sourceId, destinationId, established: true, durationMs: oneWayDelay * 3, events: events.map((event, sequence) => ({ ...event, sequence })) };
  }
}