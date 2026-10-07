import { describe, expect, it } from "vitest";
import { defaultSorveteriaFeatures } from "@/domain/featureFlags";

describe("vertical alimentação / sorveteria", () => {
  it("inclui cardápio online e QR Code por padrão", () => {
    expect(defaultSorveteriaFeatures.onlineMenu).toBe(true);
    expect(defaultSorveteriaFeatures.qrCodes).toBe(true);
  });

  it("mantém mesa opcional, não imposta ao domínio", () => {
    expect(defaultSorveteriaFeatures.tableOrdering).toBe(false);
  });
});
