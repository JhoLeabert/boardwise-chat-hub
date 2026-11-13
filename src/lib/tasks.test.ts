import { describe, it, expect } from "vitest";
import { completionPercent, positionAt } from "./tasks";

describe("tasks helpers", () => {
  it("completion is share of done tasks", () => {
    expect(completionPercent([{ status: "done" }, { status: "todo" }, { status: "review" }, { status: "done" }])).toBe(50);
    expect(completionPercent([])).toBe(0);
  });
  it("positions between neighbours", () => {
    expect(positionAt([{ position: 1 }, { position: 2 }], 1)).toBe(1.5);
    expect(positionAt([{ position: 1 }], 0)).toBe(0);
    expect(positionAt([{ position: 1 }], 1)).toBe(2);
    expect(positionAt([], 0)).toBe(1);
  });
});
