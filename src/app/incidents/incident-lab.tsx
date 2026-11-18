"use client";

import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Database, Network, Pause, Play, RotateCcw, Shield,
  ShieldAlert, Siren, StepForward, Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  activateIncidentDefense, advanceIncident, createIncidentReport, createIncidentState,
  getIncidentAlerts, getIncidentEnvironment, getIncidentScenario, incidentEnvironments,
  inspectIncidentDevice, revealIncidentHint, setIncidentIntensity, startIncident,
  type IncidentEnvironment, type IncidentMetrics, type IncidentPhase, type IncidentScenario,
  type IncidentState,
} from "@/simulation/incidents";
import type { SimDevice } from "@/simulation/types";

const canvasWidth = 1100;
const canvasHeight = 540;

function findDevicePath(environment: IncidentEnvironment, sourceId: string, destinationId: string): string[] {
  const queue: Array<{ id: string; path: string[] }> = [{ id: sourceId, path: [sourceId] }];
  const visited = new Set([sourceId]);
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === destinationId) return current.path;
    for (const link of environment.topology.links) {
      const nextId = link.sourceId === current.id ? link.targetId : link.targetId === current.id ? link.sourceId : undefined;
      if (!nextId || visited.has(nextId)) continue;
      visited.add(nextId);
      queue.push({ id: nextId, path: [...current.path, nextId] });
    }
  }
  return [];
}

function coordinatesFor(environment: IncidentEnvironment, path: string[]) {
  return path.flatMap((id) => {
    const position = environment.nodeInfo[id];
    return position ? [{ x: position.x, y: position.y }] : [];
  });
}

function pathString(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function pointAtProgress(points: Array<{ x: number; y: number }>, progress: number) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const lengths = points.slice(1).map((point, index) => Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let distance = ((progress % 1) + 1) % 1 * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (distance <= lengths[index]) {
      const ratio = lengths[index] ? distance / lengths[index] : 0;
      return {
        x: points[index].x + (points[index + 1].x - points[index].x) * ratio,
        y: points[index].y + (points[index + 1].y - points[index].y) * ratio,
      };
    }
    distance -= lengths[index];
  }
  return points[points.length - 1];
}

function deviceStatus(device: SimDevice, scenario: IncidentScenario, state: IncidentState): string {
  if (scenario.attackerDeviceIds.includes(device.id)) {
    if (state.phase === "normal") return "IDLE";
    if (state.correctDefenseActivated && state.phase !== "attack" && state.phase !== "impact") return "FILTERED";
    return state.inspectedDeviceIds.includes(device.id) ? "FLAGGED" : "MONITOR";
  }
  if (device.id === scenario.targetDeviceId) {
    if (state.phase === "impact") return "DEGRADED";
    if (state.phase === "recovery") return "RECOVERING";
    if (state.phase === "resolved") return "RESTORED";
  }
  if (scenario.affectedDeviceIds.includes(device.id)) {
    if (state.phase === "impact") return "AFFECTED";
    if (state.phase === "recovery") return "RECOVERING";
    if (state.phase === "resolved") return "NOMINAL";
  }
  return "NOMINAL";
}

