import { describe, it, expect } from "vitest";
import { getOrnamentShape } from "@/features/widgets/ornament-shapes";

describe("Ornament Shapes Geometry & Concentric Double Borders", () => {
  it("generates sharp square corners when cornerRadius is 0 for rectangle", () => {
    const shape = getOrnamentShape("rectangle", 400, 260, 12, 0);
    expect(shape.fullPath).toContain("L 388 12 L 388 248 L 12 248 L 12 12 Z");
    // Inner path is also sharp corners (no A command)
    expect(shape.innerFullPath).toContain("L 376 24 L 376 236 L 24 236 L 24 24 Z");
    expect(shape.innerFullPath).not.toContain("A ");
  });

  it("applies cornerRadius to rectangle and computes true concentric inner radius (R - gap)", () => {
    const rOuter = 30;
    const gap = 12;
    const expectedInnerR = rOuter - gap; // 18

    const shape = getOrnamentShape("rectangle", 400, 260, gap, rOuter);
    // Outer border should have arc with radius 30
    expect(shape.fullPath).toContain(`A ${rOuter} ${rOuter}`);
    expect(shape.leftPath).toContain(`A ${rOuter} ${rOuter}`);
    expect(shape.rightPath).toContain(`A ${rOuter} ${rOuter}`);

    // Inner double border must have true concentric arc with radius 18
    expect(shape.innerFullPath).toContain(`A ${expectedInnerR} ${expectedInnerR}`);
    expect(shape.innerLeftPath).toContain(`A ${expectedInnerR} ${expectedInnerR}`);
    expect(shape.innerRightPath).toContain(`A ${expectedInnerR} ${expectedInnerR}`);
  });

  it("applies custom cornerRadius to rounded-rect with true concentric double border", () => {
    const rOuter = 40;
    const gap = 15;
    const expectedInnerR = rOuter - gap; // 25

    const shape = getOrnamentShape("rounded-rect", 400, 260, gap, rOuter);
    expect(shape.fullPath).toContain(`A ${rOuter} ${rOuter}`);
    expect(shape.innerFullPath).toContain(`A ${expectedInnerR} ${expectedInnerR}`);
  });

  it("falls back gracefully to sharp inner corner when cornerRadius <= innerGap", () => {
    const rOuter = 10;
    const gap = 12; // gap is larger than outer radius

    const shape = getOrnamentShape("rounded-rect", 400, 260, gap, rOuter);
    // Outer still has curve with radius 10
    expect(shape.fullPath).toContain(`A ${rOuter} ${rOuter}`);
    // Inner radius icr = max(0, 10 - 12) = 0, so no A command in inner path (sharp square)
    expect(shape.innerFullPath).not.toContain("A ");
  });

  it("updates bottom corners of arch-window with concentric inner curves", () => {
    const botR = 25;
    const gap = 10;
    const expectedInnerBotR = botR - gap; // 15

    const shape = getOrnamentShape("arch-window", 400, 260, gap, botR);
    expect(shape.leftPath).toContain(`A ${botR} ${botR}`);
    expect(shape.innerLeftPath).toContain(`A ${expectedInnerBotR} ${expectedInnerBotR}`);
  });
});
