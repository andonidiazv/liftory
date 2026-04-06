/** Convert kg (DB canonical) → display unit. Rounds to nearest 0.5 for kg, whole number for lb. */
export function toDisplayWeight(kg: number, unit: string): number {
  if (unit === "lb") return Math.round(kg * 2.20462);
  return Math.round(kg * 2) / 2; // nearest 0.5 kg
}

/** Convert display unit → kg (DB canonical). Preserves 0.01 kg precision for lb to avoid round-trip drift. */
export function toStorageWeight(displayValue: number, unit: string): number {
  if (unit === "lb") return Math.round((displayValue / 2.20462) * 100) / 100;
  return displayValue;
}
