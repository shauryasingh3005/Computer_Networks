import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Calculator, ChevronRight, Layers3, Network, Waypoints } from "lucide-react";
import AttackSimulation from "./attack-simulations";

const categories = [
  { id: "01", title: "Category 1", status: "pending" },
  { id: "02", title: "Network-layer attacks", status: "ready" },
  { id: "03", title: "Denial-of-Service attacks", status: "ready" },
  { id: "04", title: "Category 4", status: "pending" },
  { id: "05", title: "Category 5", status: "pending" },
  { id: "06", title: "Category 6", status: "pending" },
  { id: "07", title: "Category 7", status: "pending" },
];

const networkAttacks = [
  { name: "IP Spoofing", how: "Forges a packet's source IP address so it appears to come from another machine.", prevention: "Ingress and egress filtering, ACLs, and anti-spoofing rules." },
  { name: "ARP Spoofing / Poisoning", how: "Sends false ARP responses to associate the attacker's MAC address with another device's IP.", prevention: "Dynamic ARP Inspection, DHCP snooping, and static ARP for special cases." },
  { name: "MAC Flooding", how: "Overloads a switch's MAC address table with many source addresses.", prevention: "Port security and MAC address limits." },
  { name: "MAC Spoofing", how: "Changes a device's MAC address to impersonate another device.", prevention: "802.1X authentication and network access control." },
  { name: "ICMP Flood", how: "Overwhelms a target with a high volume of ICMP packets.", prevention: "Rate limiting, filtering, and DDoS protection." },
  { name: "IP Fragmentation Attack", how: "Uses malformed or overlapping fragments to target packet reassembly.", prevention: "Fragment validation, current firewalls, and OS patches." },
  { name: "Packet Sniffing", how: "Captures network traffic in an attempt to extract sensitive information.", prevention: "Encrypt traffic with TLS, SSH, WPA3, and other secure protocols." },
  { name: "Packet Injection", how: "Inserts packets into a communication stream.", prevention: "Authentication, encryption, and sequence validation." },
  { name: "Routing Table Poisoning", how: "Manipulates routing information to divert traffic.", prevention: "Route authentication, filtering, and secure routing configuration." },
  { name: "Man-in-the-Middle (MITM)", how: "Intercepts communication between two parties, potentially allowing traffic to be read or changed.", prevention: "TLS, certificate validation, and mutual authentication." },
];

const dosAttacks = [
  { name: "DoS", how: "A single source overwhelms a target service or network.", prevention: "Rate limiting, filtering, and resource limits." },
  { name: "DDoS", how: "Multiple distributed devices overwhelm a target at the same time.", prevention: "DDoS protection, CDNs, and traffic scrubbing." },
  { name: "SYN Flood", how: "Sends TCP SYN requests without completing the handshake, consuming pending connection resources.", prevention: "SYN cookies, connection management, rate limiting, and upstream filtering." },
  { name: "UDP Flood", how: "Sends large volumes of UDP packets to consume network or service resources.", prevention: "Rate limiting, filtering, and upstream mitigation." },
  { name: "HTTP Flood", how: "Overwhelms a web server with application-level requests.", prevention: "WAF, bot detection, caching, and rate limiting." },
  { name: "Slowloris", how: "Keeps HTTP connections open by sending request data very slowly.", prevention: "Connection timeouts, reverse proxies, and request limits." },
  { name: "DNS Amplification", how: "Abuses open DNS resolvers to amplify traffic directed at a victim.", prevention: "Restrict recursive DNS, use response rate limiting, and apply anti-spoofing controls." },
  { name: "Ping of Death", how: "Historically exploited oversized or malformed IP packets.", prevention: "Current OS updates and packet validation." },
  { name: "Smurf Attack", how: "Abuses ICMP broadcast responses to amplify traffic toward a target.", prevention: "Disable directed broadcasts and use ingress filtering." },
];

