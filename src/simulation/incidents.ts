import { simulateAttackLoad } from "./attack-demo";
import type { SimDevice, SimLink, SimTopology } from "./types";

export type IncidentPhase = "normal" | "attack" | "impact" | "recovery" | "resolved";

export interface IncidentDefense {
  id: string;
  label: string;
}

export interface IncidentNodeInfo {
  role: string;
  x: number;
  y: number;
}

export interface IncidentTelemetry {
  baseLatencyMs: number;
  baseCpuPct: number;
  baseBandwidthPct: number;
  legitimateRequestsPerSecond: number;
  processingCapacityPerSecond: number;
  queueCapacity: number;
  baseConnections: number;
  networkCapacityMbps: number;
}

export interface IncidentEnvironment {
  id: string;
  name: string;
  description: string;
  topology: SimTopology;
  nodeInfo: Record<string, IncidentNodeInfo>;
  telemetry: IncidentTelemetry;
  scenarios: IncidentScenario[];
}

export interface IncidentEffects {
  availabilityDropPct: number;
  latencyIncreaseMs: number;
  packetLossIncreasePct: number;
  cpuIncreasePct: number;
  bandwidthIncreasePct: number;
  connectionSurge: number;
  devicesAffected: number;
  attackRequestsAtMax: number;
  attackBandwidthAtMaxMbps: number;
  mitigationRatio: number;
}

export interface IncidentScenario {
  id: string;
  name: string;
  category: string;
  brief: string;
  rootCause: string;
  mechanism: string;
  userImpact: string;
  targetDeviceId: string;
  attackerDeviceIds: string[];
  affectedDeviceIds: string[];
  defenseId: string;
  defenses: IncidentDefense[];
  effects: IncidentEffects;
  hints: string[];
  recommendations: string[];
}

export interface IncidentMetrics {
  availabilityPct: number;
  latencyMs: number;
  packetLossPct: number;
  bandwidthUtilizationPct: number;
  activeDevices: number;
  activeConnections: number;
  serverCpuPct: number;
  requestsProcessedPerSecond: number;
  trafficVolumeMbps: number;
  attackTrafficPerSecond: number;
  effectiveAttackTrafficPerSecond: number;
  legitimateTrafficPerSecond: number;
  queueSize: number;
  queueCapacity: number;
  requestsDroppedPerSecond: number;
  legitimateRequestsDeniedPerSecond: number;
  filteredAttackTrafficPerSecond: number;
  healthScore: number;
}

export interface IncidentLogEntry {
  second: number;
  level: "info" | "warning" | "critical" | "success";
  message: string;
}

export interface IncidentAlert {
  id: string;
  severity: "warning" | "critical" | "success";
  message: string;
}

export interface IncidentState {
  scenarioId: string;
  phase: IncidentPhase;
  intensity: number;
  simulatedSeconds: number;
  recoveryStep: number;
  defenseId?: string;
  correctDefenseActivated: boolean;
  pendingAttackRequests: number;
  pendingLegitimateRequests: number;
  inspectedDeviceIds: string[];
  hintsUsed: number;
  wrongDefenseAttempts: number;
  actions: string[];
  logs: IncidentLogEntry[];
  metrics: IncidentMetrics;
  beforeMetrics: IncidentMetrics;
  peakMetrics?: IncidentMetrics;
  afterMetrics?: IncidentMetrics;
}

export interface IncidentReport {
  environment: string;
  scenario: string;
  description: string;
  rootCause: string;
  mechanism: string;
  userImpact: string;
  actionsTaken: string[];
  defenseCorrect: boolean;
  recoveryTimeSeconds: number;
  finalHealth: number;
  score: number;
  recommendations: string[];
  before: IncidentMetrics;
  during: IncidentMetrics;
  after: IncidentMetrics;
}

interface DeviceDefinition extends SimDevice {
  role: string;
}

interface EnvironmentDefinition {
  id: string;
  name: string;
  description: string;
  telemetry: IncidentTelemetry;
  devices: DeviceDefinition[];
  links: SimLink[];
  scenarios: IncidentScenario[];
}

const defenseCatalog: Record<string, IncidentDefense> = {
  "dhcp-snooping": { id: "dhcp-snooping", label: "Enable DHCP snooping" },
  "disable-rogue-ap": { id: "disable-rogue-ap", label: "Contain unauthorized access point" },
  "dnssec": { id: "dnssec", label: "Enable DNSSEC validation" },
  "arp-inspection": { id: "arp-inspection", label: "Enable Dynamic ARP Inspection" },
  "rate-limit": { id: "rate-limit", label: "Apply upstream rate limiting" },
  "trusted-resolver": { id: "trusted-resolver", label: "Restore trusted DNS resolver" },
  "segment-network": { id: "segment-network", label: "Enforce network segmentation" },
  "network-access-control": { id: "network-access-control", label: "Quarantine unknown device" },
  "waf-validation": { id: "waf-validation", label: "Enable application validation" },
  "session-hardening": { id: "session-hardening", label: "Revoke sessions and require re-authentication" },
  "syn-cookies": { id: "syn-cookies", label: "Enable SYN cookies" },
  "tls-encryption": { id: "tls-encryption", label: "Enforce authenticated encryption" },
  "dns-inspection": { id: "dns-inspection", label: "Inspect and restrict DNS egress" },
  "route-filtering": { id: "route-filtering", label: "Apply route and prefix filtering" },
  "port-security": { id: "port-security", label: "Enable switch port security" },
  "vlan-hardening": { id: "vlan-hardening", label: "Harden trunks and VLAN boundaries" },
  "firewall-filter": { id: "firewall-filter", label: "Apply firewall filtering" },
};

function incident(
  id: string,
  name: string,
  category: string,
  brief: string,
  rootCause: string,
  targetDeviceId: string,
  attackerDeviceIds: string[],
  affectedDeviceIds: string[],
  defenseId: string,
  hints: [string, string],
  effects: Partial<IncidentEffects>,
): IncidentScenario {
  const defenseOrder = [defenseId, "firewall-filter", "network-access-control"].filter((value, index, list) => list.indexOf(value) === index);
  return {
    id,
    name,
    category,
    brief,
    rootCause,
    mechanism: `${name} changes network demand, trust, or reachability around ${targetDeviceId}. The model shows this as local, illustrative traffic and state changes only.`,
    userImpact: "Users may see delayed, failed, or misdirected service requests while the incident remains active.",
    targetDeviceId,
    attackerDeviceIds,
    affectedDeviceIds,
    defenseId,
    defenses: defenseOrder.map((key) => defenseCatalog[key]),
    effects: {
      availabilityDropPct: 20,
      latencyIncreaseMs: 120,
      packetLossIncreasePct: 12,
      cpuIncreasePct: 25,
      bandwidthIncreasePct: 30,
      connectionSurge: 50,
      devicesAffected: 1,
      attackRequestsAtMax: 80,
      attackBandwidthAtMaxMbps: 70,
      mitigationRatio: 0.08,
      ...effects,
    },
    hints: [...hints],
    recommendations: [
      "Keep a timestamped incident log and preserve the simulated telemetry for review.",
      `Validate that ${defenseCatalog[defenseId].label.toLowerCase()} remains effective during recovery.`,
    ],
  };
}

