export type DeviceType = "host" | "router" | "switch" | "server";

export interface SimDevice {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  subnetMask: string;
  macAddress: string;
  defaultGateway?: string;
}

export interface SimLink {
  id: string;
  sourceId: string;
  targetId: string;
  up: boolean;
  delayMs: number;
}

export interface SimTopology {
  devices: SimDevice[];
  links: SimLink[];
}

export type SimulationEventKind =
  | "packet-created"
  | "arp-request"
  | "arp-response"
  | "frame-forwarded"
  | "icmp-echo-request"
  | "icmp-echo-reply"
  | "tcp-syn"
  | "tcp-syn-ack"
  | "tcp-ack"
  | "tcp-established"
  | "packet-delivered"
  | "packet-dropped";

export interface SimulationEvent {
  sequence: number;
  timeMs: number;
  kind: SimulationEventKind;
  packetId?: string;
  deviceId?: string;
  message: string;
}

export interface PingResult {
  sourceId: string;
  destinationId: string;
  reachable: boolean;
  rttMs?: number;
  failure?: string;
  events: SimulationEvent[];
}

export interface TcpHandshakeResult {
  sourceId: string;
  destinationId: string;
  established: boolean;
  durationMs?: number;
  failure?: string;
  events: SimulationEvent[];
}