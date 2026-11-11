"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, ChevronRight, CircleCheck, CircleHelp, Lightbulb, Network, RotateCcw, Waypoints } from "lucide-react";
import { useMemo, useState } from "react";
import { NetworkSimulator } from "@/simulation/engine";
import type { SimTopology } from "@/simulation/types";

const hints = [
  "Check whether the two IP addresses belong to the same network.",
  "Both hosts use a /24 mask. Compare the first three address octets.",
  "PC-B is on 192.168.2.0/24 while PC-A is on 192.168.1.0/24. There is no router in this topology.",
];

export default function DebuggingPage() {
  const [destinationAddress, setDestinationAddress] = useState("192.168.2.20");
  const [attempted, setAttempted] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const topology = useMemo<SimTopology>(() => ({
    devices: [
      { id: "pc-a", name: "PC-A", type: "host", ipAddress: "192.168.1.10", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:01" },
      { id: "sw-1", name: "SW-1", type: "switch", ipAddress: "192.168.1.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:02" },
      { id: "pc-b", name: "PC-B", type: "host", ipAddress: destinationAddress, subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:03" },
    ],
    links: [
      { id: "pc-a-sw-1", sourceId: "pc-a", targetId: "sw-1", up: true, delayMs: 2 },
      { id: "sw-1-pc-b", sourceId: "sw-1", targetId: "pc-b", up: true, delayMs: 3 },
    ],
  }), [destinationAddress]);
  const result = attempted ? new NetworkSimulator().ping(topology, "pc-a", "pc-b") : undefined;
  const solved = Boolean(result?.reachable);

  function reset() {
    setDestinationAddress("192.168.2.20");
    setAttempted(false);
    setHintLevel(0);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation"><Link className="nav-link" href="/"><Network size={17} /><span>Overview</span></Link><Link className="nav-link" href="/learn"><Waypoints size={17} /><span>Learn</span></Link><Link className="nav-link" href="/builder"><Network size={17} /><span>Network builder</span></Link><Link className="nav-link" href="/builder#simulation"><ArrowRight size={17} /><span>Simulations</span></Link><Link className="nav-link active" href="/debugging"><AlertTriangle size={17} /><span>Troubleshoot</span></Link></nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local workspace</div><div className="sidebar-version">NETLAB / 0.1.0</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><ChevronRight size={14} /><strong>Troubleshoot</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Challenge 01</span></div></header>
        <div className="page-content debug-page">
          <div className="eyebrow"><span className="eyebrow-line" />CONNECTIVITY CHALLENGE / 01</div>
          <section className="debug-intro"><div><h1 className="learn-title">A small network.<br /><span>A quiet failure.</span></h1><p className="welcome-copy">Two hosts are connected through a switch, but one address is misconfigured. Diagnose the issue and restore the ping.</p></div><button className="debug-reset" onClick={reset} title="Reset challenge"><RotateCcw size={15} /><span>Reset</span></button></section>
          <div className="debug-grid">
            <section className="debug-network"><div className="debug-panel-head"><span className="section-kicker">TOPOLOGY</span><span className="debug-up"><i />2 LINKS UP</span></div><div className="debug-topology"><div className="debug-wire wire-left" /><div className="debug-wire wire-right" /><div className="debug-device"><span className="debug-device-icon host"><Network size={18} /></span><strong>PC-A</strong><small>192.168.1.10/24</small></div><div className="debug-device switch"><span className="debug-device-icon"><Network size={18} /></span><strong>SW-1</strong><small>Layer 2</small></div><div className="debug-device"><span className="debug-device-icon host"><Network size={18} /></span><strong>PC-B</strong><small>{destinationAddress}/24</small></div></div><div className="debug-link-caption"><span><i />Active Ethernet connection</span><span>2 ms · 3 ms</span></div></section>
            <section className="debug-config"><div className="debug-panel-head"><span className="section-kicker">DEVICE CONFIGURATION</span><span className="editable-tag">EDITABLE</span></div><div className="debug-config-row"><div><strong>PC-A</strong><small>Source · 255.255.255.0</small></div><code>192.168.1.10</code></div><div className="debug-config-row target-config"><div><strong>PC-B</strong><small>Destination · 255.255.255.0</small></div><label className="debug-address-input"><span className="sr-only">PC-B IPv4 address</span><input value={destinationAddress} onChange={(event) => { setDestinationAddress(event.target.value); setAttempted(false); }} spellCheck={false} aria-label="PC-B IPv4 address" /></label></div><button className="button button-primary debug-test" onClick={() => setAttempted(true)}><Waypoints size={15} /> Test connectivity <ArrowRight size={14} /></button></section>
          </div>
          {attempted && <section className={`debug-feedback ${solved ? "solved" : "failed"}`}><div className="feedback-icon">{solved ? <CircleCheck size={18} /> : <AlertTriangle size={18} />}</div><div className="feedback-copy"><strong>{solved ? "Connectivity restored" : "No echo reply"}</strong><p>{solved ? `PC-A received a reply from PC-B in ${result?.rttMs} ms. The addresses now share a subnet.` : "The ping did not complete. Inspect the host addressing and request a hint if needed."}</p>{!solved && result?.events.map((event) => <small key={event.sequence}>{event.message}</small>)}</div>{solved && <span className="feedback-check"><Check size={15} /></span>}</section>}
          <section className="debug-hints"><div className="hint-heading"><span className="hint-icon"><Lightbulb size={17} /></span><div><strong>Need a nudge?</strong><small>Hints reveal one step at a time.</small></div><button className="hint-button" disabled={hintLevel >= hints.length || solved} onClick={() => setHintLevel((level) => Math.min(level + 1, hints.length))}><CircleHelp size={14} />{hintLevel >= hints.length ? "All hints shown" : "Show hint"}</button></div>{hintLevel > 0 && <ol className="hint-list">{hints.slice(0, hintLevel).map((hint, index) => <li key={hint}><span>{index + 1}</span>{hint}</li>)}</ol>}</section>
          {solved && <section className="debug-explanation"><div className="section-kicker">WHAT HAPPENED</div><h2>The subnet decides where a host sends the frame.</h2><p>PC-A compares the destination address with its own address using the /24 mask. Because 192.168.2.20 is outside 192.168.1.0/24 and no gateway is configured, this topology cannot deliver the packet. Moving PC-B to 192.168.1.0/24 makes it locally reachable; the hosts then resolve each other with ARP before ICMP echo request and reply frames are delivered.</p><Link href="/learn#module-04">Review IPv4 and subnetting <ArrowRight size={14} /></Link></section>}
          <footer className="learn-footer"><span>Scenario: wrong host address · The switch and links are functioning.</span><Link href="/builder">Open network builder <ArrowRight size={14} /></Link></footer>
        </div>
      </main>
    </div>
  );
}