function host(id: string, name: string, address: string, role: string): DeviceDefinition {
  const octets = address.split(".").map((octet) => Number(octet).toString(16).padStart(2, "0"));
  return { id, name, type: "host", ipAddress: address, subnetMask: "255.255.255.0", macAddress: `02:00:${octets.join(":")}`, role };
}

function server(id: string, name: string, address: string, role: string): DeviceDefinition {
  return { ...host(id, name, address, role), type: "server" };
}

function switchDevice(id: string, name: string, address: string, role: string): DeviceDefinition {
  return { ...host(id, name, address, role), type: "switch" };
}

function router(id: string, name: string, address: string, role: string): DeviceDefinition {
  return { ...host(id, name, address, role), type: "router" };
}

function link(id: string, sourceId: string, targetId: string, delayMs = 2): SimLink {
  return { id, sourceId, targetId, up: true, delayMs };
}

function environment(definition: EnvironmentDefinition): IncidentEnvironment {
  const nodeInfo: Record<string, IncidentNodeInfo> = {};
  const devices = definition.devices.map((device, index) => {
    nodeInfo[device.id] = {
      role: device.role,
      x: 110 + (index % 4) * 270,
      y: 92 + Math.floor(index / 4) * 190,
    };
    return {
      id: device.id,
      name: device.name,
      type: device.type,
      ipAddress: device.ipAddress,
      subnetMask: device.subnetMask,
      macAddress: device.macAddress,
    };
  });
  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    topology: { devices, links: definition.links },
    nodeInfo,
    telemetry: definition.telemetry,
    scenarios: definition.scenarios,
  };
}

const defaultTelemetry = {
  baseLatencyMs: 18,
  baseCpuPct: 28,
  baseBandwidthPct: 32,
  legitimateRequestsPerSecond: 24,
  processingCapacityPerSecond: 42,
  queueCapacity: 90,
  baseConnections: 320,
  networkCapacityMbps: 1000,
};

