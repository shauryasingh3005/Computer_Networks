import { longestPrefixMatch } from "./routing";
import { ipv4ToNumber } from "./ipv4";
import type { PingOptions, PingResult, RouterInterface, SimDevice, SimLink, SimTopology, SimulationEvent, StaticRoute, TcpHandshakeResult } from "./types";
export { ipv4ToNumber } from "./ipv4";

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

function belongsToSubnet(address: string, subnetAddress: string, mask: string): boolean {
  const addressValue = ipv4ToNumber(address);
  const subnetValue = ipv4ToNumber(subnetAddress);
  const maskValue = ipv4ToNumber(mask);
  return addressValue !== undefined && subnetValue !== undefined && maskValue !== undefined
    && (addressValue & maskValue) === (subnetValue & maskValue);
}

function routerInterfaces(topology: SimTopology, router: SimDevice): RouterInterface[] {
  if (router.interfaces !== undefined) return router.interfaces;
  const links = topology.links.filter((link) => link.sourceId === router.id || link.targetId === router.id);
  if (links.length !== 1) return [];
  return [{
    id: `${router.id}-legacy`,
    name: "eth0",
    ipAddress: router.ipAddress,
    subnetMask: router.subnetMask,
    macAddress: router.macAddress,
    linkId: links[0].id,
    enabled: true,
  }];
}

export function validateTopology(topology: SimTopology): string[] {
  const errors: string[] = [];
  const ids = new Set(topology.devices.map((device) => device.id));
  const addresses = new Map<string, string>();
  for (const device of topology.devices) {
    if (device.type === "router" && device.interfaces !== undefined) {
      const interfaceIds = new Set<string>();
      const interfaceLinks = new Set<string>();
      for (const networkInterface of device.interfaces) {
        if (interfaceIds.has(networkInterface.id)) errors.push(`${device.name} has duplicate interface ID ${networkInterface.id}.`);
        interfaceIds.add(networkInterface.id);
        const address = ipv4ToNumber(networkInterface.ipAddress);
        if (address === undefined) errors.push(`${device.name} ${networkInterface.name} has an invalid IPv4 address.`);
        if (!isValidSubnetMask(networkInterface.subnetMask)) errors.push(`${device.name} ${networkInterface.name} has an invalid subnet mask.`);
        if (address !== undefined) {
          const owner = addresses.get(String(address));
          if (owner) errors.push(`${networkInterface.ipAddress} is assigned to both ${owner} and ${device.name} ${networkInterface.name}.`);
          else addresses.set(String(address), `${device.name} ${networkInterface.name}`);
        }
        if (networkInterface.linkId) {
          if (interfaceLinks.has(networkInterface.linkId)) {
            errors.push(`${device.name} maps more than one interface to link ${networkInterface.linkId}.`);
          }
          interfaceLinks.add(networkInterface.linkId);
          const link = topology.links.find((candidate) => candidate.id === networkInterface.linkId);
          if (!link || (link.sourceId !== device.id && link.targetId !== device.id)) {
            errors.push(`${device.name} ${networkInterface.name} is not associated with a link connected to the router.`);
          }
        }
      }
      for (const route of device.staticRoutes ?? []) {
        if (ipv4ToNumber(route.destination) === undefined || !Number.isInteger(route.prefixLength) || route.prefixLength < 0 || route.prefixLength > 32) {
          errors.push(`${device.name} has an invalid static route destination or prefix.`);
        }
        if (ipv4ToNumber(route.nextHop) === undefined) errors.push(`${device.name} has an invalid static route next hop.`);
        if (!interfaceIds.has(route.interfaceName) && !routerInterfaces(topology, device).some((item) => item.id === route.interfaceName)) {
          errors.push(`${device.name} has a static route that references a missing interface.`);
        }
        if (!Number.isFinite(route.metric) || route.metric < 0) errors.push(`${device.name} has an invalid static route metric.`);
      }
      if (device.defaultGateway && ipv4ToNumber(device.defaultGateway) === undefined) {
        errors.push(`${device.name} has an invalid default gateway address.`);
      }
      continue;
    }

    const address = ipv4ToNumber(device.ipAddress);
    if (address === undefined) errors.push(`${device.name} has an invalid IPv4 address.`);
    if (!isValidSubnetMask(device.subnetMask)) errors.push(`${device.name} has an invalid subnet mask.`);
    if (address !== undefined) {
      const owner = addresses.get(String(address));
      if (owner) errors.push(`${device.ipAddress} is assigned to both ${owner} and ${device.name}.`);
      else addresses.set(String(address), device.name);
    }
    if (device.defaultGateway && ipv4ToNumber(device.defaultGateway) === undefined) {
      errors.push(`${device.name} has an invalid default gateway address.`);
    }
  }
  for (const link of topology.links) {
    if (!ids.has(link.sourceId) || !ids.has(link.targetId)) errors.push(`Link ${link.id} references a missing device.`);
    if (link.sourceId === link.targetId) errors.push(`Link ${link.id} connects a device to itself.`);
    if (link.delayMs < 0 || !Number.isFinite(link.delayMs)) errors.push(`Link ${link.id} has an invalid delay.`);
  }
  return errors;
}

