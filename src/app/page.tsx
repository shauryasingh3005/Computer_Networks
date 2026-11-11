import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, BookOpen, Cable, Calculator, ChevronRight, CircleHelp, Cpu, GitBranch, Layers3, Network, Radio, Router, Server, ShieldCheck, Waypoints } from "lucide-react";

const topics = [
  { number: "01", name: "Network fundamentals", detail: "Devices, links & topologies", color: "mint" },
  { number: "02", name: "Data link layer", detail: "Ethernet, MAC & ARP", color: "blue" },
  { number: "03", name: "Network layer", detail: "IPv4, subnetting & routing", color: "orange" },
  { number: "04", name: "Transport layer", detail: "TCP, UDP & ports", color: "pink" },
];

const labs = [
  { title: "Inspect ARP and ping", meta: "ARP · ICMP", icon: Cable, color: "mint" },
  { title: "Follow longest-prefix routing", meta: "IPv4 · LPM", icon: GitBranch, color: "orange" },
  { title: "Trace a TCP handshake", meta: "TCP · Sequence numbers", icon: Waypoints, color: "blue" },
];

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} strokeWidth={2.2} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation">
          <Link href="/" className="nav-link active"><Activity size={17} strokeWidth={1.8} /><span>Overview</span></Link>
          <Link href="/learn" className="nav-link"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link>
          <Link href="/builder" className="nav-link"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link>
          <Link href="/builder#simulation" className="nav-link"><Radio size={17} strokeWidth={1.8} /><span>Simulations</span></Link>
          <Link href="/debugging" className="nav-link"><AlertTriangle size={17} strokeWidth={1.8} /><span>Troubleshoot</span></Link>
          <Link href="/learn#labs" className="nav-link"><Layers3 size={17} strokeWidth={1.8} /><span>Guided labs</span></Link>
        </nav>
        <div className="sidebar-label sidebar-label-spaced">Reference</div>
        <Link className="nav-link" href="/subnet"><Calculator size={17} strokeWidth={1.8} /><span>Subnet calculator</span></Link>
        <Link className="nav-link" href="/learn#glossary"><BookOpen size={17} strokeWidth={1.8} /><span>Protocol glossary</span></Link>
        <Link className="nav-link" href="/learn#about"><CircleHelp size={17} strokeWidth={1.8} /><span>About NetLab</span></Link>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local workspace</div><div className="sidebar-version">NETLAB / 0.1.0</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Overview</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Local simulation</span><button className="icon-button" aria-label="About NetLab" title="About NetLab"><CircleHelp size={18} /></button></div></header>
        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" />COMPUTER NETWORKS LABORATORY</div><h1>Make the network<br /><span>make sense.</span></h1><p className="welcome-copy">Build a topology, send a packet, and follow every decision it makes along the way.</p><div className="welcome-actions"><Link className="button button-primary" href="/builder"><Network size={16} /> Open network builder <ArrowRight size={15} /></Link><Link className="text-action" href="/learn">Explore learning path <ArrowRight size={15} /></Link></div></div>
            <div className="topology-card" aria-label="Example network topology illustration"><div className="topology-head"><span>TOPOLOGY / EXAMPLE</span><span className="topology-live"><span className="status-dot" />ILLUSTRATION</span></div><div className="topology-canvas"><div className="topology-link link-a" /><div className="topology-link link-b" /><div className="topology-link link-c" /><div className="topology-link link-d" /><div className="topology-node host-node node-a"><Cpu size={17} /><span>HOST 01</span></div><div className="topology-node switch-node"><Network size={19} /><span>SWITCH</span></div><div className="topology-node host-node node-b"><Server size={17} /><span>SERVER</span></div><div className="topology-node router-node"><Router size={18} /><span>ROUTER</span></div><div className="topology-node host-node node-c"><Cpu size={17} /><span>HOST 02</span></div></div><div className="topology-foot"><span><i className="legend-line" /> Example Ethernet links</span><span>NOT A LIVE SIMULATION</span></div></div>
          </section>
          <section className="section-block"><div className="section-heading"><div><div className="section-kicker">PICK UP A CONCEPT</div><h2>Learning path</h2></div><Link className="section-link" href="/learn">All modules <ArrowRight size={15} /></Link></div><div className="topic-grid">{topics.map((topic) => <Link className="topic-item" href={`/learn#module-${topic.number}`} key={topic.number}><span className={`topic-index ${topic.color}`}>{topic.number}</span><span className="topic-copy"><strong>{topic.name}</strong><small>{topic.detail}</small></span><ArrowRight className="topic-arrow" size={16} /></Link>)}</div></section>
          <section className="section-block lab-section"><div className="section-heading"><div><div className="section-kicker">LEARN BY DOING</div><h2>Guided labs</h2></div><Link className="section-link" href="/learn#labs">All labs <ArrowRight size={15} /></Link></div><div className="lab-list">{labs.map(({ title, meta, icon: Icon, color }, index) => <Link className="lab-row" href={`/labs/${index + 1}`} key={title}><span className={`lab-icon ${color}`}><Icon size={18} /></span><span className="lab-title"><strong>{title}</strong><small>{meta}</small></span><span className="lab-planned">START</span><span className="lab-open"><ArrowRight size={13} /></span></Link>)}</div></section>
          <section className="bottom-note"><ShieldCheck size={17} /><span>NetLab runs locally. Ping simulation currently supports hosts on a shared subnet.</span><span className="bottom-note-tail">BUILD / SIMULATE / DEBUG</span></section>
        </div>
      </main>
    </div>
  );
}