export const incidentEnvironments: IncidentEnvironment[] = [
  environment({
    id: "campus",
    name: "University campus",
    description: "Student, faculty, Wi-Fi, and shared campus services across an access and core network.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 16, legitimateRequestsPerSecond: 28, processingCapacityPerSecond: 48, baseConnections: 850 },
    devices: [
      host("student-a", "Student laptop", "10.10.1.21", "Student endpoint"),
      host("faculty", "Faculty workstation", "10.10.1.31", "Faculty endpoint"),
      server("campus-ap", "Managed Wi-Fi AP", "10.10.1.41", "Managed wireless access"),
      server("rogue-ap", "Unapproved AP", "10.10.1.42", "Unmanaged wireless access"),
      switchDevice("access-switch", "Campus access switch", "10.10.1.2", "Student and faculty access"),
      switchDevice("core-switch", "Campus core switch", "10.10.1.3", "Distribution layer"),
      router("campus-gateway", "Campus gateway", "10.10.1.1", "Internet and subnet gateway"),
      server("dhcp", "DHCP service", "10.10.1.50", "Address assignment"),
      server("dns", "Campus DNS", "10.10.1.53", "Name resolution"),
      server("portal", "University services", "10.10.1.80", "Learning and campus portal"),
      host("bot-a", "Simulated source A", "10.10.1.91", "Isolated attack source"),
      host("bot-b", "Simulated source B", "10.10.1.92", "Isolated attack source"),
    ],
    links: [
      link("student-ap", "student-a", "campus-ap"), link("faculty-access", "faculty", "access-switch"),
      link("ap-access", "campus-ap", "access-switch"), link("rogue-access", "rogue-ap", "access-switch"),
      link("bot-a-access", "bot-a", "access-switch"), link("bot-b-access", "bot-b", "access-switch"),
      link("access-core", "access-switch", "core-switch"), link("core-gateway", "core-switch", "campus-gateway"),
      link("core-dhcp", "core-switch", "dhcp"), link("core-dns", "core-switch", "dns"), link("core-portal", "core-switch", "portal"),
    ],
    scenarios: [
      incident("campus-dhcp", "DHCP starvation", "Network access", "Students report that new devices cannot obtain an address; DHCP request volume is elevated.", "The simulated lease pool is consumed by excessive untrusted requests.", "dhcp", ["bot-a", "bot-b"], ["student-a", "faculty"], "dhcp-snooping", ["Check whether the address pool is exhausted.", "Compare trusted and untrusted switch ports."], { attackRequestsAtMax: 120, availabilityDropPct: 28, latencyIncreaseMs: 90, packetLossIncreasePct: 14, devicesAffected: 2, mitigationRatio: 0.04 }),
      incident("campus-rogue-ap", "Rogue access point", "Wireless", "Students report unfamiliar Wi-Fi behavior near a busy campus area.", "An unmanaged access point is connected to the campus access layer.", "rogue-ap", ["rogue-ap"], ["student-a", "faculty"], "disable-rogue-ap", ["Inspect access-point inventory and uplinks.", "Compare the AP identity with the managed inventory."], { attackRequestsAtMax: 12, availabilityDropPct: 24, latencyIncreaseMs: 45, devicesAffected: 2, mitigationRatio: 0.05 }),
      incident("campus-dns", "DNS spoofing", "DNS", "Campus users reach an unexpected destination after resolving a familiar service name.", "An untrusted DNS answer is being accepted by clients.", "dns", ["bot-a"], ["student-a", "portal"], "dnssec", ["Inspect the resolver answer and its trust status.", "Compare the returned record with the trusted service record."], { attackRequestsAtMax: 10, availabilityDropPct: 34, latencyIncreaseMs: 75, packetLossIncreasePct: 10, bandwidthIncreasePct: 8, mitigationRatio: 0.12 }),
      incident("campus-arp", "ARP poisoning", "Network layer", "Users report intermittent interception symptoms on a shared campus segment.", "A false local IP-to-MAC mapping redirects traffic through an untrusted device.", "access-switch", ["bot-a"], ["student-a", "faculty"], "arp-inspection", ["Inspect the ARP mapping for the gateway.", "Look for a MAC address claiming multiple IP identities."], { attackRequestsAtMax: 20, availabilityDropPct: 38, latencyIncreaseMs: 110, packetLossIncreasePct: 18, mitigationRatio: 0.08 }),
      incident("campus-ddos", "Campus services DDoS", "Denial of service", "The university portal is intermittently unavailable while incoming demand rises.", "Distributed simulated requests exceed the portal's processing and queue capacity.", "portal", ["bot-a", "bot-b"], ["student-a", "faculty", "portal"], "rate-limit", ["Compare incoming request rate with processing capacity.", "Check whether queue growth is displacing ordinary requests."], { attackRequestsAtMax: 190, attackBandwidthAtMaxMbps: 180, availabilityDropPct: 18, latencyIncreaseMs: 250, packetLossIncreasePct: 22, cpuIncreasePct: 56, bandwidthIncreasePct: 55, connectionSurge: 800, mitigationRatio: 0.04 }),
    ],
  }),
  environment({
    id: "hospital",
    name: "Hospital network",
    description: "Fictional clinical workstations, medical systems, and patient-service infrastructure.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 12, legitimateRequestsPerSecond: 32, processingCapacityPerSecond: 52, baseConnections: 1250 },
    devices: [
      host("nurse-station", "Nurse station", "10.20.1.21", "Clinical workstation"),
      host("imaging-workstation", "Imaging workstation", "10.20.1.22", "Imaging department"),
      host("monitor", "Simulated patient monitor", "10.20.2.21", "Fictional medical system"),
      switchDevice("ward-switch", "Ward access switch", "10.20.1.2", "Clinical access"),
      switchDevice("clinical-core", "Clinical core switch", "10.20.1.3", "Hospital distribution"),
      router("hospital-gateway", "Hospital gateway", "10.20.1.1", "Segment gateway"),
      server("hospital-dns", "Hospital DNS", "10.20.1.53", "Name resolution"),
      server("his", "Hospital information system", "10.20.1.80", "Fictional clinical service"),
      server("imaging", "Imaging archive", "10.20.1.81", "Fictional imaging service"),
      host("rogue-device", "Unknown device", "10.20.1.91", "Unverified endpoint"),
      host("hospital-bot", "Simulated traffic source", "10.20.1.92", "Isolated simulation source"),
    ],
    links: [
      link("nurse-ward", "nurse-station", "ward-switch"), link("image-ward", "imaging-workstation", "ward-switch"),
      link("monitor-core", "monitor", "clinical-core"), link("ward-core", "ward-switch", "clinical-core"),
      link("rogue-ward", "rogue-device", "ward-switch"), link("bot-core", "hospital-bot", "clinical-core"),
      link("core-gateway-h", "clinical-core", "hospital-gateway"), link("core-dns-h", "clinical-core", "hospital-dns"),
      link("core-his", "clinical-core", "his"), link("core-image", "clinical-core", "imaging"),
    ],
    scenarios: [
      incident("hospital-ddos", "Hospital portal DDoS", "Denial of service", "The fictional patient-services portal is responding slowly to normal requests.", "Excess distributed demand is consuming application capacity.", "his", ["hospital-bot"], ["nurse-station", "his"], "rate-limit", ["Inspect portal queue depth and request rates.", "Check whether legitimate requests are being denied."], { attackRequestsAtMax: 180, availabilityDropPct: 26, latencyIncreaseMs: 300, packetLossIncreasePct: 26, cpuIncreasePct: 58, bandwidthIncreasePct: 42, connectionSurge: 750, mitigationRatio: 0.04 }),
      incident("hospital-dns", "Clinical DNS failure", "DNS", "Several fictional hospital services cannot be located by name.", "Untrusted resolver responses are interfering with service discovery.", "hospital-dns", ["hospital-bot"], ["nurse-station", "monitor", "his"], "trusted-resolver", ["Inspect DNS health and recent answer status.", "Compare resolver configuration across affected systems."], { attackRequestsAtMax: 18, availabilityDropPct: 48, latencyIncreaseMs: 190, packetLossIncreasePct: 20, devicesAffected: 3, mitigationRatio: 0.08 }),
      incident("hospital-availability", "Clinical network disruption", "Availability", "Fictional clinical endpoints show intermittent loss of service.", "A simulated traffic surge is consuming shared network capacity.", "clinical-core", ["hospital-bot"], ["monitor", "nurse-station", "imaging-workstation"], "segment-network", ["Compare the affected segments with unaffected services.", "Inspect the core uplink and queue counters."], { attackRequestsAtMax: 90, availabilityDropPct: 36, latencyIncreaseMs: 220, packetLossIncreasePct: 28, cpuIncreasePct: 32, devicesAffected: 3, mitigationRatio: 0.12 }),
      incident("hospital-rogue", "Unrecognized hospital device", "Access control", "A new device is present on a clinical access segment without a known owner.", "An unverified endpoint has joined a sensitive network.", "rogue-device", ["rogue-device"], ["monitor", "nurse-station"], "network-access-control", ["Inspect endpoint identity and switch-port history.", "Check whether the device has a managed inventory record."], { attackRequestsAtMax: 8, availabilityDropPct: 20, devicesAffected: 1, mitigationRatio: 0.05 }),
      incident("hospital-segmentation", "Department segmentation failure", "Segmentation", "A clinical system appears reachable from an unrelated department segment.", "A simulated segmentation policy is missing or incorrectly applied.", "clinical-core", ["hospital-bot"], ["monitor", "his"], "segment-network", ["Inspect the path between the two departments.", "Review the core switch policy boundaries."], { attackRequestsAtMax: 12, availabilityDropPct: 32, latencyIncreaseMs: 80, packetLossIncreasePct: 12, devicesAffected: 2, mitigationRatio: 0.08 }),
    ],
  }),
  environment({
    id: "banking",
    name: "Banking network",
    description: "Fictitious customers, test portal, and non-production financial-service components.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 10, legitimateRequestsPerSecond: 36, processingCapacityPerSecond: 60, baseConnections: 1800, baseCpuPct: 34 },
    devices: [
      host("bank-customer", "Test customer client", "10.30.1.21", "Fictional customer"),
      host("bank-employee", "Bank employee", "10.30.2.21", "Staff endpoint"),
      router("bank-edge", "Bank edge router", "10.30.1.1", "Fictional service edge"),
      server("bank-firewall", "Application firewall", "10.30.1.2", "Simulated security control"),
      server("bank-dns", "Bank DNS", "10.30.1.53", "Name resolution"),
      server("bank-portal", "Test banking portal", "10.30.1.80", "Fictional portal"),
      server("bank-ledger", "Test ledger database", "10.30.1.81", "Fictitious account data"),
      host("bank-bot-a", "Simulated source A", "10.30.1.91", "Isolated simulation source"),
      host("bank-bot-b", "Simulated source B", "10.30.1.92", "Isolated simulation source"),
      switchDevice("bank-switch", "Service access switch", "10.30.1.3", "Service network"),
    ],
    links: [
      link("customer-bank", "bank-customer", "bank-edge"), link("employee-bank", "bank-employee", "bank-switch"),
      link("edge-firewall", "bank-edge", "bank-firewall"), link("firewall-switch", "bank-firewall", "bank-switch"),
      link("switch-dns", "bank-switch", "bank-dns"), link("switch-portal", "bank-switch", "bank-portal"),
      link("portal-ledger", "bank-portal", "bank-ledger"), link("bot-a-bank", "bank-bot-a", "bank-edge"),
      link("bot-b-bank", "bank-bot-b", "bank-edge"),
    ],
    scenarios: [
      incident("bank-app", "Banking portal injection attempt", "Application layer", "The fictional portal reports unusual input patterns and inconsistent test responses.", "Untrusted application input is reaching a simulated query boundary.", "bank-portal", ["bank-bot-a"], ["bank-customer", "bank-portal", "bank-ledger"], "waf-validation", ["Inspect the application firewall and validation log.", "Check whether input is handled as data at the query boundary."], { attackRequestsAtMax: 20, availabilityDropPct: 28, latencyIncreaseMs: 130, packetLossIncreasePct: 8, cpuIncreasePct: 24, mitigationRatio: 0.08 }),
      incident("bank-session", "Test session hijacking", "Transport and session", "A fictional test session shows an unexpected identity or session-state change.", "A simulated session token is not being sufficiently protected or rotated.", "bank-portal", ["bank-bot-a"], ["bank-customer", "bank-portal"], "session-hardening", ["Inspect session changes and authentication events.", "Look for reuse of an old or unbound test session."], { attackRequestsAtMax: 14, availabilityDropPct: 26, latencyIncreaseMs: 70, packetLossIncreasePct: 5, connectionSurge: 180, mitigationRatio: 0.1 }),
      incident("bank-ddos", "Online banking DDoS", "Denial of service", "Fictional customers see intermittent failures on the test banking portal.", "Distributed request volume exceeds the portal's processing capacity.", "bank-portal", ["bank-bot-a", "bank-bot-b"], ["bank-customer", "bank-portal"], "rate-limit", ["Compare inbound requests with service capacity.", "Inspect connection and queue pressure at the portal."], { attackRequestsAtMax: 210, attackBandwidthAtMaxMbps: 210, availabilityDropPct: 25, latencyIncreaseMs: 310, packetLossIncreasePct: 24, cpuIncreasePct: 60, bandwidthIncreasePct: 58, connectionSurge: 900, mitigationRatio: 0.03 }),
      incident("bank-dns", "Banking DNS manipulation", "DNS", "The test banking name resolves to an unexpected destination in the exercise.", "An unvalidated DNS answer is influencing the client destination.", "bank-dns", ["bank-bot-a"], ["bank-customer", "bank-portal"], "dnssec", ["Inspect the queried name and response trust.", "Compare the answer with the managed service record."], { attackRequestsAtMax: 12, availabilityDropPct: 44, latencyIncreaseMs: 160, packetLossIncreasePct: 16, mitigationRatio: 0.08 }),
    ],
  }),
  environment({
    id: "ecommerce",
    name: "E-commerce website",
    description: "Fictional shoppers, storefront services, and a non-production order database.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 22, legitimateRequestsPerSecond: 46, processingCapacityPerSecond: 68, baseConnections: 2400 },
    devices: [
      host("shopper-a", "Shopper client A", "10.40.1.21", "Fictional shopper"),
      host("shopper-b", "Shopper client B", "10.40.1.22", "Fictional shopper"),
      router("shop-edge", "Storefront edge", "10.40.1.1", "Customer-facing gateway"),
      server("shop-cdn", "Content edge", "10.40.1.2", "Static storefront content"),
      server("shop-web", "Storefront web tier", "10.40.1.80", "Fictional shopping site"),
      server("shop-app", "Order application", "10.40.1.81", "Simulated application service"),
      server("shop-db", "Test order database", "10.40.1.82", "Fictional orders only"),
      server("shop-dns", "Store DNS", "10.40.1.53", "Name resolution"),
      host("shop-bot-a", "Simulated source A", "10.40.1.91", "Isolated simulation source"),
      host("shop-bot-b", "Simulated source B", "10.40.1.92", "Isolated simulation source"),
      switchDevice("shop-switch", "Storefront service switch", "10.40.1.3", "Application network"),
    ],
    links: [
      link("shopper-edge-a", "shopper-a", "shop-edge"), link("shopper-edge-b", "shopper-b", "shop-edge"),
      link("edge-cdn", "shop-edge", "shop-cdn"), link("edge-switch", "shop-edge", "shop-switch"),
      link("switch-web", "shop-switch", "shop-web"), link("web-app", "shop-web", "shop-app"),
      link("app-db", "shop-app", "shop-db"), link("switch-dns", "shop-switch", "shop-dns"),
      link("bot-a-edge", "shop-bot-a", "shop-edge"), link("bot-b-edge", "shop-bot-b", "shop-edge"),
    ],
    scenarios: [
      incident("shop-ddos", "Storefront DDoS", "Denial of service", "Shopper requests time out as the storefront queue grows.", "Simulated bot traffic is consuming the storefront's request capacity.", "shop-web", ["shop-bot-a", "shop-bot-b"], ["shopper-a", "shopper-b", "shop-web"], "rate-limit", ["Inspect queue size and completed requests.", "Compare simulated bot volume with shopper request volume."], { attackRequestsAtMax: 230, attackBandwidthAtMaxMbps: 240, availabilityDropPct: 24, latencyIncreaseMs: 330, packetLossIncreasePct: 28, cpuIncreasePct: 62, bandwidthIncreasePct: 60, connectionSurge: 1100, mitigationRatio: 0.03 }),
      incident("shop-sql", "Storefront query injection", "Application layer", "The simulated order application reports unexpected query behavior.", "Input is not separated from query structure at a fictional application boundary.", "shop-app", ["shop-bot-a"], ["shop-web", "shop-app", "shop-db"], "waf-validation", ["Inspect application validation and database access logs.", "Check the path from the web tier to the order database."], { attackRequestsAtMax: 22, availabilityDropPct: 28, latencyIncreaseMs: 150, packetLossIncreasePct: 7, cpuIncreasePct: 30, mitigationRatio: 0.05 }),
      incident("shop-dns", "Storefront DNS manipulation", "DNS", "Some fictional shoppers are directed away from the expected storefront.", "The resolver accepts an untrusted record for the storefront name.", "shop-dns", ["shop-bot-a"], ["shopper-a", "shopper-b", "shop-web"], "dnssec", ["Inspect the storefront answer and signature status.", "Compare the client resolver with the trusted resolver."], { attackRequestsAtMax: 12, availabilityDropPct: 42, latencyIncreaseMs: 180, packetLossIncreasePct: 16, mitigationRatio: 0.08 }),
      incident("shop-tcp", "Storefront connection exhaustion", "Transport layer", "New shopper connections are failing while incomplete sessions accumulate.", "Half-open connection state is consuming the fictional service's connection budget.", "shop-web", ["shop-bot-a", "shop-bot-b"], ["shopper-a", "shopper-b", "shop-web"], "syn-cookies", ["Inspect established versus pending connection counts.", "Check how many requests complete the handshake."], { attackRequestsAtMax: 170, availabilityDropPct: 30, latencyIncreaseMs: 260, packetLossIncreasePct: 24, cpuIncreasePct: 48, connectionSurge: 1400, mitigationRatio: 0.04 }),
    ],
  }),
  environment({
    id: "smart-city",
    name: "Smart city / IoT",
    description: "Illustrative sensors, CCTV endpoints, and fictional city operations services.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 28, legitimateRequestsPerSecond: 22, processingCapacityPerSecond: 38, baseConnections: 620, networkCapacityMbps: 500 },
    devices: [
      host("sensor-a", "Traffic sensor A", "10.50.1.21", "Roadside sensor"),
      host("sensor-b", "Traffic sensor B", "10.50.1.22", "Roadside sensor"),
      host("cctv", "Fictional CCTV endpoint", "10.50.2.21", "Simulated camera"),
      server("city-ap", "Street access point", "10.50.1.30", "Managed wireless access"),
      switchDevice("city-switch", "Field switch", "10.50.1.2", "IoT access"),
      router("city-gateway", "City gateway", "10.50.1.1", "IoT network gateway"),
      server("city-dns", "City DNS", "10.50.1.53", "Name resolution"),
      server("iot-platform", "IoT operations platform", "10.50.1.80", "Fictional sensor service"),
      server("cctv-platform", "CCTV service", "10.50.1.81", "Fictional video service"),
      host("rogue-iot", "Unregistered IoT device", "10.50.1.91", "Unverified endpoint"),
      host("city-monitor", "Passive monitor", "10.50.1.92", "Simulated sensor observer"),
    ],
    links: [
      link("sensor-a-switch", "sensor-a", "city-switch"), link("sensor-b-switch", "sensor-b", "city-switch"),
      link("cctv-switch", "cctv", "city-switch"), link("ap-switch", "city-ap", "city-switch"),
      link("rogue-switch", "rogue-iot", "city-switch"), link("monitor-switch", "city-monitor", "city-switch"),
      link("switch-gateway", "city-switch", "city-gateway"), link("gateway-dns", "city-gateway", "city-dns"),
      link("gateway-iot", "city-gateway", "iot-platform"), link("gateway-cctv", "city-gateway", "cctv-platform"),
    ],
    scenarios: [
      incident("city-rogue-device", "Rogue IoT device", "Access control", "An unknown endpoint is communicating on the simulated sensor network.", "An unregistered device has joined the field network.", "rogue-iot", ["rogue-iot"], ["sensor-a", "sensor-b"], "network-access-control", ["Inspect the device inventory and switch port.", "Check whether the endpoint has a managed identity."], { attackRequestsAtMax: 10, availabilityDropPct: 18, devicesAffected: 1, mitigationRatio: 0.05 }),
      incident("city-sniffing", "Wireless packet observation", "Wireless", "Sensor telemetry may be observable on an inadequately protected wireless segment.", "The simulated flow lacks an authenticated encryption boundary.", "city-ap", ["city-monitor"], ["sensor-a", "sensor-b"], "tls-encryption", ["Inspect which segments carry unencrypted telemetry.", "Compare the AP security posture with the service requirement."], { attackRequestsAtMax: 6, availabilityDropPct: 10, latencyIncreaseMs: 35, packetLossIncreasePct: 2, mitigationRatio: 0.05 }),
      incident("city-tunnel", "Unusual DNS tunnel pattern", "DNS", "DNS query volume and name patterns differ from normal sensor behavior.", "DNS is being used as an unapproved hidden channel in the simulation.", "city-dns", ["rogue-iot"], ["sensor-a", "iot-platform"], "dns-inspection", ["Inspect query volume and the requesting endpoint.", "Look for repeated long or anomalous DNS names."], { attackRequestsAtMax: 34, availabilityDropPct: 16, latencyIncreaseMs: 105, packetLossIncreasePct: 5, bandwidthIncreasePct: 22, mitigationRatio: 0.08 }),
      incident("city-outage", "Sensor network disruption", "Availability", "Fictional traffic sensors and CCTV services are reporting delayed updates.", "A simulated burst is saturating a shared field network link.", "city-switch", ["rogue-iot"], ["sensor-a", "sensor-b", "cctv"], "segment-network", ["Compare traffic at the field switch and gateway.", "Inspect whether video and sensor queues share a constrained link."], { attackRequestsAtMax: 105, availabilityDropPct: 35, latencyIncreaseMs: 240, packetLossIncreasePct: 25, cpuIncreasePct: 35, devicesAffected: 3, mitigationRatio: 0.1 }),
      incident("city-route", "Route or VLAN misconfiguration", "Routing and switching", "A subset of sensors has lost reachability to its expected operations service.", "A simulated route or VLAN boundary is directing traffic to the wrong segment.", "city-gateway", ["rogue-iot"], ["sensor-a", "iot-platform"], "route-filtering", ["Inspect the expected sensor prefix and next hop.", "Check the path through the field VLAN boundary."], { attackRequestsAtMax: 12, availabilityDropPct: 40, latencyIncreaseMs: 140, packetLossIncreasePct: 15, devicesAffected: 2, mitigationRatio: 0.08 }),
    ],
  }),
  environment({
    id: "enterprise",
    name: "Enterprise office",
    description: "Employee endpoints, office segments, shared services, and simulated access controls.",
    telemetry: { ...defaultTelemetry, baseLatencyMs: 14, legitimateRequestsPerSecond: 30, processingCapacityPerSecond: 50, baseConnections: 980 },
    devices: [
      host("employee-a", "Employee workstation A", "10.60.1.21", "Office endpoint"),
      host("employee-b", "Employee workstation B", "10.60.1.22", "Office endpoint"),
      host("guest", "Guest endpoint", "10.60.2.21", "Guest network"),
      host("office-attacker", "Simulated untrusted host", "10.60.1.91", "Isolated simulation source"),
      switchDevice("office-access", "Access switch", "10.60.1.2", "User access"),
      switchDevice("office-core", "Office core switch", "10.60.1.3", "VLAN distribution"),
      router("office-router", "Office router", "10.60.1.1", "Inter-subnet gateway"),
      server("office-dhcp", "Office DHCP", "10.60.1.50", "Address assignment"),
      server("office-file", "File service", "10.60.1.80", "Fictional enterprise service"),
      server("office-nac", "Access control", "10.60.1.81", "Simulated NAC policy"),
      server("office-dns", "Office DNS", "10.60.1.53", "Name resolution"),
    ],
    links: [
      link("employee-a-access", "employee-a", "office-access"), link("employee-b-access", "employee-b", "office-access"),
      link("guest-access", "guest", "office-access"), link("attacker-access", "office-attacker", "office-access"),
      link("access-core", "office-access", "office-core"), link("core-router", "office-core", "office-router"),
      link("core-dhcp", "office-core", "office-dhcp"), link("core-file", "office-core", "office-file"),
      link("core-nac", "office-core", "office-nac"), link("core-dns", "office-core", "office-dns"),
    ],
    scenarios: [
      incident("office-arp", "Office ARP poisoning", "Network layer", "Employees report that traffic on a shared office segment is taking an unexpected path.", "A false ARP mapping is redirecting local traffic through an untrusted host.", "office-access", ["office-attacker"], ["employee-a", "employee-b"], "arp-inspection", ["Inspect gateway IP-to-MAC consistency.", "Review switch port identity for the unexpected MAC."], { attackRequestsAtMax: 18, availabilityDropPct: 36, latencyIncreaseMs: 100, packetLossIncreasePct: 16, mitigationRatio: 0.08 }),
      incident("office-mac-flood", "Switch MAC table pressure", "Network layer", "The office switch shows abnormal address learning and broadcast-like behavior.", "A simulated address-learning burst is stressing the access switch table.", "office-access", ["office-attacker"], ["employee-a", "employee-b"], "port-security", ["Inspect learned address counts by access port.", "Check for an endpoint learning many identities."], { attackRequestsAtMax: 105, availabilityDropPct: 28, latencyIncreaseMs: 170, packetLossIncreasePct: 20, bandwidthIncreasePct: 24, devicesAffected: 2, mitigationRatio: 0.06 }),
      incident("office-vlan", "VLAN boundary crossing", "Routing and switching", "A guest endpoint appears to reach a service intended for office users.", "A simulated trunk or access-port policy exposes the wrong VLAN.", "office-access", ["guest"], ["guest", "office-file"], "vlan-hardening", ["Inspect the guest access port and allowed VLANs.", "Compare the intended segmentation policy with the observed path."], { attackRequestsAtMax: 16, availabilityDropPct: 30, latencyIncreaseMs: 60, packetLossIncreasePct: 8, devicesAffected: 1, mitigationRatio: 0.08 }),
      incident("office-dhcp", "Office DHCP starvation", "Network access", "New employees cannot obtain an address and DHCP request volume is elevated.", "Untrusted simulated requests are exhausting available leases.", "office-dhcp", ["office-attacker"], ["employee-a", "employee-b"], "dhcp-snooping", ["Check address-pool utilization.", "Compare DHCP traffic by trusted switch port."], { attackRequestsAtMax: 115, availabilityDropPct: 30, latencyIncreaseMs: 95, packetLossIncreasePct: 15, devicesAffected: 2, mitigationRatio: 0.04 }),
      incident("office-route", "Office route manipulation", "Routing and switching", "A service prefix is resolving through an unexpected office next hop.", "An untrusted route update has altered the simulated forwarding path.", "office-router", ["office-attacker"], ["employee-a", "office-file"], "route-filtering", ["Inspect route origin and prefix length.", "Compare the selected route with the approved route table."], { attackRequestsAtMax: 10, availabilityDropPct: 38, latencyIncreaseMs: 135, packetLossIncreasePct: 15, devicesAffected: 2, mitigationRatio: 0.06 }),
      incident("office-tcp", "TCP session disruption", "Transport layer", "Office users report interrupted fictional service sessions.", "A simulated forged session packet is disrupting established connections.", "office-file", ["office-attacker"], ["employee-a", "office-file"], "session-hardening", ["Inspect session reset and re-authentication events.", "Check whether the session was bound to an authenticated channel."], { attackRequestsAtMax: 22, availabilityDropPct: 28, latencyIncreaseMs: 80, packetLossIncreasePct: 14, connectionSurge: 120, mitigationRatio: 0.08 }),
    ],
  }),
];

