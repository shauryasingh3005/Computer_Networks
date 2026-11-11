"use client";

import { Activity, ArrowRight, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { useState } from "react";
import { simulateAttackLoad } from "@/simulation/attack-demo";

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

export default function AttackSimulation({ mode }: { mode: "network" | "dos" }) {
  return mode === "network" ? <NetworkAttackDemo /> : <ServiceLoadDemo />;
}