function findSegmentPath(topology: SimTopology, sourceId: string, destinationId: string): SimLink[] | undefined {
  if (sourceId === destinationId) return [];
  const devices = new Map(topology.devices.map((device) => [device.id, device]));
  const queue: Array<{ deviceId: string; links: SimLink[] }> = [{ deviceId: sourceId, links: [] }];
  const visited = new Set([sourceId]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.deviceId !== sourceId && devices.get(current.deviceId)?.type !== "switch") continue;
    for (const link of topology.links) {
      if (!link.up) continue;
      const nextId = link.sourceId === current.deviceId ? link.targetId : link.targetId === current.deviceId ? link.sourceId : undefined;
      if (!nextId || visited.has(nextId)) continue;
      const nextDevice = devices.get(nextId);
      if (!nextDevice || (nextId !== destinationId && nextDevice.type !== "switch")) continue;
      const path = [...current.links, link];
      if (nextId === destinationId) return path;
      visited.add(nextId);
      queue.push({ deviceId: nextId, links: path });
    }
  }
  return undefined;
}

function linkPeer(link: SimLink, deviceId: string): string | undefined {
  if (link.sourceId === deviceId) return link.targetId;
  if (link.targetId === deviceId) return link.sourceId;
  return undefined;
}

function pathToRouterInterface(topology: SimTopology, sourceId: string, routerId: string, networkInterface: RouterInterface): SimLink[] | undefined {
  const link = topology.links.find((candidate) => candidate.id === networkInterface.linkId && candidate.up);
  const peerId = link && linkPeer(link, routerId);
  if (!link || !peerId) return undefined;
  const segment = findSegmentPath(topology, sourceId, peerId);
  return segment ? [...segment, link] : undefined;
}