export function getIncidentEnvironment(environmentId: string): IncidentEnvironment | undefined {
  return incidentEnvironments.find((item) => item.id === environmentId);
}

export function getIncidentScenario(environment: IncidentEnvironment, scenarioId: string): IncidentScenario | undefined {
  return environment.scenarios.find((item) => item.id === scenarioId);
}

export function getIncidentAlerts(state: IncidentState): IncidentAlert[] {
  const alerts: IncidentAlert[] = [];
  if (state.phase === "attack" || state.phase === "impact") {
    alerts.push({
      id: "incident-active",
      severity: state.phase === "impact" ? "critical" : "warning",
      message: "Incident indicators are active.",
    });
  }
  if (state.metrics.queueSize / state.metrics.queueCapacity >= 0.75) {
    alerts.push({ id: "queue-pressure", severity: "critical", message: "Request queue is above 75% of capacity." });
  }
  if (state.metrics.availabilityPct < 90) {
    alerts.push({ id: "availability", severity: "critical", message: `Service availability is ${state.metrics.availabilityPct}%.` });
  }
  if (state.metrics.serverCpuPct >= 85) {
    alerts.push({ id: "cpu", severity: "warning", message: `Server CPU is at ${state.metrics.serverCpuPct}%.` });
  }
  if (state.phase === "resolved") {
    alerts.push({ id: "recovered", severity: "success", message: "Recovery checks passed; the simulated incident is resolved." });
  }
  return alerts;
}