export default function LearnPage() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="NetLab home"><span className="brand-mark"><Network size={19} strokeWidth={2.2} /></span><span>netlab<span className="brand-period">.</span></span></Link>
        <div className="sidebar-label">Workspace</div>
        <nav className="side-nav" aria-label="Main navigation"><Link className="nav-link" href="/"><Layers3 size={17} strokeWidth={1.8} /><span>Overview</span></Link><Link className="nav-link active" href="/learn"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link><Link className="nav-link" href="/builder"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link><Link className="nav-link" href="/builder#simulation"><Waypoints size={17} strokeWidth={1.8} /><span>Simulations</span></Link><Link className="nav-link" href="/debugging"><AlertTriangle size={17} /><span>Troubleshoot</span></Link><Link className="nav-link" href="#categories"><Layers3 size={17} strokeWidth={1.8} /><span>Attack categories</span></Link></nav>
        <Link className="nav-link reference-nav" href="/subnet"><Calculator size={17} /><span>Subnet calculator</span></Link>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local workspace</div><div className="sidebar-version">NETLAB / 0.1.0</div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><Link href="/">Workspace</Link><ChevronRight size={14} /><strong>Learn</strong></div><div className="topbar-right"><span className="environment-pill"><span className="status-dot" />Attack library</span></div></header>
        <div className="page-content learn-content">
          <div className="eyebrow"><span className="eyebrow-line" />NETWORK SECURITY / ATTACKS & DEFENSES</div>
          <section className="learn-intro attack-intro"><div><h1 className="learn-title">Know the attack.<br /><span>Understand the defense.</span></h1><p className="welcome-copy">Explore how common network attacks work, what they put at risk, and the controls that help prevent them.</p></div><div className="learn-count"><span>02 / 07</span><small>CATEGORIES DETAILED</small></div></section>

          <section className="attack-category-index" id="categories" aria-labelledby="category-index-title">
            <div className="section-heading"><div><div className="section-kicker">ATTACK LIBRARY</div><h2 id="category-index-title">Seven categories</h2></div><span className="lab-guide-note">Two categories detailed</span></div>
            <div className="category-index-grid">{categories.map((category) => category.status === "ready" ? <a className="category-index-item ready" href={`#category-${category.id}`} key={category.id}><span className="category-index-number">{category.id}</span><span className="category-index-title">{category.title}</span><ArrowRight size={14} /></a> : <div className="category-index-item pending" key={category.id}><span className="category-index-number">{category.id}</span><span className="category-index-title">{category.title}</span><small>CONTENT PENDING</small></div>)}</div>
          </section>

          <section className="attack-category" id="category-02" aria-labelledby="network-attacks-title">
            <div className="attack-category-heading"><div><div className="section-kicker">CATEGORY 02</div><h2 id="network-attacks-title">Network-layer attacks</h2><p>Attacks that target communication between devices, routers, and networks.</p></div><span className="attack-count">10 ATTACKS</span></div>
            <div className="attack-list" role="list" aria-label="Network-layer attacks">{networkAttacks.map((attack) => <article className="attack-row" role="listitem" key={attack.name}><h3>{attack.name}</h3><div className="attack-cell"><span>HOW IT WORKS</span><p>{attack.how}</p></div><div className="attack-cell"><span>PREVENTION</span><p>{attack.prevention}</p></div></article>)}</div>
            <AttackSimulation mode="network" />
            <div className="important-attacks"><div className="section-heading"><div><div className="section-kicker">IMPORTANT ATTACKS TO UNDERSTAND</div><h3>When local traffic is no longer private</h3></div></div>
              <div className="attack-explainer-grid">
                <article className="attack-explainer"><div className="explainer-number">01 / ARP</div><h4>ARP Poisoning</h4><p>Host A wants to reach Host B. An attacker sends a false ARP response claiming the attacker&apos;s MAC address belongs to B&apos;s IP address. Traffic may then be redirected through the attacker.</p><div className="traffic-path" aria-label="Host A traffic is redirected through an attacker before reaching Host B"><span>HOST A</span><ArrowRight size={14} /><strong>ATTACKER</strong><ArrowRight size={14} /><span>HOST B</span></div></article>
                <article className="attack-explainer"><div className="explainer-number">02 / INTERCEPTION</div><h4>Man-in-the-Middle</h4><p>A thinks communication is direct with B, while an attacker secretly relays it. Without adequate protection, the attacker may read or manipulate traffic.</p><div className="mitm-path"><span>A</span><i /><strong>INTERCEPT</strong><i /><span>B</span></div></article>
                <article className="attack-explainer"><div className="explainer-number">03 / ADDRESSING</div><h4>IP Spoofing</h4><p>A packet&apos;s source IP address is forged to make it appear as though it originated from another machine. Filtering helps prevent forged packets from entering or leaving a network.</p><div className="explainer-control"><AlertTriangle size={15} /><span>Check source addresses at network boundaries.</span></div></article>
              </div>
            </div>
          </section>

          <section className="attack-category" id="category-03" aria-labelledby="dos-attacks-title">
            <div className="attack-category-heading"><div><div className="section-kicker">CATEGORY 03</div><h2 id="dos-attacks-title">Denial-of-Service attacks</h2><p>The objective is to make a server, network, or service unavailable to legitimate users.</p></div><span className="attack-count">9 ATTACKS</span></div>
            <div className="attack-list" role="list" aria-label="Denial-of-Service attacks">{dosAttacks.map((attack) => <article className="attack-row" role="listitem" key={attack.name}><h3>{attack.name}</h3><div className="attack-cell"><span>HOW IT WORKS</span><p>{attack.how}</p></div><div className="attack-cell"><span>PREVENTION</span><p>{attack.prevention}</p></div></article>)}</div>
            <AttackSimulation mode="dos" />
            <article className="syn-explainer"><div className="syn-copy"><div className="section-kicker">IMPORTANT ATTACK TO UNDERSTAND</div><h3>Inside a SYN flood</h3><p>TCP normally completes a three-step handshake before a connection is established. In a SYN flood, many requests stop before the final step, leaving pending connection resources occupied.</p><div className="syn-prevention"><strong>DEFENSE</strong><span>SYN cookies, connection management, rate limiting, and upstream filtering.</span></div></div><div className="handshake" aria-label="TCP handshake compared with incomplete SYN flood requests"><div className="handshake-label">NORMAL TCP HANDSHAKE</div><div className="handshake-step"><span>CLIENT</span><b>SYN</b><span>SERVER</span></div><div className="handshake-step"><span>CLIENT</span><b>SYN-ACK</b><span>SERVER</span></div><div className="handshake-step complete"><span>CLIENT</span><b>ACK</b><span>SERVER</span></div><div className="handshake-label flood-label">SYN FLOOD</div><div className="flood-step"><span>MANY REQUESTS</span><b>SYN</b><span>PENDING</span></div></div></article>
          </section>

          <footer className="learn-footer"><span>Attack categories 1 and 4–7 are ready for their content.</span><Link href="/">Back to overview <ArrowRight size={14} /></Link></footer>
        </div>
      </main>
    </div>
  );
}