"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, ChevronRight, CircleAlert, Copy, Network } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateSubnet } from "@/simulation/engine";

export default function SubnetPage() {
  const [address, setAddress] = useState("192.168.10.24");
  const [prefix, setPrefix] = useState("24");
  const calculation = useMemo(() => calculateSubnet(address.trim(), prefix.trim()), [address, prefix]);
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    if (!calculation || !navigator.clipboard) return;
    await navigator.clipboard.writeText(`${calculation.networkAddress}/${calculation.prefixLength}\nBroadcast: ${calculation.broadcastAddress}\nUsable: ${calculation.firstUsableHost} - ${calculation.lastUsableHost}\nHosts: ${calculation.usableAddressCount}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} strokeWidth={2.2} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation"><Link className="nav-link" href="/"><Network size={17} /><span>Overview</span></Link><Link className="nav-link" href="/learn"><ArrowRight size={17} /><span>Learn</span></Link><Link className="nav-link" href="/builder"><Network size={17} /><span>Network builder</span></Link><Link className="nav-link" href="/builder#simulation"><ArrowUpRight size={17} /><span>Simulations</span></Link></nav>
        <div className="sidebar-label sidebar-label-spaced">Reference</div>
        <Link className="nav-link active" href="/subnet"><Calculator size={17} /><span>Subnet calculator</span></Link>
        <Link className="nav-link" href="/learn#glossary"><ArrowRight size={17} /><span>Protocol glossary</span></Link>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local workspace</div><div className="sidebar-version">NETLAB / 0.1.0</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><ChevronRight size={14} /><strong>Subnet calculator</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />IPv4 tool</span></div></header>
        <div className="page-content subnet-page">
          <div className="eyebrow"><span className="eyebrow-line" />ADDRESSING REFERENCE</div>
          <section className="subnet-intro"><div><h1 className="learn-title">Make the subnet<br /><span>visible.</span></h1><p className="welcome-copy">Enter an IPv4 address and prefix or dotted-decimal mask. Boundaries are calculated from the address, not looked up.</p></div><span className="subnet-icon"><Calculator size={21} /></span></section>
          <section className="subnet-tool">
            <div className="subnet-inputs">
              <label className="subnet-field"><span>IPv4 address</span><input value={address} onChange={(event) => setAddress(event.target.value)} inputMode="decimal" spellCheck={false} aria-label="IPv4 address" /></label>
              <span className="subnet-slash">/</span>
              <label className="subnet-field prefix-field"><span>Prefix or mask</span><input value={prefix} onChange={(event) => setPrefix(event.target.value)} inputMode="text" spellCheck={false} aria-label="CIDR prefix or subnet mask" /></label>
            </div>
            {calculation ? <>
              <div className="subnet-result-head"><div><span className="section-kicker">CALCULATED NETWORK</span><h2>{calculation.networkAddress}<span>/{calculation.prefixLength}</span></h2></div><button className="copy-button" onClick={copySummary} title="Copy subnet summary"><Copy size={15} /><span>{copied ? "Copied" : "Copy"}</span></button></div>
              <div className="subnet-results">
                <div><small>SUBNET MASK</small><strong>{calculation.subnetMask}</strong></div>
                <div><small>NETWORK ADDRESS</small><strong>{calculation.networkAddress}</strong></div>
                <div><small>BROADCAST ADDRESS</small><strong>{calculation.broadcastAddress}</strong></div>
                <div><small>FIRST USABLE</small><strong>{calculation.firstUsableHost}</strong></div>
                <div><small>LAST USABLE</small><strong>{calculation.lastUsableHost}</strong></div>
                <div><small>USABLE ADDRESSES</small><strong>{calculation.usableAddressCount.toLocaleString()}</strong></div>
              </div>
              <div className="subnet-range"><span>ADDRESS SPACE</span><div className="range-track"><i style={{ left: `${calculation.prefixLength === 0 ? 0 : (calculation.prefixLength / 32) * 100}%` }} /></div><small>/{calculation.prefixLength} · {(2 ** (32 - calculation.prefixLength)).toLocaleString()} total addresses</small></div>
            </> : <div className="subnet-error"><CircleAlert size={17} /><span>Enter a valid IPv4 address and CIDR prefix (0–32) or contiguous subnet mask.</span></div>}
          </section>
          <section className="subnet-note"><strong>Addressing note</strong><span>/31 treats both addresses as usable on point-to-point links. A /32 identifies one address. Conventional network and broadcast addresses are excluded for prefixes from /0 through /30.</span></section>
        </div>
      </main>
    </div>
  );
}