function phaseSeverity(state: IncidentState): number {
  if (state.phase === "attack") return 0.6;
  if (state.phase === "impact") return 1;
  if (state.phase === "recovery") return Math.max(0.08, 1 - state.recoveryStep / 5);
  return 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, round(value)));
}

function deriveMetrics(state: IncidentState, environment: IncidentEnvironment, scenario: IncidentScenario): IncidentMetrics {
  const severity = phaseSeverity(state);
  const rawAttackRate = severity === 0 ? 0 : Math.round(scenario.effects.attackRequestsAtMax * state.intensity / 100 * severity);
  const effectiveRatio = state.correctDefenseActivated ? scenario.effects.mitigationRatio : 1;
  const effectiveAttackRate = Math.round(rawAttackRate * effectiveRatio);
  const metrics = environment.telemetry;
  const queueSize = state.pendingAttackRequests + state.pendingLegitimateRequests;
  const queueRatio = queueSize / metrics.queueCapacity;
  const denialPct = metrics.legitimateRequestsPerSecond
    ? state.metrics.legitimateRequestsDeniedPerSecond / metrics.legitimateRequestsPerSecond * 100
    : 0;
  const availabilityPct = clampPercent(100 - scenario.effects.availabilityDropPct * severity - denialPct);
  const requests = metrics.legitimateRequestsPerSecond + effectiveAttackRate;
  const lossFromDrops = requests ? state.metrics.requestsDroppedPerSecond / requests * 100 : 0;
  const packetLossPct = clampPercent(scenario.effects.packetLossIncreasePct * severity + lossFromDrops);
  const simulatedLoad = simulateAttackLoad(effectiveAttackRate, severity > 0, false);
  const isResourceAttack = scenario.category === "Denial of service" || scenario.category === "Transport layer";
  const queueCpu = queueRatio * 22;
  const serverCpuPct = clampPercent(Math.max(
    metrics.baseCpuPct + scenario.effects.cpuIncreasePct * severity + queueCpu,
    isResourceAttack ? simulatedLoad.utilizationPercent : 0,
  ));
  const bandwidthUtilizationPct = clampPercent(metrics.baseBandwidthPct
    + scenario.effects.bandwidthIncreasePct * severity
    + effectiveAttackRate / metrics.processingCapacityPerSecond * 12);
  const latencyMs = Math.max(1, round(metrics.baseLatencyMs
    + scenario.effects.latencyIncreaseMs * severity
    + queueRatio * scenario.effects.latencyIncreaseMs * 0.5));
  const activeDevices = Math.max(0, environment.topology.devices.length - Math.floor(scenario.effects.devicesAffected * severity));
  const activeConnections = Math.max(0, metrics.baseConnections
    + Math.round(scenario.effects.connectionSurge * state.intensity / 100 * severity)
    + state.pendingAttackRequests);
  const requestsProcessedPerSecond = state.phase === "normal"
    ? Math.min(metrics.legitimateRequestsPerSecond, metrics.processingCapacityPerSecond)
    : state.metrics.requestsProcessedPerSecond;
  const trafficVolumeMbps = round(metrics.baseBandwidthPct / 100 * metrics.networkCapacityMbps
    + scenario.effects.attackBandwidthAtMaxMbps * state.intensity / 100 * severity);
  const healthScore = clampPercent(availabilityPct * 0.55 + (100 - packetLossPct) * 0.25 + (100 - serverCpuPct) * 0.2);
  return {
    availabilityPct,
    latencyMs,
    packetLossPct,
    bandwidthUtilizationPct,
    activeDevices,
    activeConnections,
    serverCpuPct,
    requestsProcessedPerSecond,
    trafficVolumeMbps,
    attackTrafficPerSecond: rawAttackRate,
    effectiveAttackTrafficPerSecond: effectiveAttackRate,
    legitimateTrafficPerSecond: metrics.legitimateRequestsPerSecond,
    queueSize,
    queueCapacity: metrics.queueCapacity,
    requestsDroppedPerSecond: state.metrics.requestsDroppedPerSecond,
    legitimateRequestsDeniedPerSecond: state.metrics.legitimateRequestsDeniedPerSecond,
    filteredAttackTrafficPerSecond: rawAttackRate - effectiveAttackRate,
    healthScore,
  };
}

