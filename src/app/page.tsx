import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BookOpen, Cable, Calculator, ChevronRight, CircleHelp, Cpu, GitBranch, Layers3, Network, Radio, Router, Server, ShieldCheck, Waypoints } from "lucide-react";

const labs = [
  { title: "Inspect the ARP spoofing path", meta: "MITM · ARP", icon: Cable, color: "warm" },
  { title: "Trace a SYN flood response", meta: "DoS · TCP", icon: GitBranch, color: "orange" },
  { title: "Review lateral movement flow", meta: "RDP · Trust abuse", icon: Waypoints, color: "blue" },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          <Link href="/" className="nav-link active"><Activity size={17} strokeWidth={1.8} /><span>Overview</span></Link>
          <Link href="/learn" className="nav-link"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link>
          <Link href="/builder" className="nav-link"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link>
          <Link href="/builder#simulation" className="nav-link"><Radio size={17} strokeWidth={1.8} /><span>Simulations</span></Link>
          <Link href="/debugging" className="nav-link"><AlertTriangle size={17} strokeWidth={1.8} /><span>Defense drills</span></Link>
          <Link href="/learn#labs" className="nav-link"><Layers3 size={17} strokeWidth={1.8} /><span>Guided labs</span></Link>
        </nav>
        <div className="sidebar-label sidebar-label-spaced">Reference</div>
        <Link className="nav-link" href="/subnet"><Calculator size={17} strokeWidth={1.8} /><span>Subnet calculator</span></Link>
        <Link className="nav-link" href="/learn#glossary"><BookOpen size={17} strokeWidth={1.8} /><span>Protocol glossary</span></Link>
        <Link className="nav-link" href="/learn#about"><CircleHelp size={17} strokeWidth={1.8} /><span>About this lab</span></Link>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Threat lab online</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Attack simulation</span><button className="icon-button" aria-label="About the lab" title="About this lab"><CircleHelp size={18} /></button></div></header>
        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" />ATTACK SURFACE LABORATORY</div><h1>See the attack<br /><span>before it lands.</span></h1><p className="welcome-copy">Trace common intrusion paths, map weak links, and test the controls that stop malicious traffic before it reaches the core.</p><div className="welcome-actions"><Link className="button button-primary" href="/builder"><Network size={16} /> Open attack lab <ArrowRight size={15} /></Link><Link className="text-action" href="/learn">Review attack playbooks <ArrowRight size={15} /></Link></div></div>
            <div className="topology-card" aria-label="Security analysis example"><div className="topology-head"><span>ATTACK PATH / EXAMPLE</span><span className="topology-live"><span className="status-dot" />LIVE THREAT MAP</span></div><div className="topology-canvas"><div className="topology-link link-a" /><div className="topology-link link-b" /><div className="topology-link link-c" /><div className="topology-link link-d" /><div className="topology-node host-node node-a"><Cpu size={17} /><span>HOST 01</span></div><div className="topology-node switch-node"><Network size={19} /><span>SWITCH</span></div><div className="topology-node host-node node-b"><Server size={17} /><span>SERVER</span></div><div className="topology-node router-node"><Router size={18} /><span>ROUTER</span></div><div className="topology-node host-node node-c"><Cpu size={17} /><span>HOST 02</span></div><span className="packet packet-one" /><span className="packet packet-two" /></div><div className="topology-foot"><span><i className="legend-line" /> Suspicious path analysis</span><span>UNAUTHORISED TRAFFIC</span></div></div>
          </section>
          <section className="section-block lab-section"><div className="section-heading"><div><div className="section-kicker">SIMULATED ATTACKS</div><h2>Defensive labs</h2></div><Link className="section-link" href="/learn#labs">All labs <ArrowRight size={15} /></Link></div><div className="lab-list">{labs.map(({ title, meta, icon: Icon, color }, index) => <Link className="lab-row" href={`/labs/${index + 1}`} key={title}><span className={`lab-icon ${color}`}><Icon size={18} /></span><span className="lab-title"><strong>{title}</strong><small>{meta}</small></span><span className="lab-planned">START</span><span className="lab-open"><ArrowRight size={13} /></span></Link>)}</div></section>
          <section className="bottom-note"><ShieldCheck size={17} /><span>Threat analysis runs locally. The simulator focuses on common compromise paths and their defensive controls.</span><span className="bottom-note-tail">MONITOR / TEST / RESPOND</span></section>
        </div>
      </main>
    </div>
  );
}