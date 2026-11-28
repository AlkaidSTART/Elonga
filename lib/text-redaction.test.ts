import { describe, expect, it } from "vitest";
import { replaceAllLiteral, scanSensitiveEntities } from "@/lib/text-redaction";

describe("scanSensitiveEntities", () => {
  it("returns an empty array for blank text", () => {
    expect(scanSensitiveEntities("")).toEqual([]);
    expect(scanSensitiveEntities("   \n\t  ")).toEqual([]);
  });

  it("detects names, phone numbers, addresses, ID cards, and schools", () => {
    const sample = [
      "受助学生张小明，学校：阳光小学三年级，",
      "住址：幸福社区12号楼302室，",
      "联系电话13812345678，",
      "身份证号110101201001011234。",
    ].join("");

    const matches = scanSensitiveEntities(sample);
    const byCategory = new Map(matches.map((item) => [item.category, item]));

    expect(byCategory.get("name")?.original).toBe("张小明");
    expect(byCategory.get("name")?.suggestedReplacement).toBe("小张（化名）");

    expect(byCategory.get("school")?.original).toBe("阳光小学三年级");
    expect(byCategory.get("school")?.suggestedReplacement).toBe("当地某学校（已模糊）");

    expect(byCategory.get("address")?.original).toBe("幸福社区12号楼302室");
    expect(byCategory.get("address")?.suggestedReplacement).toBe("当地某社区（地址已模糊）");

    expect(byCategory.get("phone")?.original).toBe("13812345678");
    expect(byCategory.get("phone")?.suggestedReplacement).toBe("138****5678");

    expect(byCategory.get("idCard")?.original).toBe("110101201001011234");
    expect(byCategory.get("idCard")?.suggestedReplacement).toBe("[证件号已隐去]");
  });

  it("skips names that are already pseudonymized or common false positives", () => {
    const sample = "志愿者张小明（化名）与爱心人士一起看望了小朋友。";
    const matches = scanSensitiveEntities(sample);
    expect(matches.filter((item) => item.category === "name")).toEqual([]);
  });
});

describe("replaceAllLiteral", () => {
  it("replaces all occurrences of a literal string", () => {
    expect(replaceAllLiteral("张小明和张小明一起参加活动", "张小明", "小张（化名）")).toBe(
      "小张（化名）和小张（化名）一起参加活动",
    );
  });

  it("returns original text when target is empty or equal to replacement", () => {
    expect(replaceAllLiteral("hello", "", "world")).toBe("hello");
    expect(replaceAllLiteral("hello", "hello", "hello")).toBe("hello");
  });
});
