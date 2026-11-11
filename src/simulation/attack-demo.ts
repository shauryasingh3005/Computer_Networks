export interface AttackLoadResult {
  baselineLoad: number;
  attackPressure: number;
  effectiveAttackPressure: number;
  totalLoad: number;
  capacity: number;
  utilizationPercent: number;
  overloaded: boolean;
}

export function simulateAttackLoad(pressure: number, active: boolean, mitigationsEnabled: boolean): AttackLoadResult {
  const capacity = 100;
  const baselineLoad = 25;
  const configuredPressure = Number.isFinite(pressure) ? Math.min(150, Math.max(0, Math.round(pressure))) : 0;
  const attackPressure = active ? configuredPressure : 0;
  const effectiveAttackPressure = mitigationsEnabled ? Math.round(attackPressure * 0.35) : attackPressure;
  const totalLoad = baselineLoad + effectiveAttackPressure;

  return {
    baselineLoad,
    attackPressure,
    effectiveAttackPressure,
    totalLoad,
    capacity,
    utilizationPercent: Math.min(100, Math.round((totalLoad / capacity) * 100)),
    overloaded: totalLoad > capacity,
  };
}