function event(
  state: IncidentState,
  level: IncidentLogEntry["level"],
  message: string,
): IncidentState {
  return { ...state, logs: [...state.logs, { second: state.simulatedSeconds, level, message }].slice(-80) };
}

function refreshMetrics(state: IncidentState, environment: IncidentEnvironment, scenario: IncidentScenario): IncidentState {
  const nextMetrics = deriveMetrics(state, environment, scenario);
  const peakMetrics = state.phase === "impact"
    && (!state.peakMetrics || nextMetrics.healthScore < state.peakMetrics.healthScore)
    ? nextMetrics
    : state.peakMetrics;
  return {
    ...state,
    metrics: nextMetrics,
    peakMetrics,
    afterMetrics: state.phase === "resolved" ? nextMetrics : state.afterMetrics,
  };
}

function processOneSecond(state: IncidentState, environment: IncidentEnvironment, scenario: IncidentScenario): IncidentState {
  const severity = phaseSeverity(state);
  const rawAttackArrivals = severity === 0 ? 0
    : Math.round(scenario.effects.attackRequestsAtMax * state.intensity / 100 * severity);
  const effectiveAttackArrivals = state.correctDefenseActivated
    ? Math.round(rawAttackArrivals * scenario.effects.mitigationRatio)
    : rawAttackArrivals;
  const telemetry = environment.telemetry;
  const freeQueue = Math.max(0, telemetry.queueCapacity - state.pendingAttackRequests - state.pendingLegitimateRequests);
  const acceptedAttack = Math.min(effectiveAttackArrivals, freeQueue);
  const acceptedLegitimate = Math.min(
    telemetry.legitimateRequestsPerSecond,
    Math.max(0, freeQueue - acceptedAttack),
  );
  const pendingAttack = state.pendingAttackRequests + acceptedAttack;
  const pendingLegitimate = state.pendingLegitimateRequests + acceptedLegitimate;
  const processedAttack = Math.min(pendingAttack, telemetry.processingCapacityPerSecond);
  const processedLegitimate = Math.min(
    pendingLegitimate,
    Math.max(0, telemetry.processingCapacityPerSecond - processedAttack),
  );
  const next = {
    ...state,
    simulatedSeconds: state.simulatedSeconds + 1,
    pendingAttackRequests: pendingAttack - processedAttack,
    pendingLegitimateRequests: pendingLegitimate - processedLegitimate,
    metrics: {
      ...state.metrics,
      requestsProcessedPerSecond: processedAttack + processedLegitimate,
      requestsDroppedPerSecond: effectiveAttackArrivals - acceptedAttack
        + telemetry.legitimateRequestsPerSecond - acceptedLegitimate,
      legitimateRequestsDeniedPerSecond: telemetry.legitimateRequestsPerSecond - acceptedLegitimate,
    },
  };
  return refreshMetrics(next, environment, scenario);
}

