/**
 * "Basic range warnings" (Section 5.5) — deliberately rough adult
 * reference ranges for flagging obviously-out-of-range vitals in the
 * UI, not a clinical decision-support system. A warning never blocks
 * submission; it's advisory only.
 */
export type VitalWarning = { field: string; message: string } | null;

export function checkSystolic(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 90) return { field: "systolic", message: "Low — possible hypotension." };
  if (value > 140) return { field: "systolic", message: "High — possible hypertension." };
  return null;
}

export function checkDiastolic(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 60) return { field: "diastolic", message: "Low — possible hypotension." };
  if (value > 90) return { field: "diastolic", message: "High — possible hypertension." };
  return null;
}

export function checkTemp(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 35) return { field: "temp", message: "Low — possible hypothermia." };
  if (value > 38) return { field: "temp", message: "High — fever." };
  return null;
}

export function checkPulse(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 60) return { field: "pulse", message: "Low — possible bradycardia." };
  if (value > 100) return { field: "pulse", message: "High — possible tachycardia." };
  return null;
}

export function checkRespiratoryRate(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 12) return { field: "respiratory_rate", message: "Low respiratory rate." };
  if (value > 20) return { field: "respiratory_rate", message: "High respiratory rate." };
  return null;
}

export function checkO2Sat(value: number | undefined): VitalWarning {
  if (value === undefined || Number.isNaN(value)) return null;
  if (value < 95) return { field: "o2_sat", message: "Low oxygen saturation." };
  return null;
}
