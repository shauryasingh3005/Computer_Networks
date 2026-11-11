import Link from "next/link";
import { Fragment } from "react";
import { AlertTriangle, ArrowRight, BookOpen, Calculator, ChevronRight, Layers3, Network, Waypoints } from "lucide-react";
import AttackSimulation from "./attack-simulations";

const categories = [
  { id: "01", title: "Application-layer attacks", status: "ready" },
  { id: "02", title: "Network-layer attacks", status: "ready" },
  { id: "03", title: "Denial-of-Service attacks", status: "ready" },
  { id: "04", title: "DNS attacks", status: "ready" },
  { id: "05", title: "Wireless network attacks", status: "ready" },
  { id: "06", title: "Transport-layer attacks", status: "ready" },
  { id: "07", title: "Routing and switching attacks", status: "ready" },
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

const dnsAttacks = [
  { name: "DNS Spoofing", how: "Returns false DNS data to misdirect a domain lookup.", prevention: "Validate DNSSEC signatures and use trusted resolvers." },
  { name: "DNS Cache Poisoning", how: "Adds malicious records to a resolver cache so later lookups return an incorrect address.", prevention: "Enable DNSSEC validation and secure resolver configuration." },
  { name: "DNS Hijacking", how: "Changes a device or network's DNS settings to redirect lookups.", prevention: "Secure router administration with MFA and monitor DNS settings." },
  { name: "DNS Tunnelling", how: "Encodes data in DNS queries and responses to evade normal network controls.", prevention: "Inspect DNS traffic, detect anomalies, and apply restrictive DNS policies." },
  { name: "DNS Amplification", how: "Abuses open resolvers to send amplified responses toward a target.", prevention: "Disable open recursion and apply response rate limiting." },
  { name: "DNS Flood", how: "Sends excessive queries to overwhelm DNS infrastructure.", prevention: "Rate limiting, redundant DNS servers, and DDoS mitigation." },
  { name: "NXDOMAIN Attack", how: "Floods a DNS server with requests for nonexistent domain names.", prevention: "Query rate limiting, caching, and anomaly detection." },
];

const wirelessAttacks = [
  { name: "Evil Twin Attack", how: "A fake Wi-Fi access point imitates a trusted network to lure users into connecting.", prevention: "WPA3-Enterprise, certificate validation, and trusted access points." },
  { name: "Deauthentication Attack", how: "Forged management frames attempt to disconnect wireless clients.", prevention: "Protected Management Frames (802.11w) and WPA3." },
  { name: "Wi-Fi Password Cracking", how: "Attempts to guess or recover a wireless network's password, especially when it is weak.", prevention: "Use strong passwords and WPA3, and disable WPS." },
  { name: "Rogue Access Point", how: "An unauthorized access point is connected to or operated near a protected network.", prevention: "Wireless IDS/IPS and access-point monitoring." },
  { name: "Packet Sniffing", how: "Captures wireless traffic that may be exposed on an untrusted or inadequately protected network.", prevention: "Use WPA2/WPA3 encryption and TLS for application traffic." },
  { name: "KRACK", how: "Targets weaknesses in vulnerable WPA2 handshake implementations.", prevention: "Install updates for devices and patched Wi-Fi implementations." },
  { name: "Wireless Jamming", how: "Interferes with radio frequencies to disrupt wireless communication.", prevention: "Spectrum monitoring, channel planning, and network redundancy." },
  { name: "Wardriving", how: "Searches for nearby wireless networks to assess their security.", prevention: "Use strong encryption and secure access-point configuration." },
];

const additionalCategories = [
  {
    id: "01",
    title: "Application-layer attacks",
    description: "Attacks against applications and services, especially HTTP-based systems.",
    attacks: [
      { name: "SQL Injection", how: "Adds unintended input to database queries.", prevention: "Parameterized queries and input validation." },
      { name: "Cross-Site Scripting (XSS)", how: "Injects script content into pages viewed by other users.", prevention: "Output encoding, sanitization, and Content Security Policy." },
      { name: "Cross-Site Request Forgery (CSRF)", how: "Tricks a logged-in user's browser into making an unintended request.", prevention: "CSRF tokens and SameSite cookies." },
      { name: "Server-Side Request Forgery (SSRF)", how: "Tricks a server into making unintended network requests.", prevention: "Destination allowlists and network egress controls." },
      { name: "HTTP Request Smuggling", how: "Exploits differences in how HTTP components parse request boundaries.", prevention: "Consistent HTTP parsing and patched proxies and servers." },
    ],
  },
  {
    id: "06",
    title: "Transport-layer attacks",
    description: "Attacks that exploit TCP, UDP, and transport connection or session handling.",
    attacks: [
      { name: "TCP SYN Flood", how: "Creates many incomplete TCP connection requests that consume pending connection resources.", prevention: "SYN cookies, connection limits, and firewall rules." },
      { name: "TCP Session Hijacking", how: "Attempts to take over an established TCP session.", prevention: "TLS, secure session management, and unpredictable sequence numbers." },
      { name: "TCP Reset Attack", how: "Injects forged TCP reset packets to terminate a connection.", prevention: "TCP authentication and protected connections." },
      { name: "TCP Sequence Prediction", how: "Attempts to predict sequence numbers to inject data into a connection.", prevention: "Modern TCP implementations, randomized initial sequence numbers, and TLS." },
      { name: "UDP Flood", how: "Overwhelms a target with UDP traffic.", prevention: "Firewall filtering and rate limiting." },
    ],
  },
  {
    id: "07",
    title: "Routing and switching attacks",
    description: "Attacks that target routing protocols, switches, and network segmentation.",
    attacks: [
      { name: "BGP Hijacking", how: "Announces unauthorized IP prefixes to divert internet traffic.", prevention: "RPKI, route-origin validation, and prefix filtering." },
      { name: "BGP Route Leak", how: "Improperly propagates routes to other networks.", prevention: "Routing policies, route filtering, and monitoring." },
      { name: "RIP Poisoning", how: "Manipulates routing updates to disrupt route selection.", prevention: "Authentication, route filtering, and secure configuration." },
      { name: "OSPF Attacks", how: "Attempts to inject or manipulate routing information.", prevention: "OSPF authentication, trusted adjacencies, and filtering." },
      { name: "VLAN Hopping", how: "Attempts to reach traffic in another VLAN by exploiting switch-port misconfiguration.", prevention: "Disable unused trunking, configure native VLANs explicitly, and harden switches." },
    ],
  },
];

function AttackCategorySection({ category }: { category: (typeof additionalCategories)[number] }) {
  return (
    <section className="attack-category" id={`category-${category.id}`} aria-labelledby={`category-${category.id}-title`}>
      <div className="attack-category-heading"><div><div className="section-kicker">CATEGORY {category.id}</div><h2 id={`category-${category.id}-title`}>{category.title}</h2><p>{category.description}</p></div><span className="attack-count">{category.attacks.length} ATTACKS</span></div>
      <div className="attack-list" role="list" aria-label={category.title}>
        {category.attacks.map((attack) => <article className="attack-row" role="listitem" key={attack.name}><h3>{attack.name}</h3><div className="attack-cell"><span>HOW IT WORKS</span><p>{attack.how}</p></div><div className="attack-cell"><span>PREVENTION</span><p>{attack.prevention}</p></div></article>)}
      </div>
    </section>
  );
}

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
          <section className="learn-intro attack-intro"><div><h1 className="learn-title">Know the attack.<br /><span>Understand the defense.</span></h1><p className="welcome-copy">Explore how common network attacks work, what they put at risk, and the controls that help prevent them.</p></div><div className="learn-count"><span>07 / 07</span><small>ATTACK CATEGORIES DETAILED</small></div></section>

          <section className="attack-category-index" id="categories" aria-labelledby="category-index-title">
            <div className="section-heading"><div><div className="section-kicker">ATTACK LIBRARY</div><h2 id="category-index-title">Seven attack categories</h2></div><span className="lab-guide-note">Seven categories detailed</span></div>
            <div className="category-index-grid">{categories.map((category) => category.status === "ready" ? <a className="category-index-item ready" href={`#category-${category.id}`} key={category.id}><span className="category-index-number">{category.id}</span><span className="category-index-title">{category.title}</span><ArrowRight size={14} /></a> : <div className="category-index-item pending" key={category.id}><span className="category-index-number">{category.id}</span><span className="category-index-title">{category.title}</span><small>CONTENT PENDING</small></div>)}</div>
          </section>

          <AttackCategorySection category={additionalCategories[0]} />
          <AttackSimulation mode="application" />

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

          <section className="attack-category" id="category-04" aria-labelledby="dns-attacks-title">
            <div className="attack-category-heading"><div><div className="section-kicker">CATEGORY 04</div><h2 id="dns-attacks-title">DNS attacks</h2><p>Attacks that exploit name resolution to redirect users, hide activity, or disrupt DNS availability.</p></div><span className="attack-count">{dnsAttacks.length} ATTACKS</span></div>
            <div className="attack-list" role="list" aria-label="DNS attacks">{dnsAttacks.map((attack) => <article className="attack-row" role="listitem" key={attack.name}><h3>{attack.name}</h3><div className="attack-cell"><span>HOW IT WORKS</span><p>{attack.how}</p></div><div className="attack-cell"><span>PREVENTION</span><p>{attack.prevention}</p></div></article>)}</div>
            <AttackSimulation mode="dns" />
            <div className="important-attacks"><div className="section-heading"><div><div className="section-kicker">IMPORTANT ATTACK TO UNDERSTAND</div><h3>When a DNS answer cannot be trusted</h3></div></div>
              <div className="attack-explainer-grid">
                <article className="attack-explainer"><div className="explainer-number">04 / DNS</div><h4>DNS Cache Poisoning</h4><p>A resolver should return the legitimate address for a domain. If a false record enters its cache, users may be directed to an attacker-controlled destination instead. DNSSEC validation helps a resolver verify signed DNS data.</p><div className="explainer-control"><BookOpen size={14} /><span>Further reading: <a href="https://images.openai.com/static-rsc-4/BHkEW4uXkmThTSJlwakD4F5Fy17_5IrgmyJdZvga6Xq_Ig04bV0YEogqEJtCYDTiQlvlSTv8HLCdRWdaWqV_eei616OfYlOvAfNQLyGytgU-u9WgShFWVYioSAek5k80Madw__211cMViMumPg77PqIJL8lkSNoDsv4zWVVYAiI?purpose=inline" target="_blank" rel="noreferrer">DNS spoofing and cache poisoning</a>; <a href="https://images.openai.com/static-rsc-4/hWpsSg-8Qbi_oGx6VXg5OMgbXrOoam0e7Fx4d1jbE-32r1yprmoiZ0LcZHQt2okQIvKUFMIdq6cHn8gBJAIg5YEKpe4HbNKkDlCSgesaw_g0S0EHxMtCU955uAeTLvcvI3QB3RJd3FvPyVewHtsnEIdiU20pWQ7X3eNtYHf7pRM?purpose=inline" target="_blank" rel="noreferrer">DNS tunnelling</a>; <a href="https://images.openai.com/static-rsc-4/BuXkBAbgDmCGsye3xtLMO4e_vnf2LHZs1dMydAm3ugjfvRRIPgRluCD9fJ909QESHnsCSFTBqja3qrx2E9Uye5ZF2SDXgQK2POdhnkMLRHFr5uqYW3fqTLInz4LCx-Dc3URVtrMNQTwqZ_I-omMaE14SmIstQjkhyCqF59VDPs?purpose=inline" target="_blank" rel="noreferrer">F5 Labs DNS overview</a>.</span></div></article>
              </div>
            </div>
          </section>

          <section className="attack-category" id="category-05" aria-labelledby="wireless-attacks-title">
            <div className="attack-category-heading"><div><div className="section-kicker">CATEGORY 05</div><h2 id="wireless-attacks-title">Wireless network attacks</h2><p>Attacks that target Wi-Fi access points, radio communication, and wireless clients.</p></div><span className="attack-count">{wirelessAttacks.length} ATTACKS</span></div>
            <div className="attack-list" role="list" aria-label="Wireless network attacks">{wirelessAttacks.map((attack) => <article className="attack-row" role="listitem" key={attack.name}><h3>{attack.name}</h3><div className="attack-cell"><span>HOW IT WORKS</span><p>{attack.how}</p></div><div className="attack-cell"><span>PREVENTION</span><p>{attack.prevention}</p></div></article>)}</div>
            <AttackSimulation mode="wireless" />
            <div className="important-attacks"><div className="section-heading"><div><div className="section-kicker">IMPORTANT ATTACK TO UNDERSTAND</div><h3>Check the access point before connecting</h3></div></div>
              <div className="attack-explainer-grid">
                <article className="attack-explainer"><div className="explainer-number">05 / WI-FI</div><h4>Evil Twin Attack</h4><p>A fake access point may copy a familiar network name, such as Campus-WiFi. A user who connects to it may expose traffic or credentials, especially if they bypass certificate warnings or use an untrusted sign-in page. Verify the network identity before connecting.</p><div className="explainer-control"><BookOpen size={14} /><span>Further reading: <a href="https://images.openai.com/static-rsc-4/D3e6r8EXM2yEgvR9vxSi-PR_5tJ9xdXK9lfku6cT2D8N329PhcPco8eLVkw2EmGZoquedJi7zAwmaFj8zofdfX8BEc1AIaz0D2G12LY3rbhfOycZ6q6I1uKMJSVNdgAE1bzY7O-hjByBZxcYY3iUbFCKfAYygZVi82RspAJGQq4?purpose=inline" target="_blank" rel="noreferrer">Evil Twin attacks</a>; <a href="https://images.openai.com/static-rsc-4/03La7WYoRVFYpbvFSs8tZgbAoJhclEJjURhtzsOlLpMhTsJbl2Ckfr4uvy-XUMBQE1-HfZ_Q_C-bf6tU4-qHqXXzB0oj1Cf24aTvSMwRTG3CRDTR87UeYMbqx8NIDMDCSC43Q4UXPwc4l0EBwxnbb3Hqb1CFe-qeBfj0adOhX6Y?purpose=inline" target="_blank" rel="noreferrer">wireless network security</a>; <a href="https://images.openai.com/static-rsc-4/Of7pQ9FszoMZwN9jJW-RdN_TEq7waYAiij7x-sZ44zOohoRNmLGSWz-SMDAMeOaE9hXlz5qbQgr0Qj3En0VeNZc7un2rgYBCNqk_Wuc8QD6EdusZfi_4fZvpPUU_tCQc4ZU7EizZAp-zaXHtI-lUBzcacUB55Unt4C6rsQKl13g?purpose=inline" target="_blank" rel="noreferrer">VPN overview</a>.</span></div></article>
              </div>
            </div>
          </section>

          {additionalCategories.slice(1).map((category) => (
            <Fragment key={category.id}>
              <AttackCategorySection category={category} />
              {category.id === "06" && <AttackSimulation mode="transport" />}
              {category.id === "07" && <AttackSimulation mode="routing" />}
            </Fragment>
          ))}

          <footer className="learn-footer"><span>All seven attack categories are detailed.</span><Link href="/">Back to overview <ArrowRight size={14} /></Link></footer>
        </div>
      </main>
    </div>
  );
}