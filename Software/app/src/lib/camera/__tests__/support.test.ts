import { describe, expect, it, vi } from "vitest";
import {
  getCameraUnavailableMessage,
  hasCameraSupport,
  requestUserMedia,
} from "@/lib/camera/support";

describe("camera support helpers", () => {
  it("detects modern getUserMedia support", () => {
    const navigatorLike = {
      mediaDevices: {
        getUserMedia: vi.fn(),
      },
    } as unknown as Navigator;

    expect(hasCameraSupport(navigatorLike)).toBe(true);
  });

  it("detects legacy getUserMedia support", () => {
    const navigatorLike = {
      webkitGetUserMedia: vi.fn(),
    } as unknown as Navigator;

    expect(hasCameraSupport(navigatorLike)).toBe(true);
  });

  it("returns actionable message for insecure mobile contexts", () => {
    expect(
      getCameraUnavailableMessage({
        isSecureContext: false,
      }),
    ).toContain("HTTPS ou localhost");
  });

  it("requests stream using legacy getUserMedia when mediaDevices is unavailable", async () => {
    const expectedStream = { id: "legacy-stream" } as MediaStream;
    const navigatorLike = {
      webkitGetUserMedia: vi.fn((_constraints, onSuccess) => {
        onSuccess(expectedStream);
      }),
    } as unknown as Navigator;

    await expect(
      requestUserMedia(navigatorLike, { video: true, audio: false }),
    ).resolves.toBe(expectedStream);
  });
});
