import { describe, expect, it } from "vitest";
import { parseRecipeTags } from "./recipe-tags";

describe("recipe tags", () => {
  it("accepts exactly three unique tags and normalizes whitespace", () => {
    expect(parseRecipeTags({ tags: [" Morot ", "vita   bönor", "rosmarin"] })).toEqual(["Morot", "vita bönor", "rosmarin"]);
  });

  it("rejects the wrong number of tags", () => {
    expect(() => parseRecipeTags({ tags: ["morot", "bönor"] })).toThrow("exakt tre");
    expect(() => parseRecipeTags({ tags: ["morot", "bönor", "rosmarin", "citron"] })).toThrow("exakt tre");
  });

  it("rejects case-insensitive duplicates", () => {
    expect(() => parseRecipeTags({ tags: ["Morot", "morot", "rosmarin"] })).toThrow("dubbletter");
  });
});

