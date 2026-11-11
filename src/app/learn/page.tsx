import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Cable, Calculator, ChevronRight, CircleCheck, Layers3, Network, Router, Server, Waypoints } from "lucide-react";

const modules = [
  { id: "01", title: "Network fundamentals", subtitle: "How devices connect and communicate", topics: ["Network components", "Topologies", "Performance & delay"], icon: Network, color: "mint" },
  { id: "02", title: "Application layer", subtitle: "Protocols people and programs use", topics: ["Client-server model", "HTTP requests", "DNS lookup"], icon: Server, color: "orange" },
  { id: "03", title: "Transport layer", subtitle: "Communication between processes", topics: ["Ports & multiplexing", "TCP reliability", "UDP datagrams"], icon: Waypoints, color: "blue" },
  { id: "04", title: "Network layer", subtitle: "Addressing and moving packets", topics: ["IPv4 & subnetting", "Routing tables", "ICMP & TTL"], icon: Router, color: "pink" },
  { id: "05", title: "Data link layer", subtitle: "Frames on a shared local network", topics: ["Ethernet & MAC", "ARP resolution", "Switching"], icon: Cable, color: "yellow" },
  { id: "06", title: "Network access", subtitle: "Signals, links, and capacity", topics: ["Bandwidth & throughput", "Propagation delay", "Loss & queues"], icon: Layers3, color: "mint" },
];

const labs = [
  { id: "1", title: "Inspect ARP and ping", meta: "Observe hosts through a switch", concepts: "Ethernet · ARP · ICMP" },
  { id: "2", title: "Calculate an IPv4 subnet", meta: "Find the network and usable range", concepts: "IPv4 · CIDR · Subnetting" },
  { id: "3", title: "Follow longest-prefix routing", meta: "Choose a next hop from a route table", concepts: "Static routes · LPM" },
  { id: "4", title: "Trace a TCP handshake", meta: "Follow SYN, SYN-ACK, and ACK", concepts: "TCP · Ports · State" },
];

export default function LearnPage() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} strokeWidth={2.2} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation"><Link className="nav-link" href="/"><Layers3 size={17} strokeWidth={1.8} /><span>Overview</span></Link><Link className="nav-link active" href="/learn"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link><Link className="nav-link" href="/builder"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link><Link className="nav-link" href="/builder#simulation"><Waypoints size={17} strokeWidth={1.8} /><span>Simulations</span></Link><Link className="nav-link" href="/debugging"><AlertTriangle size={17} /><span>Troubleshoot</span></Link><Link className="nav-link" href="#labs"><Layers3 size={17} strokeWidth={1.8} /><span>Guided labs</span></Link></nav>
        <Link className="nav-link reference-nav" href="/subnet"><Calculator size={17} /><span>Subnet calculator</span></Link>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local workspace</div><div className="sidebar-version">NETLAB / 0.1.0</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><ChevronRight size={14} /><strong>Learn</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Learning path</span></div></header>
        <div className="page-content learn-content">
          <div className="eyebrow"><span className="eyebrow-line" />THE NETWORK, LAYER BY LAYER</div>
          <section className="learn-intro"><div><h1 className="learn-title">Understand what<br /><span>happens on the wire.</span></h1><p className="welcome-copy">Start with the building blocks. Each module connects the concept to a small experiment you can inspect and reason about.</p></div><div className="learn-count"><span>01—06</span><small>CORE MODULES</small></div></section>
          <section className="module-grid" aria-label="Learning modules">{modules.map(({ id, title, subtitle, topics, icon: Icon, color }) => <article className="module-card" id={`module-${id}`} key={id}><div className="module-top"><span className={`module-icon ${color}`}><Icon size={19} /></span><span className="module-number">MODULE {id}</span></div><h2>{title}</h2><p>{subtitle}</p><ul>{topics.map((topic) => <li key={topic}><CircleCheck size={14} />{topic}</li>)}</ul><Link href="#labs" className="module-link">Explore lab sequence <ArrowRight size={15} /></Link></article>)}</section>
          <section className="lab-guide" id="labs"><div className="section-heading"><div><div className="section-kicker">PRACTICE THE THEORY</div><h2>Lab sequence</h2></div><span className="lab-guide-note">Four interactive activities</span></div><div className="lab-guide-list">{labs.map((lab) => <Link className="lab-guide-row" href={`/labs/${lab.id}`} id={`lab-${lab.id}`} key={lab.id}><span className="lab-guide-number">{lab.id.padStart(2, "0")}</span><span className="lab-guide-copy"><strong>{lab.title}</strong><small>{lab.meta} · {lab.concepts}</small></span><span className="lab-launch">START LAB <ArrowRight size={13} /></span></Link>)}</div></section>
          <footer className="learn-footer" id="about"><span>Learning modules and interactive labs will grow alongside the simulation engine.</span><Link href="/">Back to overview <ArrowRight size={14} /></Link></footer>
          <span id="glossary" />
        </div>
      </main>
    </div>
  );
}