export function createIncidentState(environment: IncidentEnvironment, scenario: IncidentScenario): IncidentState {
  const emptyMetrics: IncidentMetrics = {
    availabilityPct: 100,
    latencyMs: environment.telemetry.baseLatencyMs,
    packetLossPct: 0,
    bandwidthUtilizationPct: environment.telemetry.baseBandwidthPct,
    activeDevices: environment.topology.devices.length,
    activeConnections: environment.telemetry.baseConnections,
    serverCpuPct: environment.telemetry.baseCpuPct,
    requestsProcessedPerSecond: environment.telemetry.legitimateRequestsPerSecond,
    trafficVolumeMbps: environment.telemetry.baseBandwidthPct / 100 * environment.telemetry.networkCapacityMbps,
    attackTrafficPerSecond: 0,
    effectiveAttackTrafficPerSecond: 0,
    legitimateTrafficPerSecond: environment.telemetry.legitimateRequestsPerSecond,
    queueSize: 0,
    queueCapacity: environment.telemetry.queueCapacity,
    requestsDroppedPerSecond: 0,
    legitimateRequestsDeniedPerSecond: 0,
    filteredAttackTrafficPerSecond: 0,
    healthScore: 100,
  };
  const initial: IncidentState = {
    scenarioId: scenario.id,
    phase: "normal",
    intensity: 70,
    simulatedSeconds: 0,
    recoveryStep: 0,
    correctDefenseActivated: false,
    pendingAttackRequests: 0,
    pendingLegitimateRequests: 0,
    inspectedDeviceIds: [],
    hintsUsed: 0,
    wrongDefenseAttempts: 0,
    actions: [],
    logs: [{ second: 0, level: "info", message: `Baseline established for ${environment.name}.` }],
    metrics: emptyMetrics,
    beforeMetrics: emptyMetrics,
  };
  return refreshMetrics(initial, environment, scenario);
}

