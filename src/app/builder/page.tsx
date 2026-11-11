"use client";

import "@xyflow/react/dist/style.css";
import {
  addEdge, Background, Controls, Handle, MiniMap, Position, ReactFlow,
  useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { Activity, ArrowLeft, Cable, CircleAlert, CircleCheck, Cpu, Network, Play, Plus, Router, Server, StepForward, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NetworkSimulator } from "@/simulation/engine";
import type { DeviceType, PingResult, SimTopology, SimulationEvent } from "@/simulation/types";

type DeviceData = {
  name: string;
  type: DeviceType;
  ipAddress: string;
  subnetMask: string;
  macAddress: string;
};
type DeviceNode = Node<DeviceData, "device">;
type LinkData = { up: boolean; delayMs: number };
type NetworkEdge = Edge<LinkData>;

const deviceMeta: Record<DeviceType, { label: string; icon: typeof Cpu; color: string }> = {
  host: { label: "Host", icon: Cpu, color: "host" },
  router: { label: "Router", icon: Router, color: "router" },
  switch: { label: "Switch", icon: Network, color: "switch" },
  server: { label: "Server", icon: Server, color: "server" },
};

const initialNodes: DeviceNode[] = [
  { id: "pc-a", type: "device", position: { x: 90, y: 145 }, data: { name: "PC-A", type: "host", ipAddress: "192.168.1.10", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:01" } },
  { id: "sw-1", type: "device", position: { x: 370, y: 145 }, data: { name: "SW-1", type: "switch", ipAddress: "192.168.1.2", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:02" } },
  { id: "pc-b", type: "device", position: { x: 650, y: 145 }, data: { name: "PC-B", type: "host", ipAddress: "192.168.1.20", subnetMask: "255.255.255.0", macAddress: "02:00:00:00:00:03" } },
];

const initialEdges: NetworkEdge[] = [
  { id: "pc-a-sw-1", source: "pc-a", target: "sw-1", type: "smoothstep", data: { up: true, delayMs: 2 }, label: "2 ms" },
  { id: "sw-1-pc-b", source: "sw-1", target: "pc-b", type: "smoothstep", data: { up: true, delayMs: 3 }, label: "3 ms" },
];

function DeviceCard({ data, selected }: NodeProps<DeviceNode>) {
  const { icon: Icon, label, color } = deviceMeta[data.type];
  return (
    <div className={`device-card device-${color}${selected ? " device-selected" : ""}`}>
      <Handle type="target" position={Position.Left} />
      <div className="device-card-icon"><Icon size={18} /></div>
      <div className="device-card-copy"><strong>{data.name}</strong><small>{label} · {data.ipAddress}</small></div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { device: DeviceCard };

const eventLabels: Record<SimulationEvent["kind"], string> = {
  "packet-created": "Packet created",
  "arp-request": "ARP request",
  "arp-response": "ARP reply",
  "frame-forwarded": "Frame forwarded",
  "icmp-echo-request": "ICMP echo request",
  "icmp-echo-reply": "ICMP echo reply",
  "tcp-syn": "TCP SYN",
  "tcp-syn-ack": "TCP SYN-ACK",
  "tcp-ack": "TCP ACK",
  "tcp-established": "TCP connection established",
  "packet-delivered": "Packet delivered",
  "packet-dropped": "Packet dropped",
};

export default function BuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<DeviceNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<NetworkEdge>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [sourceId, setSourceId] = useState("pc-a");
  const [destinationId, setDestinationId] = useState("pc-b");
  const [result, setResult] = useState<PingResult>();
  const [visibleCount, setVisibleCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeEvent, setActiveEvent] = useState<SimulationEvent>();
  const simulator = useRef(new NetworkSimulator());
  const nodeIdCounter = useRef(4);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
  const displayedEvents = result?.events.slice(0, visibleCount) ?? [];
  const canPlay = Boolean(result && visibleCount < result.events.length);

  const topology = useMemo<SimTopology>(() => ({
    devices: nodes.map((node) => ({ id: node.id, ...node.data })),
    links: edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      up: edge.data?.up ?? true,
      delayMs: edge.data?.delayMs ?? 2,
    })),
  }), [edges, nodes]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const newEdge: NetworkEdge = {
      ...connection,
      id: `${connection.source}-${connection.target}-${Date.now()}`,
      type: "smoothstep",
      data: { up: true, delayMs: 2 },
      label: "2 ms",
    };
    setEdges((current) => addEdge(newEdge, current) as NetworkEdge[]);
    resetSimulation();
  }, [setEdges]);

  function resetSimulation() {
    setPlaying(false);
    setVisibleCount(0);
    setResult(undefined);
    setActiveEvent(undefined);
    simulator.current.clearArpCache();
  }

  function addDevice(type: DeviceType) {
    const index = nodeIdCounter.current++;
    const id = `${type}-${index}`;
    const typeLabel = deviceMeta[type].label;
    const octet = 30 + index;
    const nextNode: DeviceNode = {
      id,
      type: "device",
      position: { x: 120 + ((index - 1) % 3) * 225, y: 285 + Math.floor((index - 1) / 3) * 120 },
      data: {
        name: `${typeLabel}-${index - 1}`,
        type,
        ipAddress: `192.168.1.${octet}`,
        subnetMask: "255.255.255.0",
        macAddress: `02:00:00:00:00:${String(index).padStart(2, "0")}`,
      },
    };
    setNodes((current) => [...current, nextNode]);
    setSelectedNodeId(id);
    setSelectedEdgeId(undefined);
    resetSimulation();
  }

  function updateDevice(field: keyof DeviceData, value: string) {
    if (!selectedNodeId) return;
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data: { ...node.data, [field]: value } } : node));
    resetSimulation();
  }

  function runPing() {
    const next = simulator.current.ping(topology, sourceId, destinationId);
    setResult(next);
    setVisibleCount(Math.min(1, next.events.length));
    setActiveEvent(next.events[0]);
    setPlaying(false);
    setSelectedNodeId(undefined);
    setSelectedEdgeId(undefined);
  }

  const advance = useCallback(() => {
    if (!result) return;
    const nextCount = Math.min(visibleCount + 1, result.events.length);
    setVisibleCount(nextCount);
    setActiveEvent(result.events[nextCount - 1]);
    if (nextCount >= result.events.length) setPlaying(false);
  }, [result, visibleCount]);

  useEffect(() => {
    if (!playing || !result) return;
    const previousTime = result.events[visibleCount - 1]?.timeMs ?? 0;
    const nextTime = result.events[visibleCount]?.timeMs ?? previousTime;
    const delay = Math.min(900, Math.max(220, (nextTime - previousTime) * 120 / speed));
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [advance, playing, result, speed, visibleCount]);

  const activeDeviceName = activeEvent?.deviceId ? nodes.find((node) => node.id === activeEvent.deviceId)?.data.name : undefined;

  return (
    <div className="builder-shell">
      <header className="builder-topbar">
        <Link className="builder-back" href="/"><ArrowLeft size={16} /><span>NetLab</span></Link>
        <div className="builder-title"><strong>Network builder</strong><span>Untitled topology</span></div>
        <div className="builder-top-status"><span className="status-dot" />LOCAL SIMULATION</div>
      </header>

      <div className="builder-workspace">
        <aside className="builder-tools">
          <div className="builder-panel-heading"><div><span className="section-kicker">TOPOLOGY</span><h1>Devices</h1></div><span className="device-count">{nodes.length}</span></div>
          <div className="add-device-grid">
            {(["host", "switch", "router", "server"] as DeviceType[]).map((type) => {
              const { icon: Icon, label } = deviceMeta[type];
              return <button className="add-device" key={type} onClick={() => addDevice(type)} title={`Add ${label}`}><Icon size={16} /><span>{label}</span><Plus size={13} className="add-plus" /></button>;
            })}
          </div>
          <div className="builder-divider" />
          <div className="builder-panel-heading compact"><div><span className="section-kicker">SIMULATION</span><h2>Ping test</h2></div></div>
          <label className="field-label" htmlFor="ping-source">Source device</label>
          <select id="ping-source" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>{nodes.filter((node) => node.data.type !== "switch").map((node) => <option key={node.id} value={node.id}>{node.data.name} · {node.data.ipAddress}</option>)}</select>
          <label className="field-label" htmlFor="ping-destination">Destination device</label>
          <select id="ping-destination" value={destinationId} onChange={(event) => setDestinationId(event.target.value)}>{nodes.filter((node) => node.data.type !== "switch").map((node) => <option key={node.id} value={node.id}>{node.data.name} · {node.data.ipAddress}</option>)}</select>
          <button className="button button-primary run-ping" onClick={runPing}><Activity size={15} /> Run ping</button>
          {result && <div className={`ping-result ${result.reachable ? "success" : "failure"}`}>{result.reachable ? <CircleCheck size={15} /> : <CircleAlert size={15} />}<span>{result.reachable ? `Reply received · ${result.rttMs} ms` : result.failure}</span></div>}
          <div className="builder-divider" />
          {selectedNode ? <section className="inspector-section">
            <div className="builder-panel-heading compact"><div><span className="section-kicker">DEVICE INSPECTOR</span><h2>{selectedNode.data.name}</h2></div><button className="small-icon-button" aria-label="Close inspector" onClick={() => setSelectedNodeId(undefined)}><X size={14} /></button></div>
            <label className="field-label" htmlFor="device-name">Device name</label><input id="device-name" value={selectedNode.data.name} onChange={(event) => updateDevice("name", event.target.value)} />
            <label className="field-label" htmlFor="device-ip">IPv4 address</label><input id="device-ip" value={selectedNode.data.ipAddress} onChange={(event) => updateDevice("ipAddress", event.target.value)} spellCheck={false} />
            <label className="field-label" htmlFor="device-mask">Subnet mask</label><input id="device-mask" value={selectedNode.data.subnetMask} onChange={(event) => updateDevice("subnetMask", event.target.value)} spellCheck={false} />
            <div className="inspector-readonly"><span>MAC ADDRESS</span><code>{selectedNode.data.macAddress}</code></div>
          </section> : selectedEdge ? <section className="inspector-section">
            <div className="builder-panel-heading compact"><div><span className="section-kicker">LINK INSPECTOR</span><h2>Connection</h2></div><button className="small-icon-button" aria-label="Close inspector" onClick={() => setSelectedEdgeId(undefined)}><X size={14} /></button></div>
            <div className="link-status-row"><span className={`link-state ${selectedEdge.data?.up ? "up" : "down"}`} />{selectedEdge.data?.up ? "Link up" : "Link down"}<button className="text-button" onClick={() => { setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, data: { ...edge.data!, up: !edge.data?.up }, label: edge.data?.up ? "DOWN" : `${edge.data?.delayMs ?? 2} ms` } : edge)); resetSimulation(); }}>{selectedEdge.data?.up ? "Disable" : "Enable"}</button></div>
            <label className="field-label" htmlFor="link-delay">Propagation delay (ms)</label><input id="link-delay" type="number" min="0" value={selectedEdge.data?.delayMs ?? 2} onChange={(event) => { const delayMs = Number(event.target.value); setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, data: { ...edge.data!, delayMs }, label: `${delayMs} ms` } : edge)); resetSimulation(); }} />
            <button className="remove-link" onClick={() => { setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id)); setSelectedEdgeId(undefined); resetSimulation(); }}><Trash2 size={14} />Remove link</button>
          </section> : <div className="inspector-empty"><Cable size={17} /><span>Select a device or link to inspect its configuration.</span></div>}
          <div className="builder-footnote">This simulator currently supports same-subnet ICMP ping through active Ethernet links and switches.</div>
        </aside>

        <main className="topology-workspace">
          <div className="canvas-toolbar"><div><span className="canvas-label">CANVAS</span><span className="canvas-subtitle">Drag to arrange · Drag handles to connect</span></div><button className="small-icon-button" title="Reset simulation" aria-label="Reset simulation" onClick={resetSimulation}><Activity size={15} /></button></div>
          <div className="flow-canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges.map((edge) => ({ ...edge, animated: Boolean(activeEvent?.deviceId && (edge.source === activeEvent.deviceId || edge.target === activeEvent.deviceId) && activeEvent.kind !== "packet-dropped"), style: { stroke: edge.data?.up === false ? "#9b615c" : undefined, strokeDasharray: edge.data?.up === false ? "5 4" : undefined }, labelStyle: { fill: edge.data?.up === false ? "#d0928b" : "#8e9b91", fontSize: 10 } }))}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => { onNodesChange(changes); if (changes.some((change) => change.type === "remove")) resetSimulation(); }}
              onEdgesChange={(changes) => { onEdgesChange(changes); if (changes.some((change) => change.type === "remove")) resetSimulation(); }}
              onConnect={onConnect}
              onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(undefined); }}
              onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(undefined); }}
              onPaneClick={() => { setSelectedNodeId(undefined); setSelectedEdgeId(undefined); }}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.4}
              maxZoom={1.6}
              deleteKeyCode={["Backspace", "Delete"]}
            ><Background color="#28312c" gap={22} size={1} /><MiniMap pannable zoomable nodeColor={(node) => deviceMeta[(node.data as DeviceData).type].color === "host" ? "#79a8c8" : "#83bc91"} /><Controls showInteractive={false} /></ReactFlow>
            <div className="canvas-legend"><span><i className="legend-node up" />Device</span><span><i className="legend-link up" />Link up</span><span><i className="legend-link down" />Link down</span></div>
          </div>
          <section className="timeline-panel" id="simulation">
            <div className="timeline-header"><div><span className="section-kicker">EVENT QUEUE</span><h2>Simulation timeline</h2></div><div className="timeline-controls"><label className="speed-control">SPEED<select aria-label="Simulation speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label><button className="timeline-button" disabled={!canPlay} title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause simulation" : "Play simulation"} onClick={() => setPlaying((value) => !value)}>{playing ? <span className="pause-symbol">Ⅱ</span> : <Play size={14} fill="currentColor" />}</button><button className="timeline-button" disabled={!result || visibleCount >= result.events.length} title="Step one event" aria-label="Step one event" onClick={advance}><StepForward size={15} /></button><button className="timeline-button" title="Reset" aria-label="Reset simulation" onClick={resetSimulation}><Activity size={15} /></button></div></div>
            {displayedEvents.length ? <div className="event-list" aria-live="polite">{displayedEvents.map((event) => <button className={`event-row${activeEvent?.sequence === event.sequence ? " selected" : ""}`} key={`${event.sequence}-${event.packetId}`} onClick={() => setActiveEvent(event)}><span className="event-time">{event.timeMs.toFixed(1)}<small>ms</small></span><span className={`event-kind event-${event.kind}`}>{eventLabels[event.kind]}</span><span className="event-description">{event.message}</span><span className="event-device">{nodes.find((node) => node.id === event.deviceId)?.data.name ?? "Network"}</span></button>)}</div> : <div className="timeline-empty"><Activity size={18} /><span>Run a ping to populate the event timeline.</span></div>}
            {activeEvent && <div className="packet-inspector"><span className="packet-inspector-label">SELECTED EVENT</span><span><strong>{activeEvent.packetId}</strong> · {eventLabels[activeEvent.kind]}</span><span>{activeDeviceName ?? "Network"}</span></div>}
          </section>
        </main>
      </div>
    </div>
  );
}