function pathFromRouterInterface(
  topology: SimTopology,
  routerId: string,
  networkInterface: RouterInterface,
  destinationId: string,
  destinationInterface?: RouterInterface,
): SimLink[] | undefined {
  const outgoingLink = topology.links.find((candidate) => candidate.id === networkInterface.linkId && candidate.up);
  const outgoingPeer = outgoingLink && linkPeer(outgoingLink, routerId);
  if (!outgoingLink || !outgoingPeer) return undefined;
  if (destinationInterface && destinationInterface.linkId === outgoingLink.id) return [outgoingLink];
  if (!destinationInterface && outgoingPeer === destinationId) return [outgoingLink];

  const destinationLink = destinationInterface
    ? topology.links.find((candidate) => candidate.id === destinationInterface.linkId && candidate.up)
    : undefined;
  const destinationPeer = destinationInterface && destinationLink && linkPeer(destinationLink, destinationId);
  if (destinationInterface && (!destinationLink || !destinationPeer)) return undefined;

  const segment = findSegmentPath(topology, outgoingPeer, destinationPeer ?? destinationId);
  if (!segment) return undefined;
  return destinationLink ? [outgoingLink, ...segment, destinationLink] : [outgoingLink, ...segment];
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
    if (!deviceId) {
      this.arpCache.clear();
      return;
    }
    for (const key of this.arpCache.keys()) {
      if (key === deviceId || key.startsWith(`${deviceId}:`)) this.arpCache.delete(key);
    }
  }

  ping(topology: SimTopology, sourceId: string, destinationId: string, options: PingOptions = {}): PingResult {
    const events: SimulationEvent[] = [];
    const queue = new EventQueue<SimulationEvent>();
    const devices = new Map(topology.devices.map((device) => [device.id, device]));
    const source = devices.get(sourceId);
    const destination = devices.get(destinationId);
    const packetId = `ICMP-${++this.packetCounter}`;

    const emit = (
      timeMs: number,
      kind: SimulationEvent["kind"],
      message: string,
      deviceId?: string,
      eventPacketId = packetId,
      linkId?: string,
    ) => {
      queue.schedule(timeMs, { sequence: 0, timeMs, kind, packetId: eventPacketId, deviceId, linkId, message });
    };
    const fail = (reason: string, deviceId = sourceId): PingResult => {
      emit(queue.timeMs, "packet-dropped", reason, deviceId);
      events.push(...queue.run());
      return { sourceId, destinationId, reachable: false, failure: reason, events: events.map((event, sequence) => ({ ...event, sequence })) };
    };

    if (!source || !destination) return fail("Select an existing source and destination device.");
    const errors = validateTopology(topology);
    if (errors.length) return fail(errors[0]);
    if (source.id === destination.id) return fail("Source and destination must be different devices.");
    if (!areInSameSubnet(source.ipAddress, source.subnetMask, destination.ipAddress, destination.subnetMask)) {
      const activeInterfaces = (router: SimDevice) => routerInterfaces(topology, router);
      const allRouterInterfaces = topology.devices
        .filter((device) => device.type === "router")
        .flatMap((router) => activeInterfaces(router).map((networkInterface) => ({ router, networkInterface })));
      const findIpEndpoint = (address: string) => {
        for (const { router, networkInterface } of allRouterInterfaces) {
          if (networkInterface.ipAddress === address) return { device: router, networkInterface };
        }
        const device = topology.devices.find((candidate) => candidate.type !== "router" && candidate.type !== "switch" && candidate.ipAddress === address);
        return device ? { device } : undefined;
      };
      const failure = (reason: string, deviceId = sourceId, timeMs = queue.timeMs): PingResult => {
        emit(timeMs, "packet-dropped", reason, deviceId);
        events.push(...queue.run());
        return { sourceId, destinationId, reachable: false, failure: reason, events: events.map((event, sequence) => ({ ...event, sequence })) };
      };

      const traceDirection = (
        from: SimDevice,
        to: SimDevice,
        startTime: number,
        directionPacketId: string,
        initialTtl: number,
        reply: boolean,
      ): { timeMs: number; transitMs: number; failure?: string; failureDeviceId?: string } => {
        let timeMs = startTime;
        let transitMs = 0;
        let ttl = initialTtl;
        const sender = from;
        const arpSenderName = (deviceId: string) => devices.get(deviceId)?.name ?? deviceId;
        const transmit = (path: SimLink[], start: number, senderId: string, arpPacketId: string): number => {
          let currentId = senderId;
          let at = start;
          for (const link of path) {
            at += link.delayMs;
            currentId = linkPeer(link, currentId) ?? currentId;
            const currentDevice = devices.get(currentId);
            if (currentDevice?.type === "switch") {
              emit(at, "frame-forwarded", `${currentDevice.name} forwards traffic on ${link.id}.`, currentId, arpPacketId, link.id);
            }
          }
          return at;
        };
        const resolveArp = (
          senderId: string,
          interfaceId: string | undefined,
          target: { device: SimDevice; networkInterface?: RouterInterface },
          path: SimLink[],
        ): string | undefined => {
          const cacheKey = `${senderId}:${interfaceId ?? ""}`;
          if (this.arpCache.get(cacheKey)?.has(target.networkInterface?.ipAddress ?? target.device.ipAddress)) return undefined;
          const targetAddress = target.networkInterface?.ipAddress ?? target.device.ipAddress;
          const arpPacketId = `ARP-${this.packetCounter}-${cacheKey}`;
          emit(timeMs, "arp-request", `${arpSenderName(senderId)} broadcasts: who has ${targetAddress}?`, senderId, arpPacketId);
          timeMs = transmit(path, timeMs, senderId, arpPacketId);
          emit(timeMs, "arp-response", `${target.device.name} replies with ${target.networkInterface?.macAddress ?? target.device.macAddress}.`, target.device.id, arpPacketId);
          timeMs = transmit([...path].reverse(), timeMs, target.device.id, arpPacketId);
          const cache = this.arpCache.get(cacheKey) ?? new Map<string, string>();
          cache.set(targetAddress, target.networkInterface?.macAddress ?? target.device.macAddress);
          this.arpCache.set(cacheKey, cache);
          return undefined;
        };
        const sendPacket = (path: SimLink[], senderId: string): void => {
          let currentId = senderId;
          for (const link of path) {
            timeMs += link.delayMs;
            transitMs += link.delayMs;
            currentId = linkPeer(link, currentId) ?? currentId;
            emit(timeMs, "frame-forwarded", `Packet forwarded over ${link.id}.`, currentId, directionPacketId, link.id);
          }
        };
        const failTrace = (reason: string, deviceId: string) => ({ timeMs, transitMs, failure: reason, failureDeviceId: deviceId });

        const sameSubnet = areInSameSubnet(sender.ipAddress, sender.subnetMask, to.ipAddress, to.subnetMask);
        if (sameSubnet) {
          const path = findLayer2Path(topology, sender.id, to.id);
          if (!path) return failTrace("No active Layer 2 path reaches the destination. Check the links and switch connections.", sender.id);
          resolveArp(sender.id, undefined, { device: to }, path);
          if (reply) emit(timeMs, "icmp-echo-reply", `${sender.name} sends an ICMP echo reply to ${to.name}.`, sender.id, directionPacketId);
          sendPacket(path, sender.id);
          emit(timeMs, "packet-delivered", `${to.name} received the ICMP ${reply ? "echo reply" : "echo request"}.`, to.id, directionPacketId);
          return { timeMs, transitMs };
        }

        const gateway = sender.defaultGateway;
        if (!gateway) return failTrace(`${sender.name} has no default gateway configured for the remote subnet.`, sender.id);
        if (ipv4ToNumber(gateway) === undefined) return failTrace(`${sender.name} has an invalid default gateway address.`, sender.id);
        if (!belongsToSubnet(gateway, sender.ipAddress, sender.subnetMask)) {
          return failTrace(`${sender.name}'s default gateway ${gateway} is outside the local subnet.`, sender.id);
        }
        const gatewayMatches = allRouterInterfaces.filter((entry) => entry.networkInterface.ipAddress === gateway);
        const gatewayEntry = gatewayMatches.find((entry) => entry.networkInterface.enabled);
        if (!gatewayEntry) {
          return failTrace(gatewayMatches.length
            ? `Router interface for default gateway ${gateway} is disabled.`
            : `No configured router interface uses default gateway ${gateway}.`, sender.id);
        }
        const gatewayLink = topology.links.find((link) => link.id === gatewayEntry.networkInterface.linkId);
        if (!gatewayLink) return failTrace(`Router interface ${gatewayEntry.networkInterface.name} has no associated physical link.`, gatewayEntry.router.id);
        if (!gatewayLink.up) return failTrace(`Link ${gatewayLink.id} to the default gateway is down.`, gatewayEntry.router.id);
        if (!belongsToSubnet(sender.ipAddress, gateway, gatewayEntry.networkInterface.subnetMask)) {
          return failTrace(`Default gateway ${gateway} is not configured on ${sender.name}'s local subnet.`, sender.id);
        }
        const gatewayPath = pathToRouterInterface(topology, sender.id, gatewayEntry.router.id, gatewayEntry.networkInterface);
        if (!gatewayPath) return failTrace(`Default gateway ${gateway} is unreachable from ${sender.name}.`, sender.id);
        resolveArp(sender.id, undefined, { device: gatewayEntry.router, networkInterface: gatewayEntry.networkInterface }, gatewayPath);
        if (reply) emit(timeMs, "icmp-echo-reply", `${sender.name} sends an ICMP echo reply to ${to.name}.`, sender.id, directionPacketId);
        else emit(timeMs, "icmp-echo-request", `${sender.name} sends an ICMP echo request to ${to.name}.`, sender.id, directionPacketId);
        sendPacket(gatewayPath, sender.id);

        let currentRouter = gatewayEntry.router;
        let incomingInterface = gatewayEntry.networkInterface;
        while (true) {
          emit(timeMs, "router-received", `${currentRouter.name} received the packet on ${incomingInterface.name}.`, currentRouter.id, directionPacketId);
          ttl -= 1;
          emit(timeMs, "ttl-decremented", `${currentRouter.name} decremented TTL to ${ttl}.`, currentRouter.id, directionPacketId);
          if (ttl <= 0) return failTrace(`TTL expired at ${currentRouter.name}.`, currentRouter.id);

          const interfaces = activeInterfaces(currentRouter);
          const connectedRoutes: StaticRoute[] = interfaces.flatMap((networkInterface) => {
            const subnet = calculateSubnet(networkInterface.ipAddress, networkInterface.subnetMask);
            if (!subnet) return [];
            return [{
              destination: subnet.networkAddress,
              prefixLength: subnet.prefixLength,
              nextHop: "",
              interfaceName: networkInterface.id,
              metric: 0,
              type: "connected",
            }];
          });
          const routes = [...connectedRoutes, ...(currentRouter.staticRoutes ?? [])];
          const selectedRoute = longestPrefixMatch(routes, to.ipAddress);
          emit(timeMs, "route-lookup", selectedRoute
            ? `${currentRouter.name} selected ${selectedRoute.destination}/${selectedRoute.prefixLength} via ${selectedRoute.interfaceName}${selectedRoute.type === "connected" ? " (connected)" : ` next hop ${selectedRoute.nextHop}`}.`
            : `${currentRouter.name} has no route to ${to.ipAddress}.`, currentRouter.id, directionPacketId);
          if (!selectedRoute) return failTrace(`No matching route on ${currentRouter.name} for ${to.ipAddress}.`, currentRouter.id);

          const outgoingInterface = interfaces.find((networkInterface) => networkInterface.id === selectedRoute.interfaceName);
          if (!outgoingInterface || !outgoingInterface.enabled) {
            return failTrace(`Router interface ${selectedRoute.interfaceName} is not configured or is disabled on ${currentRouter.name}.`, currentRouter.id);
          }
          const outgoingLink = topology.links.find((link) => link.id === outgoingInterface.linkId);
          if (!outgoingLink) return failTrace(`Router interface ${outgoingInterface.name} has no associated physical link.`, currentRouter.id);
          if (!outgoingLink.up) return failTrace(`Link ${outgoingLink.id} on ${currentRouter.name} is down.`, currentRouter.id);

          let nextHop: { device: SimDevice; networkInterface?: RouterInterface };
          if (selectedRoute.type === "connected") {
            const destinationRouter = allRouterInterfaces.find((entry) => entry.router.id === to.id && entry.networkInterface.ipAddress === to.ipAddress);
            nextHop = destinationRouter
              ? { device: destinationRouter.router, networkInterface: destinationRouter.networkInterface }
              : { device: to };
          } else {
            if (!belongsToSubnet(selectedRoute.nextHop, outgoingInterface.ipAddress, outgoingInterface.subnetMask)) {
              return failTrace(`Static route next hop ${selectedRoute.nextHop} is not reachable on ${outgoingInterface.name}.`, currentRouter.id);
            }
            const target = findIpEndpoint(selectedRoute.nextHop);
            if (!target || target.device.type !== "router" || !target.networkInterface) {
              return failTrace(`Static route next hop ${selectedRoute.nextHop} is unreachable or is not a router interface.`, currentRouter.id);
            }
            if (!target.networkInterface.enabled) return failTrace(`Static route next hop ${selectedRoute.nextHop} is on a disabled router interface.`, currentRouter.id);
            nextHop = target;
          }

          const path = pathFromRouterInterface(
            topology,
            currentRouter.id,
            outgoingInterface,
            nextHop.device.id,
            nextHop.networkInterface,
          );
          if (!path) {
            const message = nextHop.networkInterface
              ? `Next hop ${nextHop.networkInterface.ipAddress} is unreachable from ${currentRouter.name}.`
              : `Destination ${to.ipAddress} is unreachable through ${outgoingInterface.name}.`;
            return failTrace(message, currentRouter.id);
          }
          resolveArp(currentRouter.id, outgoingInterface.id, nextHop, path);
          emit(timeMs, "router-forwarded", `${currentRouter.name} forwards the packet through ${outgoingInterface.name}.`, currentRouter.id, directionPacketId, outgoingInterface.linkId);
          sendPacket(path, currentRouter.id);
          if (nextHop.device.id === to.id) {
            emit(timeMs, "packet-delivered", `${to.name} received the ICMP ${reply ? "echo reply" : "echo request"}.`, to.id, directionPacketId);
            return { timeMs, transitMs };
          }
          if (nextHop.device.type !== "router" || !nextHop.networkInterface) {
            return failTrace(`Destination ${to.ipAddress} is unreachable.`, currentRouter.id);
          }
          currentRouter = nextHop.device;
          incomingInterface = nextHop.networkInterface;
        }
      };

      emit(0, "packet-created", `Created ICMP echo request from ${source.ipAddress} to ${destination.ipAddress}.`, source.id);
      const request = traceDirection(source, destination, 0, packetId, options?.ttl ?? 64, false);
      if (request.failure) return failure(request.failure, request.failureDeviceId, request.timeMs);
      const reply = traceDirection(destination, source, request.timeMs, `ICMP-${this.packetCounter}-REPLY`, options?.ttl ?? 64, true);
      if (reply.failure) return failure(`Missing return route: ${reply.failure}`, reply.failureDeviceId, reply.timeMs);
      events.push(...queue.run());
      return {
        sourceId,
        destinationId,
        reachable: true,
        rttMs: request.transitMs + reply.transitMs,
        events: events.map((event, sequence) => ({ ...event, sequence })),
      };
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