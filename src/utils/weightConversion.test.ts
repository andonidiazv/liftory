import { describe, it, expect } from "vitest";
import { toDisplayWeight, toStorageWeight } from "./weightConversion";

describe("toDisplayWeight", () => {
  it("returns kg rounded to nearest 0.5 when unit is kg", () => {
    expect(toDisplayWeight(20.41, "kg")).toBe(20.5);
    expect(toDisplayWeight(20.25, "kg")).toBe(20.5);
    expect(toDisplayWeight(20.0, "kg")).toBe(20.0);
    expect(toDisplayWeight(15.88, "kg")).toBe(16.0);
  });

  it("converts kg to lb rounded to whole number when unit is lb", () => {
    expect(toDisplayWeight(20.41, "lb")).toBe(45); // 20.41 × 2.20462 ≈ 45.00
    expect(toDisplayWeight(20.0, "lb")).toBe(44);  // 20 × 2.20462 ≈ 44.09
    expect(toDisplayWeight(1, "lb")).toBe(2);      // 2.20462 rounds up
    expect(toDisplayWeight(0, "lb")).toBe(0);
  });

  it("handles the specific PR case that caused the 20.41-lb-mislabel bug", () => {
    // Pre-fix: showed "20.41 lb" (raw kg with lb label)
    // Post-fix: shows correct lb value
    const kgValue = 20.41;
    expect(toDisplayWeight(kgValue, "lb")).toBe(45);
  });

  it("bulk aggregate volumes convert correctly", () => {
    // Typical workout volume: sum of (weight × reps) in kg
    const volumeKg = 5000;
    expect(toDisplayWeight(volumeKg, "kg")).toBe(5000);
    expect(toDisplayWeight(volumeKg, "lb")).toBe(11023);
  });
});

describe("toStorageWeight", () => {
  it("returns input unchanged when unit is kg", () => {
    expect(toStorageWeight(20, "kg")).toBe(20);
    expect(toStorageWeight(15.5, "kg")).toBe(15.5);
  });

  it("converts lb input back to kg for storage", () => {
    // 45 lb → 45 / 2.20462 ≈ 20.41 kg
    const kg = toStorageWeight(45, "lb");
    expect(kg).toBeCloseTo(20.41, 1);
  });

  it("round-trip kg → lb → kg preserves value within rounding", () => {
    const original = 20.5;
    const displayLb = toDisplayWeight(original, "lb"); // 45
    const backKg = toStorageWeight(displayLb, "lb");
    // Because display rounds to whole lb, we lose some precision
    expect(backKg).toBeCloseTo(original, 0);
  });

  it("zero round-trips to zero", () => {
    expect(toStorageWeight(0, "lb")).toBe(0);
    expect(toStorageWeight(0, "kg")).toBe(0);
  });
});

describe("Integration: display correctness across unit switches", () => {
  it("a 20.41 kg PR shows 20.5 kg in kg mode and 45 lb in lb mode", () => {
    const storedKg = 20.41;
    expect(`${toDisplayWeight(storedKg, "kg")} kg`).toBe("20.5 kg");
    expect(`${toDisplayWeight(storedKg, "lb")} lb`).toBe("45 lb");
  });

  it("a previous best of 20 kg yields improvement of +1 lb when new PR is 20.41 kg", () => {
    const newKg = 20.41;
    const prevKg = 20.0;
    const newLb = toDisplayWeight(newKg, "lb"); // 45
    const prevLb = toDisplayWeight(prevKg, "lb"); // 44
    const improvement = Math.round((newLb - prevLb) * 10) / 10;
    expect(improvement).toBe(1); // no "+0.41000000000000014" floating point noise
  });
});
