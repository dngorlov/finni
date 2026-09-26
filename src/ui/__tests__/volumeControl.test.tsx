import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { VolumeControl } from "../components/VolumeControl";
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

async function renderControl() {
  const changes: number[] = [];
  const commits: number[] = [];

  function Harness() {
    const [value, setValue] = useState(80);
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
