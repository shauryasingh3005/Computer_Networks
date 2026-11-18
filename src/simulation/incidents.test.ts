import { describe, expect, it } from "vitest";
import {
  activateIncidentDefense,
  advanceIncident,
  createIncidentReport,
  createIncidentState,
  getIncidentEnvironment,
  getIncidentScenario,
  incidentEnvironments,
  revealIncidentHint,
  setIncidentIntensity,
  startIncident,
} from "./incidents";

describe("real-world incident scenario model", () => {
  it("provides unique environment and scenario IDs with valid topology references", () => {
    expect(new Set(incidentEnvironments.map((environment) => environment.id)).size).toBe(incidentEnvironments.length);
    for (const environment of incidentEnvironments) {
      expect(environment.scenarios.length).toBeGreaterThan(0);
      expect(new Set(environment.scenarios.map((scenario) => scenario.id)).size).toBe(environment.scenarios.length);
      const deviceIds = new Set(environment.topology.devices.map((device) => device.id));
      for (const link of environment.topology.links) {
        expect(deviceIds.has(link.sourceId)).toBe(true);
        expect(deviceIds.has(link.targetId)).toBe(true);
      }
      for (const scenario of environment.scenarios) {
        expect(deviceIds.has(scenario.targetDeviceId)).toBe(true);
        expect(scenario.attackerDeviceIds.every((id) => deviceIds.has(id))).toBe(true);
      }
    }
  });

  it("moves campus DDoS metrics through impact, defense, recovery, and a report", () => {
    const environment = getIncidentEnvironment("campus")!;
    const scenario = getIncidentScenario(environment, "campus-ddos")!;
    let state = createIncidentState(environment, scenario);
    expect(state.phase).toBe("normal");
    expect(state.metrics.availabilityPct).toBe(100);
    expect(state.metrics.attackTrafficPerSecond).toBe(0);

    state = startIncident(state, environment, scenario);
    expect(state.phase).toBe("attack");
    expect(state.metrics.attackTrafficPerSecond).toBeGreaterThan(0);
    state = advanceIncident(state, environment, scenario);
    expect(state.phase).toBe("impact");
    for (let second = 0; second < 8; second += 1) state = advanceIncident(state, environment, scenario);
    expect(state.metrics.queueSize).toBeGreaterThan(0);
    expect(state.metrics.serverCpuPct).toBeGreaterThan(state.beforeMetrics.serverCpuPct);
    expect(state.peakMetrics).toBeDefined();

    state = activateIncidentDefense(state, environment, scenario, scenario.defenseId);
    expect(state.phase).toBe("recovery");
    expect(state.metrics.effectiveAttackTrafficPerSecond).toBeLessThan(state.metrics.attackTrafficPerSecond);
    for (let second = 0; second < 20 && state.phase !== "resolved"; second += 1) {
      state = advanceIncident(state, environment, scenario);
    }
    expect(state.phase).toBe("resolved");
    const report = createIncidentReport(state, environment, scenario);
    expect(report).toMatchObject({
      defenseCorrect: true,
      environment: "University campus",
      scenario: "Campus services DDoS",
    });
    expect(report?.recoveryTimeSeconds).toBeGreaterThan(0);
    expect(report?.during.healthScore).toBeLessThan(report?.after.healthScore ?? 0);
    expect(report?.actionsTaken).toContain(scenario.defenses[0].label);
  });

  it("runs every environment scenario through defense and recovery", () => {
    for (const environment of incidentEnvironments) {
      for (const scenario of environment.scenarios) {
        let state = startIncident(createIncidentState(environment, scenario), environment, scenario);
        for (let second = 0; second < 2; second += 1) {
          state = advanceIncident(state, environment, scenario);
        }
        state = activateIncidentDefense(state, environment, scenario, scenario.defenseId);
        for (let second = 0; second < 80 && state.phase !== "resolved"; second += 1) {
          state = advanceIncident(state, environment, scenario);
        }
        expect(state.phase, `${environment.id}/${scenario.id}`).toBe("resolved");
        expect(Number.isFinite(state.metrics.healthScore)).toBe(true);
        expect(createIncidentReport(state, environment, scenario)?.defenseCorrect).toBe(true);
      }
    }
  });

  it("keeps the incident unresolved after a wrong control and tracks hints/actions", () => {
    const environment = getIncidentEnvironment("enterprise")!;
    const scenario = getIncidentScenario(environment, "office-arp")!;
    let state = startIncident(createIncidentState(environment, scenario), environment, scenario);
    const wrongDefense = scenario.defenses.find((item) => item.id !== scenario.defenseId)!;
    state = activateIncidentDefense(state, environment, scenario, wrongDefense.id);
    expect(state.phase).not.toBe("recovery");
    expect(state.wrongDefenseAttempts).toBe(1);
    const hint = revealIncidentHint(state, scenario);
    expect(hint.hint).toBe(scenario.hints[0]);
    expect(hint.state.hintsUsed).toBe(1);
  });

  it("clamps attack intensity and does not reveal a report before recovery", () => {
    const environment = getIncidentEnvironment("hospital")!;
    const scenario = environment.scenarios[0];
    const state = setIncidentIntensity(createIncidentState(environment, scenario), environment, scenario, 150);
    expect(state.intensity).toBe(100);
    expect(createIncidentReport(state, environment, scenario)).toBeUndefined();
  });
});