function MetricCard({ label, value, note, state = "normal" }: { label: string; value: string; note: string; state?: "normal" | "warning" | "critical" | "good" }) {
  return <article className={`incident-metric metric-${state}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>;
}

function metricsForReport(metrics: IncidentMetrics) {
  return [
    ["Availability", `${metrics.availabilityPct}%`],
    ["Latency", `${metrics.latencyMs} ms`],
    ["Packet loss", `${metrics.packetLossPct}%`],
    ["Bandwidth", `${metrics.bandwidthUtilizationPct}%`],
    ["Server CPU", `${metrics.serverCpuPct}%`],
    ["Request queue", `${metrics.queueSize}/${metrics.queueCapacity}`],
  ];
}

export default function IncidentLab() {
  const [environmentId, setEnvironmentId] = useState("campus");
  const [scenarioId, setScenarioId] = useState("campus-ddos");
  const [state, setState] = useState<IncidentState>(() => {
    const environment = getIncidentEnvironment("campus")!;
    return createIncidentState(environment, getIncidentScenario(environment, "campus-ddos")!);
  });
  const [mode, setMode] = useState<"operations" | "response">("operations");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [packetProgress, setPacketProgress] = useState(0);

  const environment = getIncidentEnvironment(environmentId)!;
  const scenario = getIncidentScenario(environment, scenarioId)!;
  const report = createIncidentReport(state, environment, scenario);
  const devices = environment.topology.devices;
  const selectedDevice = devices.find((device) => device.id === selectedDeviceId);
  const alerts = getIncidentAlerts(state);
  const attackActive = state.phase !== "normal" && state.phase !== "resolved";
  const playbackActive = playing && attackActive;
  const packetMotionActive = state.phase === "normal" || playbackActive;
  const activeStage: IncidentPhase = state.phase === "resolved" ? "resolved" : state.phase;

  const legitimateSource = devices.find((device) => device.type === "host" && !scenario.attackerDeviceIds.includes(device.id));
  const legitimatePath = legitimateSource
    ? findDevicePath(environment, legitimateSource.id, scenario.targetDeviceId)
    : [];
  const legitimatePoints = coordinatesFor(environment, legitimatePath);
  const attackPaths = scenario.attackerDeviceIds.map((id) => coordinatesFor(
    environment,
    findDevicePath(environment, id, scenario.targetDeviceId),
  )).filter((points) => points.length > 1);

  useEffect(() => {
    if (!playing || state.phase === "normal" || state.phase === "resolved") return;
    const timer = window.setTimeout(() => {
      setState((current) => advanceIncident(current, environment, scenario));
    }, 900 / speed);
    return () => window.clearTimeout(timer);
  }, [environment, playing, scenario, speed, state.phase, state.simulatedSeconds]);

  useEffect(() => {
    if (!packetMotionActive) return;
    const timer = window.setInterval(() => {
      setPacketProgress((progress) => (progress + 0.02 * speed) % 1);
    }, 50);
    return () => window.clearInterval(timer);
  }, [packetMotionActive, speed]);

  function reset(nextEnvironment = environment, nextScenario = scenario) {
    setPlaying(false);
    setSelectedDeviceId(undefined);
    setHint(undefined);
    setState(createIncidentState(nextEnvironment, nextScenario));
  }

  function chooseEnvironment(nextId: string) {
    const nextEnvironment = getIncidentEnvironment(nextId);
    if (!nextEnvironment) return;
    const nextScenario = nextEnvironment.scenarios[0];
    setEnvironmentId(nextEnvironment.id);
    setScenarioId(nextScenario.id);
    reset(nextEnvironment, nextScenario);
  }

  function chooseScenario(nextId: string) {
    const nextScenario = getIncidentScenario(environment, nextId);
    if (!nextScenario) return;
    setScenarioId(nextScenario.id);
    reset(environment, nextScenario);
  }

  function start() {
    if (state.phase === "resolved") {
      reset();
      return;
    }
    setState((current) => startIncident(current, environment, scenario));
    setPlaying(true);
  }

  function step() {
    setState((current) => advanceIncident(current, environment, scenario));
  }

  function inspect(device: SimDevice) {
    setSelectedDeviceId(device.id);
    setState((current) => inspectIncidentDevice(current, device.id, environment));
  }

  function requestHint() {
    const result = revealIncidentHint(state, scenario);
    setState(result.state);
    setHint(result.hint ?? "No additional hints are available.");
  }

  const queuePercent = Math.min(100, Math.round(state.metrics.queueSize / state.metrics.queueCapacity * 100));
  const healthClass = state.metrics.healthScore >= 80 ? "good" : state.metrics.healthScore >= 50 ? "warning" : "critical";
  const phaseSequence: Array<{ id: IncidentPhase; label: string }> = [
    { id: "normal", label: "Normal" },
    { id: "attack", label: "Attack" },
    { id: "impact", label: "Impact" },
    { id: "recovery", label: "Defense & recovery" },
  ];
  const stageExplanation = state.phase === "normal"
    ? "Baseline traffic is flowing. Review device roles and normal service telemetry before starting the incident."
    : state.phase === "attack"
      ? "Anomalous simulated traffic has begun. Compare traffic sources with the target service and inspect devices for clues."
      : state.phase === "impact"
        ? "The incident is affecting service health. Use alerts, request queues, and packet paths to identify the likely cause."
        : state.phase === "recovery"
          ? "A defensive control is active. Watch the queue drain and availability, latency, and loss return toward baseline."
          : "Recovery checks passed. Review the after-action report and compare normal, peak-impact, and recovered telemetry.";

  return <div className="app-shell incident-shell">
    <aside className="sidebar">
      <div className="sidebar-label">Workspace</div>
      <nav className="side-nav" aria-label="Main navigation">
        <Link href="/" className="nav-link" title="Overview"><Activity size={17} strokeWidth={1.8} /><span>Overview</span></Link>
        <Link href="/learn" className="nav-link" title="Learn"><BookOpen size={17} strokeWidth={1.8} /><span>Learn</span></Link>
        <Link href="/builder" className="nav-link" title="Network builder"><Network size={17} strokeWidth={1.8} /><span>Network builder</span></Link>
        <Link href="/incidents" className="nav-link active" title="Real-World Scenarios"><ShieldAlert size={17} strokeWidth={1.8} /><span>Real-World Scenarios</span></Link>
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-dot" />Local incident lab</div></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Incident Lab</strong></div>
        <div className="topbar-right"><span className="environment-pill"><span className={`health-dot health-${healthClass}`} />{state.metrics.healthScore}% health</span></div>
      </header>

      <div className="page-content incident-content">
        <div className="incident-title-row">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />NETWORK OPERATIONS / SIMULATED ENVIRONMENTS</div>
            <h1 className="learn-title">Real-World Scenarios</h1>
            <p className="welcome-copy">Investigate a local network incident, watch service telemetry change, and test a defensive response.</p>
          </div>
          <div className="incident-mode-switch" role="group" aria-label="Incident lab mode">
            <button className={mode === "operations" ? "selected" : ""} onClick={() => setMode("operations")}><Activity size={14} /> NOC</button>
            <button className={mode === "response" ? "selected" : ""} onClick={() => setMode("response")}><Shield size={14} /> Incident response</button>
          </div>
        </div>

        <section className="incident-environments" aria-label="Environment selector">
          {incidentEnvironments.map((item) => <button key={item.id} className={`environment-card${item.id === environment.id ? " selected" : ""}`} onClick={() => chooseEnvironment(item.id)}>
            <span>{item.name}</span><small>{item.scenarios.length} scenarios</small>
          </button>)}
        </section>

        <section className="incident-brief-panel">
          <div className="incident-brief-copy">
            <div className="section-kicker">INCIDENT BRIEF · {environment.name.toUpperCase()}</div>
            <h2>{mode === "response" ? "Incident response exercise" : scenario.name}</h2>
            <p>{scenario.brief}</p>
            <div className="incident-brief-meta">{mode !== "response" && <span>{scenario.category}</span>}<span>{devices.length} modeled devices</span><span>Simulation only · no network traffic</span></div>
          </div>
          <div className="incident-selects">
            <label className="demo-select-label">SCENARIO<select value={scenario.id} onChange={(event) => chooseScenario(event.target.value)}>{environment.scenarios.map((item, index) => <option value={item.id} key={item.id}>{mode === "response" ? `Exercise ${String(index + 1).padStart(2, "0")}` : item.name}</option>)}</select></label>
            <div className="incident-stage-buttons">
              <button className="button button-primary" disabled={state.phase !== "normal" && state.phase !== "resolved"} onClick={start}>
                <Play size={14} fill="currentColor" />{state.phase === "resolved" ? "Run again" : "Start scenario"}
              </button>
              <button className="incident-icon-button" disabled={!attackActive} aria-label={playing ? "Pause scenario" : "Resume scenario"} title={playing ? "Pause" : "Resume"} onClick={() => setPlaying((value) => !value)}>
                {playing ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button className="incident-icon-button" disabled={!attackActive} aria-label="Step simulation" title="Step one second" onClick={step}><StepForward size={15} /></button>
              <button className="incident-icon-button" aria-label="Restart scenario" title="Restart" onClick={() => reset()}><RotateCcw size={15} /></button>
              <label className="speed-control">SPEED<select aria-label="Simulation speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label>
            </div>
            <label className="incident-intensity">
              <span>SIMULATED INCIDENT INTENSITY <output>{state.intensity}%</output></span>
              <input aria-label="Incident intensity" type="range" min="0" max="100" step="5" value={state.intensity} disabled={!attackActive} onChange={(event) => setState((current) => setIncidentIntensity(current, environment, scenario, Number(event.target.value)))} />
            </label>
          </div>
        </section>

        <div className="incident-progress-row">
          <div className="incident-stage-track" aria-label={`Current stage: ${activeStage}`}>
            {phaseSequence.map((phase, index) => {
              const phaseIndex = phaseSequence.findIndex((entry) => entry.id === state.phase);
              const resolved = state.phase === "resolved";
              const reached = resolved || index <= phaseIndex;
              return <div className={`incident-stage${reached ? " reached" : ""}${phase.id === state.phase || (resolved && phase.id === "recovery") ? " current" : ""}`} key={phase.id}>
                <span>{reached ? <CheckCircle2 size={14} /> : `0${index + 1}`}</span><strong>{phase.label}</strong>
              </div>;
            })}
          </div>
          <div className="incident-clock"><Clock3 size={14} />SIM T+{state.simulatedSeconds}s</div>
        </div>
        <div className="incident-stage-explainer" role="status" aria-live="polite"><Activity size={15} /><p>{stageExplanation}</p></div>

        <section className="incident-metrics-grid" aria-label="Live network telemetry">
          <MetricCard label="Availability" value={`${state.metrics.availabilityPct}%`} note="service success" state={state.metrics.availabilityPct >= 95 ? "good" : state.metrics.availabilityPct >= 70 ? "warning" : "critical"} />
          <MetricCard label="Latency" value={`${state.metrics.latencyMs} ms`} note="simulated end-to-end" state={state.metrics.latencyMs < environment.telemetry.baseLatencyMs * 2 ? "normal" : "warning"} />
          <MetricCard label="Packet loss" value={`${state.metrics.packetLossPct}%`} note="simulated loss" state={state.metrics.packetLossPct < 2 ? "good" : state.metrics.packetLossPct >= 15 ? "critical" : "warning"} />
          <MetricCard label="Bandwidth use" value={`${state.metrics.bandwidthUtilizationPct}%`} note={`${state.metrics.trafficVolumeMbps} Mbps total`} state={state.metrics.bandwidthUtilizationPct >= 90 ? "critical" : state.metrics.bandwidthUtilizationPct >= 70 ? "warning" : "normal"} />
          <MetricCard label="Active devices" value={`${state.metrics.activeDevices}/${devices.length}`} note="environment assets" state={state.metrics.activeDevices < devices.length ? "warning" : "good"} />
          <MetricCard label="Connections" value={state.metrics.activeConnections.toLocaleString()} note="active / pending" state={state.metrics.activeConnections > environment.telemetry.baseConnections * 1.5 ? "warning" : "normal"} />
          <MetricCard label="Server CPU" value={`${state.metrics.serverCpuPct}%`} note="target service load" state={state.metrics.serverCpuPct >= 90 ? "critical" : state.metrics.serverCpuPct >= 70 ? "warning" : "normal"} />
          <MetricCard label="Requests processed" value={`${state.metrics.requestsProcessedPerSecond}/s`} note={`${state.metrics.legitimateTrafficPerSecond}/s legitimate`} />
          <MetricCard label="Attack traffic" value={`${state.metrics.attackTrafficPerSecond}/s`} note={`${state.metrics.filteredAttackTrafficPerSecond}/s filtered`} state={state.metrics.attackTrafficPerSecond > 0 ? "warning" : "good"} />
          <MetricCard label="Request queue" value={`${state.metrics.queueSize}/${state.metrics.queueCapacity}`} note={`${queuePercent}% of capacity`} state={queuePercent >= 85 ? "critical" : queuePercent >= 60 ? "warning" : "normal"} />
          <MetricCard label="Dropped / denied" value={`${state.metrics.requestsDroppedPerSecond}/s`} note={`${state.metrics.legitimateRequestsDeniedPerSecond}/s legitimate denied`} state={state.metrics.requestsDroppedPerSecond > 0 ? "critical" : "good"} />
          <MetricCard label="Network health" value={`${state.metrics.healthScore}%`} note="availability, loss & CPU" state={healthClass} />
        </section>

        <div className="incident-workspace-grid">
          <section className="incident-canvas-panel">
            <div className="incident-panel-heading">
              <div><div className="section-kicker">LIVE TOPOLOGY</div><h2>{environment.name}</h2></div>
              <div className="incident-legend"><span><i className="packet-dot legitimate" />Legitimate</span><span><i className="packet-dot attack" />Simulated incident</span></div>
            </div>
            <div className="incident-canvas">
              <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} role="img" aria-label={`${environment.name} simulated network topology`}>
                {environment.topology.links.map((link) => {
                  const source = environment.nodeInfo[link.sourceId];
                  const target = environment.nodeInfo[link.targetId];
                  return <line key={link.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={`incident-link${link.up ? "" : " link-down"}`} />;
                })}
                {legitimatePoints.length > 1 && <path d={pathString(legitimatePoints)} className="incident-flow-path flow-legitimate" />}
                {attackActive && attackPaths.map((points, index) => <path d={pathString(points)} className={`incident-flow-path flow-attack${state.correctDefenseActivated ? " flow-contained" : ""}`} key={`attack-flow-${index}`} />)}
                {legitimatePoints.length > 1 && [0, 0.34, 0.68].map((offset) => {
                  const point = pointAtProgress(legitimatePoints, packetProgress + offset);
                  return <circle key={`legit-packet-${offset}`} cx={point.x} cy={point.y} r="5" className="incident-packet packet-legitimate" />;
                })}
                {attackActive && attackPaths.flatMap((points, pathIndex) => {
                  const count = state.correctDefenseActivated ? 1 : 2;
                  return Array.from({ length: count }, (_, index) => {
                    const point = pointAtProgress(points, packetProgress + pathIndex * 0.21 + index * 0.48);
                    return <circle key={`attack-packet-${pathIndex}-${index}`} cx={point.x} cy={point.y} r="5" className={`incident-packet packet-attack${state.correctDefenseActivated ? " packet-filtered" : ""}`} />;
                  });
                })}
                {devices.map((device) => {
                  const point = environment.nodeInfo[device.id];
                  const status = deviceStatus(device, scenario, state);
                  const affected = status === "DEGRADED" || status === "AFFECTED";
                  const suspicious = status === "FLAGGED" || (state.phase === "impact" && state.inspectedDeviceIds.includes(device.id) && scenario.attackerDeviceIds.includes(device.id));
                  return <g
                    key={device.id}
                    className={`incident-node node-${device.type}${affected ? " node-affected" : ""}${suspicious ? " node-suspicious" : ""}${selectedDeviceId === device.id ? " node-selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${device.name}`}
                    onClick={() => inspect(device)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inspect(device); }}
                  >
                    <rect x={point.x - 84} y={point.y - 39} width="168" height="78" rx="8" />
                    <text x={point.x - 68} y={point.y - 12} className="node-glyph">{device.type === "router" ? "R" : device.type === "switch" ? "SW" : device.type === "server" ? "SV" : "H"}</text>
                    <text x={point.x - 39} y={point.y - 13} className="node-name">{device.name}</text>
                    <text x={point.x - 68} y={point.y + 7} className="node-role">{environment.nodeInfo[device.id].role}</text>
                    <text x={point.x - 68} y={point.y + 26} className="node-status">{status}</text>
                  </g>;
                })}
              </svg>
              {!attackActive && <div className="incident-canvas-overlay"><span><Activity size={15} />{state.phase === "resolved" ? "Baseline service restored" : "Baseline traffic flowing"}</span><small>{state.phase === "resolved" ? "The selected defense returned service telemetry to its baseline." : "Start an incident to observe its simulated impact."}</small></div>}
            </div>
            <div className="incident-canvas-foot">
              <span><i className={`status-pip health-${healthClass}`} />Health {state.metrics.healthScore}%</span>
              <span><i className="status-pip status-target" />Target {devices.find((device) => device.id === scenario.targetDeviceId)?.name}</span>
              <span><Wifi size={13} />Local simulation · no external traffic</span>
            </div>
          </section>

          <aside className="incident-side-stack">
            <section className="incident-side-panel">
              <div className="incident-panel-heading"><div><div className="section-kicker">ALERTS</div><h2>Network health</h2></div><span className={`incident-health-badge health-${healthClass}`}>{state.metrics.healthScore}%</span></div>
              <div className="incident-alert-list">
                {alerts.length ? alerts.map((alert) => <div className={`incident-alert alert-${alert.severity}`} key={alert.id}><AlertTriangle size={14} /><span>{alert.message}</span></div>) : <div className="incident-quiet"><CheckCircle2 size={15} />No active alerts. Baseline is stable.</div>}
              </div>
            </section>

            <section className="incident-side-panel">
              <div className="incident-panel-heading"><div><div className="section-kicker">DEVICE INSPECTOR</div><h2>{selectedDevice?.name ?? "Select a device"}</h2></div><Database size={15} /></div>
              {selectedDevice ? <div className="device-inspection">
                <div><span>ROLE</span><strong>{mode === "response" && scenario.attackerDeviceIds.includes(selectedDevice.id) && !state.inspectedDeviceIds.includes(selectedDevice.id) ? "Unverified asset" : environment.nodeInfo[selectedDevice.id].role}</strong></div>
                <div><span>TYPE</span><strong>{selectedDevice.type}</strong></div>
                <div><span>ADDRESS</span><strong>{selectedDevice.ipAddress}</strong></div>
                <div><span>STATUS</span><strong>{deviceStatus(selectedDevice, scenario, state)}</strong></div>
                <p>{scenario.affectedDeviceIds.includes(selectedDevice.id) ? "This asset is associated with the current incident scope." : "No direct incident impact has been observed on this asset."}</p>
              </div> : <div className="incident-quiet">Select a node in the topology to inspect its simulated state.</div>}
            </section>

            <section className="incident-side-panel incident-traffic-panel">
              <div className="incident-panel-heading"><div><div className="section-kicker">TRAFFIC & CAPACITY</div><h2>Request pipeline</h2></div><GaugeIcon /></div>
              <div className="queue-track"><span style={{ width: `${queuePercent}%` }} className={queuePercent >= 80 ? "queue-high" : ""} /></div>
              <div className="queue-caption"><span>Queue {state.metrics.queueSize}</span><span>Capacity {state.metrics.queueCapacity}</span></div>
              <div className="traffic-numbers"><span>Legitimate <b>{state.metrics.legitimateTrafficPerSecond}/s</b></span><span>Attack <b>{state.metrics.attackTrafficPerSecond}/s</b></span><span>Filtered <b>{state.metrics.filteredAttackTrafficPerSecond}/s</b></span><span>Processed <b>{state.metrics.requestsProcessedPerSecond}/s</b></span></div>
            </section>
          </aside>
        </div>

        <div className="incident-lower-grid">
          <section className="incident-lower-panel">
            <div className="incident-panel-heading"><div><div className="section-kicker">INCIDENT TIMELINE</div><h2>Operational log</h2></div><span>{state.logs.length} events</span></div>
            <ol className="incident-log-list">
              {[...state.logs].slice(-8).reverse().map((entry, index) => <li className={`log-${entry.level}`} key={`${entry.second}-${index}-${entry.message}`}>
                <span>T+{entry.second}s</span><i /><p>{entry.message}</p>
              </li>)}
            </ol>
          </section>

          <section className="incident-lower-panel">
            <div className="incident-panel-heading"><div><div className="section-kicker">{mode === "response" ? "ADMINISTRATOR WORKSPACE" : "DEFENSE CONTROLS"}</div><h2>{mode === "response" ? "Investigate & respond" : "Contain the incident"}</h2></div><Shield size={15} /></div>
            {mode === "response" && <div className="response-brief"><Siren size={15} /><p>{scenario.brief}</p></div>}
            <div className="defense-control-list">
              {scenario.defenses.map((defense) => <button
                key={defense.id}
                className={`defense-control${state.defenseId === defense.id ? " control-selected" : ""}${state.correctDefenseActivated && state.defenseId === defense.id ? " control-active" : ""}`}
                disabled={!attackActive || state.phase === "resolved"}
                onClick={() => setState((current) => activateIncidentDefense(current, environment, scenario, defense.id))}
              >
                <Shield size={14} /><span>{defense.label}</span><ArrowRight size={13} />
              </button>)}
            </div>
            {state.defenseId && !state.correctDefenseActivated && <p className="control-feedback">Control recorded. Observe the queue, availability, and alerts for evidence of recovery.</p>}
            {mode === "response" && <div className="hint-controls"><button className="text-button" disabled={!attackActive || state.hintsUsed >= scenario.hints.length} onClick={requestHint}><CircleHelp size={14} />Request hint ({scenario.hints.length - state.hintsUsed} left)</button>{hint && <p>{hint}</p>}</div>}
            {state.phase === "resolved" && report && <div className="incident-score"><CheckCircle2 size={16} /><span>Incident resolved</span><strong>{report.score}/100</strong></div>}
            {mode === "response" && <p className="response-note">Inspect devices and telemetry before choosing a control. The root cause is included in the after-action report after recovery.</p>}
          </section>
        </div>

        {report && <section className="incident-report-panel" aria-live="polite">
          <div className="incident-panel-heading"><div><div className="section-kicker">AFTER-ACTION REPORT</div><h2>{report.scenario} · {report.score}/100</h2></div><CheckCircle2 size={19} /></div>
          <div className="report-summary-grid">
            <div><span>ROOT CAUSE</span><p>{report.rootCause}</p></div>
            <div><span>ATTACK MECHANISM</span><p>{report.mechanism}</p></div>
            <div><span>USER IMPACT</span><p>{report.userImpact}</p></div>
            <div><span>RESPONSE</span><p>{report.defenseCorrect ? "The selected control contained the incident." : "No effective control was selected."} Recovery took {report.recoveryTimeSeconds} simulated seconds.</p></div>
          </div>
          <div className="report-metrics-wrap"><table className="report-metrics">
            <thead><tr><th>Metric</th><th>Normal</th><th>During impact</th><th>After recovery</th></tr></thead>
            <tbody>{metricsForReport(report.before).map(([label, before], index) => {
              const during = metricsForReport(report.during)[index][1];
              const after = metricsForReport(report.after)[index][1];
              return <tr key={label}><th>{label}</th><td>{before}</td><td>{during}</td><td>{after}</td></tr>;
            })}</tbody>
          </table></div>
          <div className="report-actions"><div><span>ACTIONS TAKEN</span>{report.actionsTaken.length ? <ul>{report.actionsTaken.map((action, index) => <li key={`${action}-${index}`}>{action}</li>)}</ul> : <p>No administrator actions recorded.</p>}</div><div><span>RECOMMENDATIONS</span><ul>{report.recommendations.map((recommendation) => <li key={recommendation}>{recommendation}</li>)}</ul></div></div>
          <p className="incident-disclaimer">All hosts, services, addresses, requests, and impact figures are fictional, deterministic training data. No real network traffic is generated.</p>
        </section>}

        <footer className="incident-footer"><span>INCIDENT LAB · SIMULATED NETWORK OPERATIONS</span><Link href="/builder">Open Network Builder <ArrowRight size={13} /></Link></footer>
      </div>
    </main>
  </div>;
}

function GaugeIcon() {
  return <Activity size={15} />;
}

