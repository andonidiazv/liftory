import { describe, it, expect } from "vitest";
import {
  muscleToMacro,
  setMacroGroups,
  volumeStatus,
  ALL_MACRO_GROUPS,
  SETS_PER_WEEK_MIN,
  SETS_PER_WEEK_MAX,
} from "./muscleGroups";

describe("muscleToMacro", () => {
  it("maps synonyms to the same macro group", () => {
    // biceps vs biceps_brachii should be the same macro
    expect(muscleToMacro("biceps")).toBe("Biceps");
    expect(muscleToMacro("biceps_brachii")).toBe("Biceps");
    expect(muscleToMacro("brachialis")).toBe("Biceps");
  });

  it("maps quad variants consistently", () => {
    expect(muscleToMacro("quads")).toBe("Cuadriceps");
    expect(muscleToMacro("quadriceps")).toBe("Cuadriceps");
  });

  it("maps all shoulder variants to Hombros", () => {
    expect(muscleToMacro("anterior_deltoid")).toBe("Hombros");
    expect(muscleToMacro("front_delts")).toBe("Hombros");
    expect(muscleToMacro("deltoid_medial")).toBe("Hombros");
    expect(muscleToMacro("rear_delts")).toBe("Hombros");
  });

  it("returns null for generic/non-muscle labels", () => {
    expect(muscleToMacro("cardio")).toBeNull();
    expect(muscleToMacro("coordination")).toBeNull();
    expect(muscleToMacro("arms")).toBeNull();
    expect(muscleToMacro("legs")).toBeNull();
  });
});

describe("setMacroGroups", () => {
  it("deduplicates synonyms — a set tagged biceps AND biceps_brachii counts once for Biceps", () => {
    // This prevents double-counting when exercises use multiple names for the same macro
    const macros = setMacroGroups(["biceps", "biceps_brachii", "brachialis"]);
    expect(macros).toEqual(["Biceps"]);
  });

  it("a deadlift hitting hamstrings + erector_spinae + glutes produces 3 macros", () => {
    const macros = setMacroGroups(["hamstrings", "erector_spinae", "glutes"]);
    expect(macros.sort()).toEqual(["Gluteos", "Hamstrings", "Lumbar"]);
  });

  it("ignored muscles do not contribute", () => {
    const macros = setMacroGroups(["cardio", "coordination", "biceps"]);
    expect(macros).toEqual(["Biceps"]);
  });

  it("returns empty for null / empty input", () => {
    expect(setMacroGroups(null)).toEqual([]);
    expect(setMacroGroups(undefined)).toEqual([]);
    expect(setMacroGroups([])).toEqual([]);
  });
});

describe("volumeStatus", () => {
  it("zero sets = 'none'", () => {
    expect(volumeStatus(0)).toBe("none");
  });

  it("below minimum = 'low'", () => {
    expect(volumeStatus(1)).toBe("low");
    expect(volumeStatus(SETS_PER_WEEK_MIN - 1)).toBe("low");
  });

  it("within target range = 'in_range'", () => {
    expect(volumeStatus(SETS_PER_WEEK_MIN)).toBe("in_range");
    expect(volumeStatus(15)).toBe("in_range");
    expect(volumeStatus(SETS_PER_WEEK_MAX)).toBe("in_range");
  });

  it("above max = 'high' (junk volume risk)", () => {
    expect(volumeStatus(SETS_PER_WEEK_MAX + 1)).toBe("high");
    expect(volumeStatus(30)).toBe("high");
  });
});

describe("ALL_MACRO_GROUPS", () => {
  it("contains 13 groups with no duplicates", () => {
    expect(ALL_MACRO_GROUPS.length).toBe(13);
    expect(new Set(ALL_MACRO_GROUPS).size).toBe(13);
  });

  it("every macro group is referenced by at least one muscle in the mapping", () => {
    // Prevents dead groups — if we name a macro group, something must map to it
    const referenced = new Set<string>();
    const testMuscles = [
      "chest", "lats", "lower_back", "shoulders", "biceps", "triceps",
      "forearms", "quads", "hamstrings", "glutes", "calves", "hips", "core",
    ];
    for (const m of testMuscles) {
      const macro = muscleToMacro(m);
      if (macro) referenced.add(macro);
    }
    for (const group of ALL_MACRO_GROUPS) {
      expect(referenced.has(group)).toBe(true);
    }
  });
});

describe("Integration: volume bias fix", () => {
  it("a bicep curl and a hip thrust each contribute exactly 1 set to their respective macro", () => {
    // The old system counted tonnage (weight × reps) — a 150 kg hip thrust
    // dwarfed a 15 kg bicep curl ~10×. The new system counts sets:
    // both are worth exactly 1 set each, independent of load.
    const bicepCurl = setMacroGroups(["biceps_brachii", "brachialis"]);
    const hipThrust = setMacroGroups(["glutes", "gluteus_maximus", "hamstrings"]);

    // Each set contributes 1 to each macro it hits
    expect(bicepCurl).toEqual(["Biceps"]);
    expect(hipThrust.sort()).toEqual(["Gluteos", "Hamstrings"]);
    // So a week of 12 bicep curls and 12 hip thrusts gives:
    //   Biceps: 12 sets (in range)
    //   Gluteos: 12 sets (in range)
    //   Hamstrings: 12 sets (in range)
    // All equal — no muscle-size bias.
  });
});
