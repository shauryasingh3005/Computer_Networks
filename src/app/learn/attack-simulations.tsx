"use client";

import { Activity, ArrowRight, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";
import { simulateAttackLoad } from "@/simulation/attack-demo";

const applicationScenarios: AttackWalkthroughScenario[] = [
  { id: "sql-injection", name: "SQL injection", normal: "User input is treated as data, not executable query logic.", exposed: "A crafted input alters the query logic to send privileged data back to the attacker.", defended: "Parameterized queries and validation reject the malicious input before it reaches the database.", defense: "Parameterized queries and strict input validation", indicator: "Input handling: safe → malicious", normalPath: ["USER", "INPUT VALIDATION", "DATABASE QUERY"], exposedPath: ["USER", "MALICIOUS INPUT", "UNSAFE QUERY"], defendedPath: ["USER", "SAFE PARAMETER", "VALIDATED QUERY"] },
  { id: "xss", name: "Cross-site scripting", normal: "Page content is rendered without executing untrusted script.", exposed: "Script in user input runs in a victim's browser context.", defended: "Output encoding and a Content Security Policy prevent the script from running.", defense: "Output encoding, sanitization, and CSP", indicator: "Rendered content: safe → active script", normalPath: ["USER", "SAFE RENDER", "BROWSER"], exposedPath: ["USER", "UNTRUSTED SCRIPT", "BROWSER EXECUTION"], defendedPath: ["USER", "SANITIZED OUTPUT", "SAFE RENDER"] },
  { id: "csrf", name: "CSRF", normal: "A trusted browser action matches an authenticated user request.", exposed: "A hidden browser action triggers an unintended authenticated request.", defended: "CSRF tokens and SameSite cookies distinguish legitimate user intent from cross-site actions.", defense: "CSRF tokens and SameSite cookies", indicator: "Request intent: expected → forged", normalPath: ["USER", "AUTHENTICATED ACTION", "SERVICE"], exposedPath: ["USER", "FORGED ACTION", "SERVICE"], defendedPath: ["USER", "TOKEN CHECK", "SERVICE"] },
  { id: "ssrf", name: "SSRF", normal: "The server requests only approved internal or external destinations.", exposed: "A crafted URL makes the server fetch an unintended target.", defended: "Allowlists and network egress controls block the unapproved destination.", defense: "Destination allowlists and egress filtering", indicator: "Request target: approved → untrusted", normalPath: ["USER", "VALIDATED URL", "APPROVED TARGET"], exposedPath: ["USER", "CRAFTED URL", "UNTRUSTED TARGET"], defendedPath: ["USER", "ALLOWLIST CHECK", "BLOCKED TARGET"] },
  { id: "smuggling", name: "HTTP request smuggling", normal: "HTTP front-end and back-end components agree on request boundaries.", exposed: "Ambiguous request framing allows one request to be split across components.", defended: "Consistent parsing and patched proxies reject ambiguous boundaries.", defense: "Consistent parsing and patched HTTP components", indicator: "Request boundary: consistent → ambiguous", normalPath: ["CLIENT", "HTTP PARSER", "APP"], exposedPath: ["CLIENT", "AMBIGUOUS FRAMING", "PROXY/APP"], defendedPath: ["CLIENT", "VALIDATED REQUEST", "APP"] },
  { id: "traversal", name: "Directory traversal", normal: "The server resolves user input only inside the intended folder.", exposed: "A crafted path escapes the application directory and targets another file.", defended: "Path normalization and access controls reject the untrusted path.", defense: "Normalized paths and access control", indicator: "Path scope: restricted → escaped", normalPath: ["USER", "APP ROOT", "INTENDED FILE"], exposedPath: ["USER", "ESCAPED PATH", "OUTSIDE FILE"], defendedPath: ["USER", "SAFE PATH", "INTENDED FILE"] },
  { id: "session-hijack", name: "Session hijacking", normal: "Session tokens remain confidential and tied to the correct user.", exposed: "A stolen session token lets an attacker take over the authenticated session.", defended: "Secure cookies, HTTPS, and session rotation reduce the exposure of tokens.", defense: "Secure cookies, HTTPS, and session rotation", indicator: "Token integrity: trusted → stolen", normalPath: ["USER", "SESSION TOKEN", "AUTHENTICATED APP"], exposedPath: ["USER", "STOLEN TOKEN", "ATTACKER SESSION"], defendedPath: ["USER", "SECURE COOKIES", "AUTHENTICATED APP"] },
  { id: "bruteforce", name: "Brute force", normal: "The service rate-limits repeated login attempts.", exposed: "A high-volume sequence of guesses attempts to discover a password.", defended: "Account lockouts and MFA stop repeated guess attempts from succeeding.", defense: "MFA, lockouts, and rate limiting", indicator: "Login attempts: controlled → repeated", normalPath: ["USER", "RATE-LIMITED LOGIN", "SERVICE"], exposedPath: ["USER", "REPEATED GUESSES", "SERVICE"], defendedPath: ["USER", "MFA/LOCKOUT", "SERVICE"] },
  { id: "credential-stuffing", name: "Credential stuffing", normal: "Known-good credentials are not replayed across unrelated services.", exposed: "Leaked credentials are automated against many accounts at once.", defended: "MFA, breached-password checks, and rate limiting reduce the success of automated attempts.", defense: "MFA, breached-password checks, and rate limiting", indicator: "Account access: protected → exposed", normalPath: ["ATTACKER", "LEAKED CREDS", "UNRELATED ACCOUNT"], exposedPath: ["ATTACKER", "AUTOMATED BATCH", "MANY ACCOUNTS"], defendedPath: ["ATTACKER", "MFA CHECK", "PROTECTED ACCOUNT"] },
  { id: "clickjacking", name: "Clickjacking", normal: "Users interact with the real interface they can see and trust.", exposed: "An attacker overlays a hidden interface to trick a user into clicking the wrong action.", defended: "Frame protections and a trusted UI policy stop the hidden overlay from loading.", defense: "CSP frame-ancestors and X-Frame-Options", indicator: "UI trust: visible → hidden overlay", normalPath: ["USER", "TRUSTED UI", "ACTION"], exposedPath: ["USER", "OVERLAY UI", "UNINTENDED ACTION"], defendedPath: ["USER", "FRAME POLICY", "TRUSTED UI"] },
];

const transportScenarios: AttackWalkthroughScenario[] = [
  { id: "syn-flood", name: "SYN flood", normal: "The server completes a standard TCP three-way handshake before allowing data flow.", exposed: "Many half-open connections fill the server's pending connection queue.", defended: "SYN cookies and connection management keep the queue from filling under attack.", defense: "SYN cookies, connection limits, and rate limiting", indicator: "Connection queue: normal → saturated", normalPath: ["CLIENT", "SYN", "SERVER READY"], exposedPath: ["CLIENT", "MANY SYN", "PENDING QUEUE"], defendedPath: ["CLIENT", "COOKIE-BASED SYN", "SERVER READY"] },
  { id: "tcp-reset", name: "TCP reset attack", normal: "The connection follows the negotiated sequence and remains active.", exposed: "A forged reset packet ends the active communication unexpectedly.", defended: "Secure connections and filtering reduce the opportunity for forged reset injection.", defense: "Protected transport and filtering", indicator: "Session state: active → terminated", normalPath: ["A", "ESTABLISHED TCP", "B"], exposedPath: ["A", "FORGED RST", "B"], defendedPath: ["A", "FILTERED RST", "B"] },
  { id: "seq-prediction", name: "Sequence prediction", normal: "The sender chooses unpredictable TCP sequence numbers.", exposed: "An attacker predicts the next sequence and injects or alters packets.", defended: "Modern TCP uses random initial sequence numbers, making prediction far harder.", defense: "Randomized sequence numbers and TLS", indicator: "Sequence predictability: random → guessable", normalPath: ["A", "UNPREDICTABLE SEQ", "B"], exposedPath: ["A", "GUESSED SEQ", "ATTACKER"], defendedPath: ["A", "RANDOM SEQ", "B"] },
  { id: "udp-flood", name: "UDP flood", normal: "The service receives a manageable amount of UDP traffic.", exposed: "A large UDP burst consumes the service's ability to respond.", defended: "Filtering and rate limits keep the traffic within service limits.", defense: "Firewall filtering and rate limiting", indicator: "UDP load: expected → overwhelming", normalPath: ["CLIENT", "CONTROLLED UDP", "SERVICE"], exposedPath: ["CLIENT", "AMP FLOOD", "SERVICE"], defendedPath: ["CLIENT", "FILTERED UDP", "SERVICE"] },
  { id: "replay", name: "Replay attack", normal: "Each transmitted message has a fresh, expected sequence or nonce.", exposed: "A captured message is re-sent later to trigger the same action again.", defended: "Nonces and sequence validation reject stale retransmissions.", defense: "Timestamps, nonces, and replay detection", indicator: "Message freshness: current → replayed", normalPath: ["A", "FRESH MESSAGE", "B"], exposedPath: ["A", "REPLAYED MESSAGE", "B"], defendedPath: ["A", "NONCE CHECK", "B"] },
  { id: "port-scan", name: "Port scanning", normal: "Only expected services are reachable and observable to clients.", exposed: "A scanner identifies open ports and service versions.", defended: "Firewall and service hardening keep a minimal, monitored surface exposed.", defense: "Firewalls and service hardening", indicator: "Visible services: minimal → discoverable", normalPath: ["SCANNER", "APPROVED PATH", "HOST"], exposedPath: ["SCANNER", "PORT PROBE", "HOST"], defendedPath: ["SCANNER", "FILTERED ACCESS", "HOST"] },
];

const routingScenarios: AttackWalkthroughScenario[] = [
  { id: "bgp-hijack", name: "BGP hijacking", normal: "Traffic follows the legitimate path toward the expected destination network.", exposed: "A rogue advertisement claims ownership of a prefix and diverts traffic.", defended: "Route validation and filtering reject unauthorized origin announcements.", defense: "RPKI and route filtering", indicator: "Path trust: valid → hijacked", normalPath: ["SOURCE", "LEGITIMATE ROUTER", "DESTINATION"], exposedPath: ["SOURCE", "UNTRUSTED ANNOUNCEMENT", "ATTACKER PATH"], defendedPath: ["SOURCE", "VALIDATED ROUTE", "DESTINATION"] },
  { id: "route-leak", name: "Route leak", normal: "A network only exports routes according to policy.", exposed: "An unapproved route is propagated further than intended, changing reachability.", defended: "Strict route policy and monitoring reduce unauthorized propagation.", defense: "Routing policies and monitoring", indicator: "Route policy: compliant → leaked", normalPath: ["NET A", "POLICY FILTER", "NET B"], exposedPath: ["NET A", "UNAUTHORIZED EXPORT", "NET C"], defendedPath: ["NET A", "FILTERED EXPORT", "NET B"] },
  { id: "vlan-hopping", name: "VLAN hopping", normal: "Traffic stays inside the intended VLAN and access boundaries.", exposed: "A host leverages switch misconfiguration to reach another VLAN.", defended: "Explicit native VLAN settings, trunk restrictions, and switch hardening limit the path.", defense: "Trunk restrictions and switch hardening", indicator: "Network boundary: contained → crossed", normalPath: ["HOST", "SWITCH PORT", "INTENDED VLAN"], exposedPath: ["HOST", "HOPPED VLAN", "OTHER VLAN"], defendedPath: ["HOST", "TRUNK CONTROL", "INTENDED VLAN"] },
  { id: "stp-manipulation", name: "STP manipulation", normal: "The switch network keeps the intended root and forwarding topology.", exposed: "A malicious BPDU changes the topology to steer or disrupt traffic.", defended: "BPDU Guard and Root Guard block these unauthorized topology changes.", defense: "BPDU Guard and Root Guard", indicator: "Topology: stable → manipulated", normalPath: ["SWITCH A", "ROOT BRIDGE", "SWITCH B"], exposedPath: ["SWITCH A", "FALSE BPDU", "ATTACKER TOPOLOGY"], defendedPath: ["SWITCH A", "PROTECTED BRIDGE", "SWITCH B"] },
  { id: "dhcp-starvation", name: "DHCP starvation", normal: "The DHCP server assigns addresses in a healthy pool.", exposed: "An attacker exhausts the address pool with fabricated requests.", defended: "DHCP snooping and port security reserve a trusted allocation path.", defense: "DHCP snooping and rate limiting", indicator: "Address pool: healthy → exhausted", normalPath: ["CLIENT", "DHCP SERVER", "ADDRESS"], exposedPath: ["CLIENT", "FAKE REQUESTS", "POOL EXHAUSTED"], defendedPath: ["CLIENT", "TRUSTED DHCP", "ADDRESS"] },
  { id: "rogue-dhcp", name: "Rogue DHCP server", normal: "Clients receive configuration only from the authorized server.", exposed: "An unauthorized DHCP server sends an attacker-controlled gateway or DNS server.", defended: "DHCP snooping and trusted switch ports reject unauthorized responses.", defense: "DHCP snooping and trusted switch ports", indicator: "Provider: trusted → rouge", normalPath: ["CLIENT", "AUTHORIZED DHCP", "VALID DNS"], exposedPath: ["CLIENT", "ROGUE DHCP", "ATTACKER DNS"], defendedPath: ["CLIENT", "DHCP SNOOPING", "VALID DNS"] },
  { id: "cam-overflow", name: "CAM table overflow", normal: "The switch learns a limited set of valid MAC addresses on each port.", exposed: "A flood of fake MAC addresses overwhelms the switch's forwarding table.", defended: "Port security and low MAC limits prevent the table from overflowing.", defense: "Port security and MAC limits", indicator: "Table state: stable → full", normalPath: ["HOST", "SWITCH LEARNING", "PORT TABLE"], exposedPath: ["HOST", "FLOOD OF MACS", "TABLE OVERFLOW"], defendedPath: ["HOST", "PORT SECURITY", "PORT TABLE"] },
];

const networkScenarios = [
  { id: "arp", name: "ARP poisoning", path: "relay", normal: "ARP maps the destination IP to its real MAC address.", exposed: "A false ARP mapping sends the traffic through the attacker.", defended: "Inspection rejects the false ARP mapping; traffic keeps its normal path.", defense: "Dynamic ARP Inspection and DHCP snooping", packet: "Destination IP → unexpected MAC address" },
  { id: "mitm", name: "Man-in-the-Middle", path: "relay", normal: "Host A and Host B exchange traffic directly.", exposed: "The attacker becomes an untrusted relay between both hosts.", defended: "Authenticated TLS protects the exchange from an untrusted relay.", defense: "TLS, certificate validation, and mutual authentication", packet: "Relayed traffic · contents protected by encryption" },
  { id: "ip-spoof", name: "IP spoofing", path: "packet", normal: "The packet source matches the sending host.", exposed: "The displayed source address is forged.", defended: "Boundary filtering rejects a source address that should not enter here.", defense: "Ingress and egress filtering", packet: "Claimed source: 192.0.2.25 · actual sender: untrusted host" },
  { id: "mac-flood", name: "MAC flooding", path: "switch", normal: "The switch learns a small set of source MAC addresses.", exposed: "The switch's illustrative address table reaches its configured limit.", defended: "Port security limits learned MAC addresses on the port.", defense: "Port security and MAC address limits", packet: "Switch table: within limit → at configured limit" },
  { id: "mac-spoof", name: "MAC spoofing", path: "packet", normal: "The device presents its assigned network identity.", exposed: "A device presents a copied MAC address.", defended: "Network access control requires an authenticated device identity.", defense: "802.1X and network access control", packet: "Presented MAC: copied identity · device identity: unverified" },
  { id: "icmp", name: "ICMP flood", path: "packet", normal: "ICMP traffic remains within the service's illustrative capacity.", exposed: "Excess ICMP demand consumes the shared capacity shown below.", defended: "Rate limits and filtering keep the demonstration load within capacity.", defense: "Rate limiting, filtering, and DDoS protection", packet: "ICMP demand: normal → elevated" },
  { id: "fragment", name: "IP fragmentation", path: "packet", normal: "Fragments fit together without conflicting data.", exposed: "Overlapping fragment ranges make reassembly ambiguous.", defended: "Fragment validation rejects malformed or overlapping ranges.", defense: "Fragment validation and current system patches", packet: "Fragment ranges: consistent → overlapping" },
  { id: "sniff", name: "Packet sniffing", path: "observer", normal: "An observer on a shared segment could see unencrypted traffic.", exposed: "A passive observer can capture traffic on the shared segment.", defended: "Encryption leaves captured application data unreadable to the observer.", defense: "TLS, SSH, WPA3, and other encrypted protocols", packet: "Captured payload: readable → encrypted" },
  { id: "injection", name: "Packet injection", path: "packet", normal: "The receiver accepts packets in the expected authenticated sequence.", exposed: "An unexpected packet is presented to the receiver.", defended: "Authentication and sequence checks reject the unexpected packet.", defense: "Authentication, encryption, and sequence validation", packet: "Sequence: expected → unexpected" },
  { id: "routing", name: "Routing table poisoning", path: "relay", normal: "The route table sends the destination through the configured router.", exposed: "A false route diverts the illustrated path through an attacker.", defended: "Route authentication and filters reject the untrusted route.", defense: "Route authentication, filtering, and secure configuration", packet: "Next hop: trusted router → untrusted route" },
];

const dosScenarios = [
  { id: "dos", name: "DoS / DDoS", loadLabel: "Service demand", defense: "Traffic filtering, rate limits, and upstream DDoS protection" },
  { id: "syn", name: "SYN flood", loadLabel: "Pending connections", defense: "SYN cookies and connection limits" },
  { id: "udp", name: "UDP flood", loadLabel: "Datagram demand", defense: "Filtering and upstream rate limits" },
  { id: "http", name: "HTTP flood", loadLabel: "Application requests", defense: "WAF rules, bot detection, and caching" },
  { id: "slowloris", name: "Slowloris", loadLabel: "Open connections", defense: "Connection timeouts and reverse proxies" },
  { id: "dns", name: "DNS amplification", loadLabel: "Amplified response demand", defense: "Restrict recursive DNS and apply response rate limiting" },
  { id: "smurf", name: "Smurf attack", loadLabel: "Amplified ICMP demand", defense: "Disable directed broadcasts and apply ingress filtering" },
];

type AttackWalkthroughScenario = {
  id: string;
  name: string;
  normal: string;
  exposed: string;
  defended: string;
  defense: string;
  indicator: string;
  normalPath: [string, string, string];
  exposedPath: [string, string, string];
  defendedPath: [string, string, string];
};

const dnsScenarios: AttackWalkthroughScenario[] = [
  { id: "dns-spoof", name: "DNS spoofing", normal: "A resolver returns the legitimate address for a domain.", exposed: "The illustrative lookup receives a false response and points to an incorrect address.", defended: "DNSSEC validation rejects an unsigned or invalid response before it is used.", defense: "DNSSEC validation and trusted resolvers", indicator: "Lookup answer: validated → untrusted", normalPath: ["CLIENT", "TRUSTED RESOLVER", "CORRECT ADDRESS"], exposedPath: ["CLIENT", "FALSE RESPONSE", "WRONG ADDRESS"], defendedPath: ["CLIENT", "VALIDATED ANSWER", "CORRECT ADDRESS"] },
  { id: "dns-cache", name: "DNS cache poisoning", normal: "The resolver cache contains the expected record for the domain.", exposed: "A poisoned cache entry causes later lookups to return an incorrect address.", defended: "DNSSEC validation and secure resolver configuration prevent the untrusted record from being accepted.", defense: "DNSSEC validation and secure resolver configuration", indicator: "Cached record: expected → untrusted", normalPath: ["CLIENT", "VALID CACHE", "CORRECT ADDRESS"], exposedPath: ["CLIENT", "POISONED CACHE", "WRONG ADDRESS"], defendedPath: ["CLIENT", "VALIDATED CACHE", "CORRECT ADDRESS"] },
  { id: "dns-hijack", name: "DNS hijacking", normal: "The device uses the resolver configured by its administrator.", exposed: "Changed DNS settings redirect lookups to an untrusted resolver.", defended: "Protected router administration and DNS monitoring help detect and prevent unauthorized setting changes.", defense: "Secure router administration, MFA, and DNS monitoring", indicator: "Configured resolver: trusted → untrusted", normalPath: ["DEVICE", "MANAGED SETTINGS", "TRUSTED DNS"], exposedPath: ["DEVICE", "CHANGED SETTINGS", "UNTRUSTED DNS"], defendedPath: ["DEVICE", "MONITORED SETTINGS", "TRUSTED DNS"] },
  { id: "dns-tunnel", name: "DNS tunnelling", normal: "DNS queries follow the network's expected policy and usage patterns.", exposed: "Unusual query patterns illustrate how DNS can be misused as a hidden data channel.", defended: "DNS inspection and restrictive policies flag and block anomalous query patterns.", defense: "DNS traffic inspection and restrictive DNS policies", indicator: "Query pattern: expected → anomalous", normalPath: ["CLIENT", "DNS POLICY", "RESOLVER"], exposedPath: ["CLIENT", "UNUSUAL QUERIES", "HIDDEN CHANNEL"], defendedPath: ["CLIENT", "INSPECTED QUERIES", "POLICY ENFORCED"] },
  { id: "dns-amplification", name: "DNS amplification", normal: "A resolver answers permitted requests with appropriately sized responses.", exposed: "An open resolver can send oversized responses toward a spoofed destination.", defended: "Restricting recursion and applying response rate limits reduces resolver abuse.", defense: "Disable open recursion and apply response rate limiting", indicator: "Resolver access: restricted → open", normalPath: ["CLIENT", "RESTRICTED DNS", "EXPECTED REPLY"], exposedPath: ["SPOOFED SOURCE", "OPEN RESOLVER", "LARGE REPLIES"], defendedPath: ["CLIENT", "RATE-LIMITED DNS", "EXPECTED REPLY"] },
];

const wirelessScenarios: AttackWalkthroughScenario[] = [
  { id: "evil-twin", name: "Evil Twin", normal: "The client connects to the verified campus access point.", exposed: "A lookalike access point may lure a client onto an untrusted network.", defended: "Certificate validation helps the client reject an impersonating access point.", defense: "WPA3-Enterprise and certificate validation", indicator: "Access point: verified → untrusted lookalike", normalPath: ["CLIENT", "VERIFIED AP", "CAMPUS NETWORK"], exposedPath: ["CLIENT", "LOOKALIKE AP", "UNTRUSTED NETWORK"], defendedPath: ["CLIENT", "CERTIFICATE CHECK", "VERIFIED AP"] },
  { id: "deauth", name: "Deauthentication", normal: "The client maintains an authenticated connection to the access point.", exposed: "Forged management frames are shown as an attempt to interrupt the wireless session.", defended: "Protected Management Frames reject unauthenticated management traffic.", defense: "Protected Management Frames (802.11w) and WPA3", indicator: "Management frame: authenticated → forged", normalPath: ["CLIENT", "AUTHENTICATED AP", "ACTIVE SESSION"], exposedPath: ["CLIENT", "FORGED FRAME", "SESSION INTERRUPTED"], defendedPath: ["CLIENT", "PMF CHECK", "SESSION PROTECTED"] },
  { id: "wifi-password", name: "Wi-Fi password cracking", normal: "A client authenticates with a strong, protected network credential.", exposed: "A weak shared password puts network access at risk; no password guessing is performed by this demo.", defended: "A strong WPA3 credential and disabled WPS reduce the risk of unauthorized access.", defense: "Strong passwords, WPA3, and disabling WPS", indicator: "Credential strength: strong → weak", normalPath: ["CLIENT", "STRONG CREDENTIAL", "ACCESS CONTROL"], exposedPath: ["CLIENT", "WEAK CREDENTIAL", "ACCESS AT RISK"], defendedPath: ["CLIENT", "WPA3 AUTH", "ACCESS CONTROL"] },
  { id: "rogue-ap", name: "Rogue access point", normal: "Managed access points provide monitored wireless network access.", exposed: "An unauthorized access point creates an unmanaged path into the environment.", defended: "Wireless monitoring and network access controls help identify and contain unauthorized access points.", defense: "Wireless IDS/IPS and access-point monitoring", indicator: "Access point: managed → unauthorized", normalPath: ["CLIENT", "MANAGED AP", "CONTROLLED LAN"], exposedPath: ["CLIENT", "ROGUE AP", "UNMANAGED PATH"], defendedPath: ["CLIENT", "MONITORED AP", "ACCESS CONTROL"] },
  { id: "wifi-sniffing", name: "Wireless packet sniffing", normal: "Encryption protects application data carried over the wireless network.", exposed: "On an untrusted or inadequately protected network, exposed traffic may be observable.", defended: "WPA2/WPA3 and TLS protect captured traffic from being read as plaintext.", defense: "WPA2/WPA3 encryption and TLS", indicator: "Captured payload: readable → encrypted", normalPath: ["CLIENT", "ENCRYPTED WI-FI", "SERVICE"], exposedPath: ["CLIENT", "OPEN WI-FI", "EXPOSED TRAFFIC"], defendedPath: ["CLIENT", "ENCRYPTED WI-FI", "PROTECTED DATA"] },
];

function NetworkAttackDemo() {
  const [scenarioId, setScenarioId] = useState(networkScenarios[0].id);
  const [attackActive, setAttackActive] = useState(false);
  const [mitigationsEnabled, setMitigationsEnabled] = useState(false);
  const scenario = networkScenarios.find((item) => item.id === scenarioId) ?? networkScenarios[0];
  const attackBlocked = attackActive && mitigationsEnabled;
  const attackVisible = attackActive && !mitigationsEnabled;
  const attackerRelays = attackVisible && scenario.path === "relay";
  const passiveObserver = attackVisible && scenario.path === "observer";
  const message = !attackActive ? scenario.normal : attackBlocked ? scenario.defended : scenario.exposed;

  function changeScenario(id: string) {
    setScenarioId(id);
    setAttackActive(false);
  }

  return (
    <section className="attack-simulation" aria-labelledby="network-demo-title">
      <div className="demo-heading"><div><div className="section-kicker">LOCAL WALKTHROUGH</div><h3 id="network-demo-title">Network attack simulator</h3><p>Switch scenarios, observe the traffic change, then apply a defense.</p></div><span className="demo-badge">NO NETWORK TRAFFIC</span></div>
      <div className="demo-control-row">
        <label className="demo-select-label">SCENARIO<select value={scenarioId} onChange={(event) => changeScenario(event.target.value)}>{networkScenarios.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <button className="button button-primary demo-run-button" type="button" onClick={() => setAttackActive((active) => !active)}><Activity size={14} />{attackActive ? "Reset scenario" : "Simulate attack"}</button>
        <label className="demo-checkbox"><input type="checkbox" checked={mitigationsEnabled} onChange={(event) => setMitigationsEnabled(event.target.checked)} /><span>Apply defenses</span></label>
      </div>
      <div className={`demo-result ${attackBlocked ? "blocked" : attackVisible ? "exposed" : "idle"}`} aria-live="polite">{attackBlocked ? <ShieldCheck size={16} /> : attackVisible ? <ShieldX size={16} /> : <Activity size={16} />}<span>{message}</span></div>
      <div className={`demo-network-flow${attackVisible ? " attack-visible" : ""}`} aria-label="Illustrative network path">
        <div className="demo-network-node"><strong>HOST A</strong><small>192.0.2.10</small></div><ArrowRight className="demo-flow-arrow" size={17} />
        <div className={`demo-network-node transit${attackerRelays ? " attacker" : ""}`}><strong>{attackerRelays ? "ATTACKER" : "SWITCH"}</strong><small>{attackerRelays ? "untrusted relay" : "normal path"}</small></div><ArrowRight className="demo-flow-arrow" size={17} />
        <div className="demo-network-node"><strong>HOST B</strong><small>192.0.2.20</small></div>
        {passiveObserver && <div className="demo-observer">PASSIVE OBSERVER</div>}
      </div>
      <div className="demo-packet-note"><span>{attackVisible ? "SIMULATED CHANGE" : attackBlocked ? "DEFENSE RESULT" : "NORMAL STATE"}</span><code>{attackVisible ? scenario.packet : attackBlocked ? scenario.defense : "No attack scenario is active"}</code></div>
      <div className="demo-defense-note"><ShieldCheck size={14} /><span><strong>Defense:</strong> {scenario.defense}</span></div>
    </section>
  );
}

function ServiceLoadDemo() {
  const [scenarioId, setScenarioId] = useState(dosScenarios[0].id);
  const [pressure, setPressure] = useState(90);
  const [attackActive, setAttackActive] = useState(false);
  const [mitigationsEnabled, setMitigationsEnabled] = useState(false);
  const scenario = dosScenarios.find((item) => item.id === scenarioId) ?? dosScenarios[0];
  const load = simulateAttackLoad(pressure, attackActive, mitigationsEnabled);
  const status = !attackActive ? "idle" : load.overloaded ? "overloaded" : "available";

  function changeScenario(id: string) {
    setScenarioId(id);
    setAttackActive(false);
  }

  return (
    <section className="attack-simulation" aria-labelledby="dos-demo-title">
      <div className="demo-heading"><div><div className="section-kicker">CAPACITY MODEL</div><h3 id="dos-demo-title">Service availability simulator</h3><p>Adjust illustrative attack pressure and compare the impact of mitigations.</p></div><span className="demo-badge">NO NETWORK TRAFFIC</span></div>
      <div className="demo-control-row">
        <label className="demo-select-label">SCENARIO<select value={scenarioId} onChange={(event) => changeScenario(event.target.value)}>{dosScenarios.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <button className="button button-primary demo-run-button" type="button" onClick={() => setAttackActive((active) => !active)}><Activity size={14} />{attackActive ? "Stop scenario" : "Run scenario"}</button>
        <label className="demo-checkbox"><input type="checkbox" checked={mitigationsEnabled} onChange={(event) => setMitigationsEnabled(event.target.checked)} /><span>Apply defenses</span></label>
      </div>
      <div className="demo-pressure-control"><label htmlFor="attack-pressure">SIMULATED ATTACK PRESSURE <output htmlFor="attack-pressure">{pressure} / 150</output></label><input id="attack-pressure" type="range" min="0" max="150" step="5" value={pressure} onChange={(event) => setPressure(Number(event.target.value))} /><div className="demo-range-labels"><span>LOW</span><span>HIGH</span></div></div>
      <div className={`demo-result ${status}`} aria-live="polite">{status === "overloaded" ? <ShieldX size={16} /> : status === "available" ? <ShieldCheck size={16} /> : <Activity size={16} />}<span>{status === "idle" ? "Idle. Run a scenario to model service demand." : status === "overloaded" ? "Demand exceeds the service capacity in this illustrative model." : mitigationsEnabled ? "Mitigations keep the modeled demand within capacity." : "The service remains within its modeled capacity."}</span></div>
      <div className="demo-capacity">
        <div className="demo-capacity-heading"><span>{scenario.loadLabel}</span><strong>{load.totalLoad} / {load.capacity} units</strong></div>
        <div className="demo-meter" role="meter" aria-label={`${scenario.loadLabel} against service capacity`} aria-valuemin={0} aria-valuemax={load.capacity} aria-valuenow={Math.min(load.totalLoad, load.capacity)}><span className={load.overloaded ? "overloaded" : ""} style={{ width: `${load.utilizationPercent}%` }} /></div>
        <div className="demo-capacity-breakdown"><span>Baseline <b>{load.baselineLoad}</b></span><span>Effective attack load <b>{load.effectiveAttackPressure}</b></span><span>Capacity <b>{load.capacity}</b></span></div>
      </div>
      <div className="demo-defense-note"><ShieldCheck size={14} /><span><strong>Defense:</strong> {scenario.defense}</span></div>
      <div className="demo-model-note"><RotateCcw size={12} /><span>Units are invented for this demonstration, not packet rates or measurements of a real service. {attackActive ? `Configured pressure: ${load.attackPressure}.` : "No load is generated until you run the scenario."}</span></div>
    </section>
  );
}

function AttackWalkthroughDemo({ title, titleId, scenarios }: { title: string; titleId: string; scenarios: AttackWalkthroughScenario[] }) {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id);
  const [attackActive, setAttackActive] = useState(false);
  const [mitigationsEnabled, setMitigationsEnabled] = useState(false);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const attackBlocked = attackActive && mitigationsEnabled;
  const attackVisible = attackActive && !mitigationsEnabled;
  const message = !attackActive ? scenario.normal : attackBlocked ? scenario.defended : scenario.exposed;
  const path = attackVisible ? scenario.exposedPath : attackBlocked ? scenario.defendedPath : scenario.normalPath;
  const roles = ["SOURCE", "CONTROL POINT", "OUTCOME"];

  function changeScenario(id: string) {
    setScenarioId(id);
    setAttackActive(false);
  }

  return (
    <section className="attack-simulation" aria-labelledby={titleId}>
      <div className="demo-heading"><div><div className="section-kicker">LOCAL WALKTHROUGH</div><h3 id={titleId}>{title}</h3><p>Select an attack, compare the illustrative risk, then apply defenses.</p></div><span className="demo-badge">NO NETWORK TRAFFIC</span></div>
      <div className="demo-control-row">
        <label className="demo-select-label">SCENARIO<select value={scenarioId} onChange={(event) => changeScenario(event.target.value)}>{scenarios.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <button className="button button-primary demo-run-button" type="button" onClick={() => setAttackActive((active) => !active)}><Activity size={14} />{attackActive ? "Reset scenario" : "Simulate attack"}</button>
        <label className="demo-checkbox"><input type="checkbox" checked={mitigationsEnabled} onChange={(event) => setMitigationsEnabled(event.target.checked)} /><span>Apply defenses</span></label>
      </div>
      <div className={`demo-result ${attackBlocked ? "blocked" : attackVisible ? "exposed" : "idle"}`} aria-live="polite">{attackBlocked ? <ShieldCheck size={16} /> : attackVisible ? <ShieldX size={16} /> : <Activity size={16} />}<span>{message}</span></div>
      <div className={`demo-network-flow${attackVisible ? " attack-visible" : ""}`} aria-label={`${scenario.name} illustrative flow`}>
        {path.map((node, index) => <div className={`demo-network-node${index === 1 ? " transit" : ""}${attackVisible && index === 1 ? " attacker" : ""}`} key={`${roles[index]}-${node}`}><strong>{node}</strong><small>{roles[index]}</small></div>).flatMap((node, index) => index < path.length - 1 ? [node, <ArrowRight className="demo-flow-arrow" size={17} key={`arrow-${index}`} />] : [node])}
      </div>
      <div className="demo-packet-note"><span>{attackVisible ? "SIMULATED CHANGE" : attackBlocked ? "DEFENSE RESULT" : "NORMAL STATE"}</span><code>{attackVisible || attackBlocked ? scenario.indicator : "No attack scenario is active"}</code></div>
      <div className="demo-defense-note"><ShieldCheck size={14} /><span><strong>Defense:</strong> {scenario.defense}</span></div>
    </section>
  );
}

export default function AttackSimulation({ mode }: { mode: "application" | "network" | "dos" | "dns" | "wireless" | "transport" | "routing" }) {
  if (mode === "application") return <AttackWalkthroughDemo title="Application-layer attack simulator" titleId="application-demo-title" scenarios={applicationScenarios} />;
  if (mode === "network") return <NetworkAttackDemo />;
  if (mode === "dos") return <ServiceLoadDemo />;
  if (mode === "dns") return <AttackWalkthroughDemo title="DNS attack simulator" titleId="dns-demo-title" scenarios={dnsScenarios} />;
  if (mode === "wireless") return <AttackWalkthroughDemo title="Wireless attack simulator" titleId="wireless-demo-title" scenarios={wirelessScenarios} />;
  if (mode === "transport") return <AttackWalkthroughDemo title="Transport-layer attack simulator" titleId="transport-demo-title" scenarios={transportScenarios} />;
  return <AttackWalkthroughDemo title="Routing and switching attack simulator" titleId="routing-demo-title" scenarios={routingScenarios} />;
}