import { useState } from "react";
import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { VOLUME_REPEAT_DELAY_MS, VOLUME_REPEAT_EVERY_MS, VolumeControl } from "../components/VolumeControl";
import { strings } from "../strings";

type Node = ReturnType<typeof screen.getByRole>;
type HostNode = { props: Record<string, unknown>; parent: HostNode | null; children: (HostNode | string)[] };

const TRACK_WIDTH = 200;

/**
 * A finger moving along the track. `pageX` is the window position.
 * `locationX` is whatever view happens to be under the finger — the fill,
 * the label, the card — so it is not a position on the track.
 */
function finger(pageX: number, locationX: number, stamp: number) {
  return {
    nativeEvent: {
      pageX,
      pageY: 40,
      locationX,
      locationY: 12,
      touches: [{ pageX, locationX }],
      timestamp: stamp,
    },
    touchHistory: {
      mostRecentTimeStamp: stamp,
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      touchBank: [
        {
          touchActive: true,
          currentTimeStamp: stamp,
          previousTimeStamp: stamp - 1,
          currentPageX: pageX,
          currentPageY: 40,
          previousPageX: pageX,
          previousPageY: 40,
        },
      ],
    },
  };
}

function trackHit(): Node {
  const quieter = screen.getByRole("button", { name: strings.soundQuieter }) as unknown as HostNode;
  const row = quieter.parent;
  if (row == null) {
    throw new Error("volume track row missing");
  }
  const track = row.children.find(
    (child): child is HostNode => typeof child !== "string" && typeof child.props.onLayout === "function",
  );
  if (track == null) {
    throw new Error("volume track missing");
  }
  return track as unknown as Node;
}

async function renderControl(start = 80) {
  const changes: number[] = [];
  const commits: number[] = [];

  function Harness() {
    const [value, setValue] = useState(start);
    return (
      <VolumeControl
        value={value}
        onChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
        onCommit={(next) => {
          commits.push(next);
          setValue(next);
        }}
      />
    );
  }

  await render(<Harness />);
  await fireEvent(trackHit(), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: TRACK_WIDTH, height: 48 } },
  });
  return { changes, commits };
}

describe("VolumeControl drag", () => {
  it("follows the finger when locationX jumps to another view", async () => {
    const { changes, commits } = await renderControl();
    const track = trackHit();

    // Track starts at window x = 100. Grant is still on the track (locationX 60 → 30%).
    // Later samples are the same finger in window space, but locationX is local to
    // whatever view the finger drifted over.
    await fireEvent(track, "responderGrant", finger(160, 60, 1));
    await fireEvent(track, "responderMove", finger(200, 15, 2));
    await fireEvent(track, "responderMove", finger(240, 8, 3));
    await fireEvent(track, "responderMove", finger(180, 140, 4));
    await fireEvent(track, "responderRelease", finger(180, 140, 5));

    expect(changes).toEqual([30, 50, 70, 40]);
    expect(commits).toEqual([40]);
  });
});

describe("VolumeControl −/+ buttons", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const quieter = () => screen.getByRole("button", { name: strings.soundQuieter });
  const louder = () => screen.getByRole("button", { name: strings.soundLouder });

  it("a tap steps once and commits once", async () => {
    const { changes, commits } = await renderControl(50);
    await fireEvent(louder(), "pressIn");
    await fireEvent(louder(), "pressOut");
    await fireEvent.press(louder());
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(changes).toEqual([60]);
    expect(commits).toEqual([60]);
    expect(screen.getByText(strings.soundLevel(60))).toBeOnTheScreen();
  });

  it("a real tap (pressIn, pressOut, press) steps once and commits once", async () => {
    const { changes, commits } = await renderControl(50);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(quieter());
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(changes).toEqual([40]);
    expect(commits).toEqual([40]);
  });

  it("a press with no pressIn (screen reader) still steps and commits", async () => {
    const { changes, commits } = await renderControl(50);
    await fireEvent.press(quieter());
    expect(changes).toEqual([]);
    expect(commits).toEqual([40]);
  });

  it("holding − keeps stepping after the delay and commits once on release", async () => {
    const { changes, commits } = await renderControl(80);
    await fireEvent(quieter(), "pressIn");
    expect(changes).toEqual([70]);

    await act(async () => {
      jest.advanceTimersByTime(VOLUME_REPEAT_DELAY_MS - 1);
    });
    expect(changes).toEqual([70]);

    await act(async () => {
      jest.advanceTimersByTime(1 + VOLUME_REPEAT_EVERY_MS * 2);
    });
    expect(changes).toEqual([70, 60, 50]);
    expect(commits).toEqual([]);

    await fireEvent(quieter(), "pressOut");
    await fireEvent.press(quieter());
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(changes).toEqual([70, 60, 50]);
    expect(commits).toEqual([50]);
  });

  it("holding + stops at 100 and still commits on release", async () => {
    const { changes, commits } = await renderControl(70);
    await fireEvent(louder(), "pressIn");
    await act(async () => {
      jest.advanceTimersByTime(VOLUME_REPEAT_DELAY_MS + VOLUME_REPEAT_EVERY_MS * 10);
    });
    expect(changes).toEqual([80, 90, 100]);
    await fireEvent(louder(), "pressOut");
    expect(commits).toEqual([100]);
    expect(louder()).toBeDisabled();
  });

  it("stops the repeat timers on unmount", async () => {
    const { changes } = await renderControl(80);
    await fireEvent(quieter(), "pressIn");
    await screen.unmount();
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(changes).toEqual([70]);
  });
});
