import Link from "next/link";
import { Activity, ArrowRight, BookOpen, ChevronRight, Cpu, Network, Router, Server, ShieldAlert } from "lucide-react";

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          <Link href="/" className="nav-link active"><Activity size={17} strokeWidth={1.8} /><span>Overview</span></Link>
          <Link href="/learn" className="nav-link"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link>
          <Link href="/builder" className="nav-link"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link>
          <Link href="/incidents" className="nav-link"><ShieldAlert size={17} strokeWidth={1.8} /><span>Real-World Scenarios</span></Link>
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Threat lab online</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Threat lab</span></div></header>
        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" />ATTACK SURFACE LABORATORY</div><h1>See the attack<br /><span>before it lands.</span></h1><p className="welcome-copy">Trace common intrusion paths, map weak links, and test the controls that stop malicious traffic before it reaches the core.</p><div className="welcome-actions"><Link className="button button-primary" href="/builder"><Network size={16} /> Open lab <ArrowRight size={15} /></Link><Link className="text-action" href="/learn">Review attacks <ArrowRight size={15} /></Link></div></div>
            <div className="topology-card" aria-label="Security analysis example"><div className="topology-head"><span>ATTACK PATH / EXAMPLE</span><span className="topology-live"><span className="status-dot" />LIVE THREAT MAP</span></div><div className="topology-canvas"><div className="topology-link link-a" /><div className="topology-link link-b" /><div className="topology-link link-c" /><div className="topology-link link-d" /><div className="topology-node host-node node-a"><Cpu size={17} /><span>HOST 01</span></div><div className="topology-node switch-node"><Network size={19} /><span>SWITCH</span></div><div className="topology-node host-node node-b"><Server size={17} /><span>SERVER</span></div><div className="topology-node router-node"><Router size={18} /><span>ROUTER</span></div><div className="topology-node host-node node-c"><Cpu size={17} /><span>HOST 02</span></div><span className="packet packet-one" /><span className="packet packet-two" /></div><div className="topology-foot"><span><i className="legend-line" /> Suspicious path analysis</span><span>UNAUTHORISED TRAFFIC</span></div></div>
          </section>
        </div>
      </main>
    </div>
  );
}