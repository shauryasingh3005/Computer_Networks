"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Cable, Check, ChevronRight, CircleAlert, CircleCheck, Cpu, GitBranch, Network, RotateCcw, Router, Waypoints } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { calculateSubnet, NetworkSimulator } from "@/simulation/engine";
import { longestPrefixMatch, type StaticRoute } from "@/simulation/routing";
import type { SimTopology, SimulationEvent, TcpHandshakeResult } from "@/simulation/types";

const labList = [
  { id: "1", title: "Inspect ARP and ping", meta: "ARP · ICMP", icon: Cable },
  { id: "2", title: "Calculate an IPv4 subnet", meta: "IPv4 · CIDR", icon: Network },
  { id: "3", title: "Follow longest-prefix routing", meta: "Routing · LPM", icon: Router },
  { id: "4", title: "Trace a TCP handshake", meta: "TCP · State", icon: Waypoints },
];

const topology: SimTopology = {
  devices: [
    { id: "pc-a", name: "PC-A", type: "host", ipAddress: "192.168.1.10", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:01" },
    { id: "sw-1", name: "SW-1", type: "switch", ipAddress: "192.168.1.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:02" },
    { id: "pc-b", name: "PC-B", type: "host", ipAddress: "192.168.1.20", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:03" },
  ],
  links: [
    { id: "pc-a-sw-1", sourceId: "pc-a", targetId: "sw-1", up: true, delayMs: 2 },
    { id: "sw-1-pc-b", sourceId: "sw-1", targetId: "pc-b", up: true, delayMs: 3 },
  ],
};

const routeTable: StaticRoute[] = [
  { destination: "10.20.0.0", prefixLength: 16, nextHop: "192.168.1.3", interfaceName: "eth2", metric: 10 },
  { destination: "10.0.0.0", prefixLength: 8, nextHop: "192.168.1.2", interfaceName: "eth1", metric: 5 },
  { destination: "0.0.0.0", prefixLength: 0, nextHop: "192.168.1.1", interfaceName: "eth0", metric: 1 },
];

const eventNames: Record<SimulationEvent["kind"], string> = {
  "packet-created": "Packet created", "arp-request": "ARP request", "arp-response": "ARP reply",
  "frame-forwarded": "Frame forwarded", "icmp-echo-request": "ICMP echo request", "icmp-echo-reply": "ICMP echo reply",
  "tcp-syn": "SYN", "tcp-syn-ack": "SYN-ACK", "tcp-ack": "ACK", "tcp-established": "Connection established",
  "packet-delivered": "Packet delivered", "packet-dropped": "Packet dropped",
};

function EventTimeline({ events }: { events: SimulationEvent[] }) {
  return <ol className="lab-event-list">{events.map((event) => <li className="lab-event-row" key={`${event.sequence}-${event.packetId}`}><span>{event.timeMs.toFixed(1)} ms</span><strong>{eventNames[event.kind]}</strong><small>{event.message}</small></li>)}</ol>;
}

export default function LabRunner({ labId }: { labId: string }) {
  const lab = labList.find((item) => item.id === labId)!;
  const simulator = useRef(new NetworkSimulator());
  const [pingEvents, setPingEvents] = useState<SimulationEvent[]>([]);
  const [pingOutcome, setPingOutcome] = useState<string>();
  const [arpWasCleared, setArpWasCleared] = useState(false);
  const [subnetAddress, setSubnetAddress] = useState("192.168.10.24");
  const [subnetPrefix, setSubnetPrefix] = useState("26");
  const [networkAnswer, setNetworkAnswer] = useState("");
  const [subnetChecked, setSubnetChecked] = useState(false);
  const [routeAddress, setRouteAddress] = useState("10.20.4.15");
  const [routeLookupDone, setRouteLookupDone] = useState(false);
  const [tcpResult, setTcpResult] = useState<TcpHandshakeResult>();
  const calculation = useMemo(() => calculateSubnet(subnetAddress, subnetPrefix), [subnetAddress, subnetPrefix]);
  const selectedRoute = routeLookupDone ? longestPrefixMatch(routeTable, routeAddress) : undefined;
  const subnetCorrect = Boolean(calculation && networkAnswer.trim() === calculation.networkAddress);

  function runPing() {
    const result = simulator.current.ping(topology, "pc-a", "pc-b");
    setPingEvents(result.events);
    setPingOutcome(result.reachable ? `Ping succeeded in ${result.rttMs} ms.` : result.failure);
    setArpWasCleared(false);
  }

  function clearArp() {
    simulator.current.clearArpCache("pc-a");
    setPingEvents([]);
    setPingOutcome("PC-A's ARP cache was cleared. Run the ping again to generate a fresh request and reply.");
    setArpWasCleared(true);
  }

  function checkSubnet() {
    setSubnetChecked(true);
  }

  function startHandshake() {
    const result = simulator.current.tcpHandshake(topology, "pc-a", "pc-b");
    setTcpResult(result);
  }

  return (
    <div className="app-shell lab-app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Guided labs</div>
        <nav className="side-nav" aria-label="Guided lab navigation">{labList.map(({ id, title, icon: Icon }) => <Link className={`nav-link${id === labId ? " active" : ""}`} href={`/labs/${id}`} key={id}><Icon size={16} /><span>{title}</span></Link>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Lab workspace</div><div className="sidebar-version">LAB {labId.padStart(2, "0")} / 04</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><Link href="/learn#labs">Learn</Link><ChevronRight size={14} /><strong>Lab {labId}</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Interactive lab</span></div></header>
        <div className="page-content lab-page">
          <Link className="lab-back-link" href="/learn#labs"><ArrowLeft size={14} /> All guided labs</Link>
          <div className="eyebrow"><span className="eyebrow-line" />GUIDED LAB / {labId.padStart(2, "0")} OF 04</div>
          <section className="lab-title-row"><div><h1 className="learn-title">{lab.title}</h1><p className="welcome-copy">{lab.meta} · Run the activity, inspect the output, and check your understanding.</p></div><span className="lab-objective-label">OBJECTIVE</span></section>
          <div className="lab-workspace-grid">
            <section className="lab-task-panel">
              {labId === "1" && <>
                <div className="lab-panel-head"><span className="section-kicker">OBJECTIVE</span><h2>Resolve a host and send a ping</h2><p>PC-A and PC-B share a subnet through SW-1. Clear the ARP cache, then observe address resolution before ICMP delivery.</p></div>
                <div className="lab-topology-strip"><span className="lab-device-chip"><Cpu size={15} />PC-A</span><i /><span className="lab-device-chip switch"><Network size={15} />SW-1</span><i /><span className="lab-device-chip"><Cpu size={15} />PC-B</span></div>
                <div className="lab-action-row"><button className="button lab-secondary-button" onClick={clearArp}><RotateCcw size={14} />Clear ARP cache</button><button className="button button-primary" onClick={runPing}><Waypoints size={15} />Run ping</button></div>
                <div className="lab-state-note"><span className={`lab-state-dot${arpWasCleared ? " cleared" : ""}`} />{arpWasCleared ? "ARP cache empty" : "ARP cache may contain the PC-A → PC-B mapping"}</div>
                {pingOutcome && <div className={`lab-outcome ${pingEvents.some((event) => event.kind === "packet-dropped") ? "error" : "success"}`}><CircleCheck size={16} />{pingOutcome}</div>}
                {pingEvents.length > 0 && <><div className="section-kicker lab-events-kicker">SIMULATION EVENTS</div><EventTimeline events={pingEvents} /></>}
                <Link className="lab-external-link" href="/builder">Open topology editor <ArrowRight size={14} /></Link>
              </>}

              {labId === "2" && <>
                <div className="lab-panel-head"><span className="section-kicker">OBJECTIVE</span><h2>Find the network address</h2><p>For <code>{subnetAddress}/{subnetPrefix}</code>, calculate the network address by applying the subnet mask. Enter only the address, then check your answer.</p></div>
                <div className="lab-form-grid"><label className="lab-input-label">IPv4 address<input value={subnetAddress} onChange={(event) => { setSubnetAddress(event.target.value); setSubnetChecked(false); }} spellCheck={false} /></label><label className="lab-input-label">CIDR prefix<input value={subnetPrefix} onChange={(event) => { setSubnetPrefix(event.target.value); setSubnetChecked(false); }} inputMode="numeric" /></label></div>
                <label className="lab-input-label answer-input-label">Your network address<input value={networkAnswer} onChange={(event) => { setNetworkAnswer(event.target.value); setSubnetChecked(false); }} placeholder="e.g. 192.168.10.0" spellCheck={false} /></label>
                <button className="button button-primary lab-submit-button" onClick={checkSubnet} disabled={!calculation || !networkAnswer.trim()}><Check size={15} />Check answer</button>
                {subnetChecked && (subnetCorrect ? <div className="lab-outcome success"><CircleCheck size={16} /><span>Correct. {calculation?.networkAddress}/{calculation?.prefixLength} spans {calculation?.firstUsableHost} to {calculation?.lastUsableHost}, with {calculation?.usableAddressCount} usable addresses.</span></div> : <div className="lab-outcome error"><CircleAlert size={16} /><span>Not quite. Apply the mask to the address bits. Hint: the mask for /{calculation?.prefixLength ?? "?"} is {calculation?.subnetMask ?? "invalid"}.</span></div>)}
                <Link className="lab-external-link" href="/subnet">Open subnet calculator <ArrowRight size={14} /></Link>
              </>}

              {labId === "3" && <>
                <div className="lab-panel-head"><span className="section-kicker">OBJECTIVE</span><h2>Choose the most specific route</h2><p>Routers select the matching route with the longest prefix. Enter a destination address and inspect the winning next hop.</p></div>
                <div className="route-table"><div className="route-table-head"><span>DESTINATION</span><span>NEXT HOP</span><span>INTERFACE</span></div>{routeTable.map((route) => <div className={`route-table-row${selectedRoute === route ? " route-selected" : ""}`} key={route.destination}><code>{route.destination}/{route.prefixLength}</code><code>{route.nextHop}</code><code>{route.interfaceName}</code></div>)}</div>
                <label className="lab-input-label route-address-field">Destination IPv4<input value={routeAddress} onChange={(event) => { setRouteAddress(event.target.value); setRouteLookupDone(false); }} spellCheck={false} /></label>
                <button className="button button-primary lab-submit-button" onClick={() => setRouteLookupDone(true)}><GitBranch size={15} />Look up route</button>
                {routeLookupDone && (selectedRoute ? <div className="lab-outcome success"><CircleCheck size={16} /><span>{selectedRoute.destination}/{selectedRoute.prefixLength} wins. Forward to {selectedRoute.nextHop} on {selectedRoute.interfaceName} (metric {selectedRoute.metric}).</span></div> : <div className="lab-outcome error"><CircleAlert size={16} /><span>No matching route. Check the destination IPv4 address.</span></div>)}
                <div className="lab-concept-note"><strong>Longest-prefix match</strong><span>When prefixes overlap, the route with the most matching leading bits wins. The default route (/0) is used only when no more specific entry matches.</span></div>
              </>}

              {labId === "4" && <>
                <div className="lab-panel-head"><span className="section-kicker">OBJECTIVE</span><h2>Complete the three-way handshake</h2><p>Start a simplified TCP connection between two local hosts, then inspect the SYN, SYN-ACK, and ACK sequence and simulated timing.</p></div>
                <div className="tcp-state-row"><span>CLIENT <strong>PC-A</strong></span><i /><span>SERVER <strong>PC-B</strong></span></div>
                <button className="button button-primary lab-submit-button" onClick={startHandshake}><Waypoints size={15} />Start TCP connection</button>
                {tcpResult && <div className={`lab-outcome ${tcpResult.established ? "success" : "error"}`}>{tcpResult.established ? <CircleCheck size={16} /> : <CircleAlert size={16} />}{tcpResult.established ? `Connection established · ${tcpResult.durationMs} ms handshake RTT` : tcpResult.failure}</div>}
                {tcpResult && <><div className="section-kicker lab-events-kicker">PACKET SEQUENCE</div><EventTimeline events={tcpResult.events} /></>}
                <div className="lab-concept-note"><strong>Simplified model</strong><span>This lab models connection setup timing and packet order only. It does not implement TCP sequence numbers, data transfer, retransmissions, or RFC-complete TCP behavior.</span></div>
              </>}
            </section>

            <aside className="lab-side-panel"><div className="section-kicker">LAB NOTES</div><h2>Before you begin</h2><ul><li>All activity is local and deterministic.</li><li>Simulation values use the configured link delays, not real network measurements.</li><li>Your work resets when this page is refreshed.</li></ul><div className="lab-side-divider" /><span className="section-kicker">RELATED TOPIC</span><Link href={`/learn#module-${labId === "1" ? "05" : labId === "2" || labId === "3" ? "04" : "03"}`}>{labId === "1" ? "Ethernet and ARP" : labId === "2" ? "IPv4 and subnetting" : labId === "3" ? "Static routing" : "Transport layer"}<ArrowRight size={14} /></Link><div className="lab-side-divider" /><span className="section-kicker">UP NEXT</span><Link className="next-lab-link" href={`/labs/${labId === "4" ? "1" : String(Number(labId) + 1)}`}>{labId === "4" ? "Restart the first lab" : labList[Number(labId)]?.title}<ArrowRight size={14} /></Link></aside>
          </div>
          <footer className="learn-footer"><span>NetLab guided lab · Results are simulated, not measured on your network.</span><Link href="/learn#labs">Return to lab list <ArrowRight size={14} /></Link></footer>
        </div>
      </main>
    </div>
  );
}