export function startIncident(state: IncidentState, environment: IncidentEnvironment, scenario: IncidentScenario): IncidentState {
  if (state.phase !== "normal" && state.phase !== "resolved") return state;
  const started = {
    ...createIncidentState(environment, scenario),
    intensity: state.intensity,
    phase: "attack" as const,
    logs: [...state.logs, { second: state.simulatedSeconds, level: "warning" as const, message: "Incident started; monitor traffic and service behavior." }],
  };
  return processOneSecond(started, environment, scenario);
}

export function setIncidentIntensity(
  state: IncidentState,
  environment: IncidentEnvironment,
  scenario: IncidentScenario,
  intensity: number,
): IncidentState {
  const next = { ...state, intensity: Math.max(0, Math.min(100, Math.round(intensity))) };
  return refreshMetrics(next, environment, scenario);
}

export function advanceIncident(
  state: IncidentState,
  environment: IncidentEnvironment,
  scenario: IncidentScenario,
): IncidentState {
  if (state.phase === "normal" || state.phase === "resolved") return state;
  let next = state;
  if (state.phase === "attack") {
    next = { ...state, phase: "impact", logs: [...state.logs, { second: state.simulatedSeconds, level: "critical", message: "Impact threshold reached; service telemetry is degrading." }] };
  } else if (state.phase === "recovery") {
    next = { ...state, recoveryStep: state.recoveryStep + 1 };
  }
  next = processOneSecond(next, environment, scenario);
  if (next.phase === "recovery" && next.recoveryStep >= 4 && next.pendingAttackRequests + next.pendingLegitimateRequests === 0) {
    next = { ...next, phase: "resolved", afterMetrics: next.metrics };
    next = event(next, "success", "Service queues drained; recovery criteria are met.");
    next = refreshMetrics(next, environment, scenario);
  }
  return next;
}

export function activateIncidentDefense(
  state: IncidentState,
  environment: IncidentEnvironment,
  scenario: IncidentScenario,
  defenseId: string,
): IncidentState {
  if (state.phase === "normal" || state.phase === "resolved") return state;
  const selectedDefense = scenario.defenses.find((item) => item.id === defenseId);
  if (!selectedDefense) return state;
  if (defenseId !== scenario.defenseId) {
    const attempted = {
      ...state,
      wrongDefenseAttempts: state.wrongDefenseAttempts + 1,
      defenseId,
      actions: [...state.actions, selectedDefense.label],
    };
    return event(attempted, "warning", `${selectedDefense.label} enabled. Continue monitoring for recovery.`);
  }
  const activated = {
    ...state,
    phase: "recovery" as const,
    recoveryStep: 0,
    defenseId,
    correctDefenseActivated: true,
    actions: [...state.actions, selectedDefense.label],
  };
  return refreshMetrics(event(activated, "success", `${selectedDefense.label} enabled; traffic is being contained.`), environment, scenario);
}

export function inspectIncidentDevice(
  state: IncidentState,
  deviceId: string,
  environment: IncidentEnvironment,
): IncidentState {
  if (!environment.topology.devices.some((device) => device.id === deviceId)) return state;
  if (state.inspectedDeviceIds.includes(deviceId)) return state;
  const device = environment.topology.devices.find((item) => item.id === deviceId)!;
  const inspected = {
    ...state,
    inspectedDeviceIds: [...state.inspectedDeviceIds, deviceId],
    actions: [...state.actions, `Inspected ${device.name}`],
  };
  return event(inspected, "info", `Device inspected: ${device.name} (${environment.nodeInfo[deviceId]?.role ?? device.type}).`);
}

export function revealIncidentHint(state: IncidentState, scenario: IncidentScenario): { state: IncidentState; hint?: string } {
  const hint = scenario.hints[state.hintsUsed];
  if (!hint) return { state };
  const next = event({ ...state, hintsUsed: state.hintsUsed + 1 }, "info", `Hint ${state.hintsUsed + 1} requested.`);
  return { state: next, hint };
}

export function createIncidentReport(
  state: IncidentState,
  environment: IncidentEnvironment,
  scenario: IncidentScenario,
): IncidentReport | undefined {
  if (state.phase !== "resolved" || !state.afterMetrics) return undefined;
  const score = Math.max(0, Math.min(100,
    70 + (state.correctDefenseActivated ? 20 : 0)
    + (state.inspectedDeviceIds.length ? 10 : 0)
    - state.hintsUsed * 8
    - state.wrongDefenseAttempts * 15,
  ));
  return {
    environment: environment.name,
    scenario: scenario.name,
    description: scenario.brief,
    rootCause: scenario.rootCause,
    mechanism: scenario.mechanism,
    userImpact: scenario.userImpact,
    actionsTaken: state.actions,
    defenseCorrect: state.correctDefenseActivated,
    recoveryTimeSeconds: state.recoveryStep,
    finalHealth: state.afterMetrics.healthScore,
    score,
    recommendations: scenario.recommendations,
    before: state.beforeMetrics,
    during: state.peakMetrics ?? state.metrics,
    after: state.afterMetrics,
  };
}

