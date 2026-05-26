/**
 * tests/snapGuides.test.js — Unit tests for snapGuides.js
 * Covers: canvas edge snap, canvas center snap, peer edge/center snap,
 * zoom-adjusted threshold, snap disabled, grid snap,
 * alignment commands, distribution commands.
 */

import { describe, it, expect } from 'vitest';
import {
  getElementBounds,
  getCanvasSnapTargets,
  getElementSnapTargets,
  computeSnap,
  applySnapDelta,
  computeAlignmentGuides,
  alignElements,
  distributeElements,
} from '../src/editor/utils/snapGuides.js';

// ─── getElementBounds ─────────────────────────────────────────────

describe('getElementBounds', () => {
  it('computes bounds from x/y/width/height', () => {
    const b = getElementBounds({ id: 'a', x: 10, y: 20, width: 100, height: 50, scale: 1 });
    expect(b.left).toBe(10);
    expect(b.top).toBe(20);
    expect(b.right).toBe(110);
    expect(b.bottom).toBe(70);
    expect(b.centerX).toBe(60);
    expect(b.centerY).toBe(45);
    expect(b.width).toBe(100);
    expect(b.height).toBe(50);
  });

  it('applies scale to width/height', () => {
    const b = getElementBounds({ id: 'b', x: 0, y: 0, width: 200, height: 100, scale: 0.5 });
    expect(b.width).toBe(100);
    expect(b.height).toBe(50);
    expect(b.right).toBe(100);
    expect(b.bottom).toBe(50);
    expect(b.centerX).toBe(50);
    expect(b.centerY).toBe(25);
  });

  it('defaults to zero when fields missing', () => {
    const b = getElementBounds({});
    expect(b.left).toBe(0);
    expect(b.top).toBe(0);
    expect(b.right).toBe(0);
    expect(b.bottom).toBe(0);
  });
});

// ─── getCanvasSnapTargets ────────────────────────────────────────

describe('getCanvasSnapTargets', () => {
  it('returns 6 targets for a canvas', () => {
    const targets = getCanvasSnapTargets({ width: 1280, height: 720 });
    expect(targets).toHaveLength(6);
    const xTargets = targets.filter(t => t.axis === 'x');
    const yTargets = targets.filter(t => t.axis === 'y');
    expect(xTargets).toHaveLength(3);
    expect(yTargets).toHaveLength(3);
  });

  it('includes canvas center', () => {
    const targets = getCanvasSnapTargets({ width: 1280, height: 720 });
    const cx = targets.find(t => t.axis === 'x' && t.kind === 'canvas-center');
    const cy = targets.find(t => t.axis === 'y' && t.kind === 'canvas-center');
    expect(cx.at).toBe(640);
    expect(cy.at).toBe(360);
  });

  it('includes canvas edges', () => {
    const targets = getCanvasSnapTargets({ width: 1280, height: 720 });
    const edges = targets.filter(t => t.kind === 'canvas-edge');
    expect(edges).toHaveLength(4);
  });
});

// ─── getElementSnapTargets ────────────────────────────────────────

describe('getElementSnapTargets', () => {
  it('returns 6 targets per element (left/right/center × x/y)', () => {
    const targets = getElementSnapTargets([
      { id: 'a', x: 10, y: 20, width: 100, height: 50, scale: 1 },
    ]);
    expect(targets).toHaveLength(6);
  });

  it('excludes elements with ids in activeIds', () => {
    const targets = getElementSnapTargets(
      [{ id: 'a', x: 10, y: 20, width: 100, height: 50 }, { id: 'b', x: 200, y: 200, width: 80, height: 40 }],
      new Set(['a']),
    );
    expect(targets.every(t => t.peerId !== 'a')).toBe(true);
    expect(targets.every(t => t.peerId === 'b')).toBe(true);
  });

  it('produces peer-edge and peer-center kinds', () => {
    const targets = getElementSnapTargets([
      { id: 'a', x: 0, y: 0, width: 100, height: 50, scale: 1 },
    ]);
    const edgeKinds = targets.filter(t => t.kind === 'peer-edge');
    const centerKinds = targets.filter(t => t.kind === 'peer-center');
    expect(edgeKinds).toHaveLength(4); // left, right, top, bottom
    expect(centerKinds).toHaveLength(2); // centerX, centerY
  });
});

// ─── computeSnap ─────────────────────────────────────────────────

describe('computeSnap', () => {
  const canvasBounds = { width: 1280, height: 720 };

  it('snaps to canvas left edge', () => {
    const active = { left: 3, top: 100, right: 103, bottom: 200, centerX: 53, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1 });
    expect(result.deltaX).toBe(-3); // snaps to 0
    expect(result.guides.some(g => g.axis === 'x' && g.kind === 'canvas-edge')).toBe(true);
  });

  it('snaps to canvas center', () => {
    const active = { left: 590, top: 100, right: 690, bottom: 200, centerX: 640, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1 });
    // centerX = 640, canvas center = 640 → deltaX = 0
    expect(result.guides.some(g => g.kind === 'canvas-center')).toBe(true);
  });

  it('snaps to canvas right edge', () => {
    const active = { left: 1178, top: 100, right: 1278, bottom: 200, centerX: 1228, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1 });
    expect(result.deltaX).toBe(2); // right=1278 → 1280
    expect(result.guides.some(g => g.axis === 'x' && g.kind === 'canvas-edge')).toBe(true);
  });

  it('snaps to canvas vertical center', () => {
    const active = { left: 100, top: 308, right: 200, bottom: 408, centerX: 150, centerY: 358, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1 });
    expect(result.deltaY).toBe(2); // centerY=358 → 360
    expect(result.guides.some(g => g.axis === 'y' && g.kind === 'canvas-center')).toBe(true);
  });

  it('snaps to peer element edge', () => {
    const active = { left: 205, top: 100, right: 305, bottom: 200, centerX: 255, centerY: 150, width: 100, height: 100 };
    const peers = [{ id: 'p1', x: 200, y: 0, width: 100, height: 50, scale: 1 }];
    const result = computeSnap({ activeBounds: active, canvasBounds, peerBounds: peers, threshold: 6, zoom: 1 });
    // Peer right edge = 300, active left = 205, delta = -5
    expect(result.deltaX).toBe(-5);
    expect(result.matches.some(m => m.targetId === 'p1')).toBe(true);
  });

  it('snaps to peer bounds supplied by canvas callers', () => {
    const active = { left: 205, top: 100, right: 305, bottom: 200, centerX: 255, centerY: 150, width: 100, height: 100 };
    const peers = [getElementBounds({ id: 'p1', x: 200, y: 0, width: 100, height: 50, scale: 1 })];
    const result = computeSnap({ activeBounds: active, canvasBounds, peerBounds: peers, threshold: 6, zoom: 1, enableCanvas: false });
    expect(result.deltaX).toBe(-5);
    expect(result.matches.some(m => m.targetId === 'p1')).toBe(true);
  });

  it('snaps to peer element center', () => {
    const active = { left: 245, top: 100, right: 345, bottom: 200, centerX: 295, centerY: 150, width: 100, height: 100 };
    const peers = [{ id: 'p2', x: 200, y: 0, width: 100, height: 50, scale: 1 }]; // centerX=250
    const result = computeSnap({ activeBounds: active, canvasBounds, peerBounds: peers, threshold: 6, zoom: 1, axes: ['x'] });
    // Active left=245, peer centerX=250, distance=5 — within threshold 6 → snap
    // delta = 250 - 245 = 5
    expect(result.deltaX).toBe(5);
    expect(result.matches.some(m => m.targetId === 'p2')).toBe(true);
  });

  it('does not snap when beyond threshold', () => {
    const active = { left: 310, top: 100, right: 410, bottom: 200, centerX: 360, centerY: 150, width: 100, height: 100 };
    const peers = [{ id: 'p2', x: 200, y: 0, width: 100, height: 50, scale: 1 }]; // centerX=250, right=300
    const result = computeSnap({ activeBounds: active, canvasBounds, peerBounds: peers, threshold: 6, zoom: 1, axes: ['x'], enableCanvas: false });
    // Peer right=300, active left=310, distance=10 — beyond threshold
    expect(result.deltaX).toBe(0);
  });

  it('adjusts threshold for zoom', () => {
    // At 2× zoom, 6 visual px = 3 canvas px
    const active = { left: 2, top: 100, right: 102, bottom: 200, centerX: 52, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 2 });
    // canvasThreshold = 6/2 = 3, left=2 is within 3 of 0 → snap
    expect(result.deltaX).toBe(-2);

    const result2 = computeSnap({ activeBounds: { ...active, left: 4 }, canvasBounds, threshold: 6, zoom: 2 });
    // left=4, distance to 0 = 4 > threshold 3 → no snap
    expect(result2.deltaX).toBe(0);
  });

  it('returns no snap when disabled', () => {
    const active = { left: 2, top: 100, right: 102, bottom: 200, centerX: 52, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1, enableCanvas: false, enablePeers: false });
    expect(result.deltaX).toBe(0);
    expect(result.deltaY).toBe(0);
    expect(result.guides).toHaveLength(0);
  });

  it('snaps to grid when enabled', () => {
    // left=14, grid at 16 → delta=2, but centerX=64 exactly on grid line 64
    // Use an active where left is the closest grid point
    const active = { left: 14, top: 100, right: 114, bottom: 200, centerX: 64, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1, enableCanvas: false, enablePeers: false, enableGrid: true, gridSize: 16 });
    // Both left=14 (→16, delta=2) and centerX=64 (→64, delta=0) are within threshold.
    // The closest match wins: centerX=64 is distance 0.
    expect(result.deltaX).toBe(0);
    expect(result.guides.some(g => g.kind === 'grid')).toBe(true);
  });

  it('snaps to nearest grid line', () => {
    // Only left edge is near a grid line; no center match
    const active = { left: 14, top: 100, right: 114, bottom: 200, centerX: 64, centerY: 150, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1, enableCanvas: false, enablePeers: false, enableGrid: true, gridSize: 16, axes: ['y'] });
    // Only y-axis: top=100, grid at 96 and 112. top=100 is 4 away from 96.
    expect(result.deltaY).toBe(-4);
  });

  it('snaps on only specified axes', () => {
    const active = { left: 2, top: 2, right: 102, bottom: 102, centerX: 52, centerY: 52, width: 100, height: 100 };
    const result = computeSnap({ activeBounds: active, canvasBounds, threshold: 6, zoom: 1, axes: ['x'] });
    expect(result.deltaX).toBe(-2);
    expect(result.deltaY).toBe(0);
  });
});

// ─── applySnapDelta ──────────────────────────────────────────────

describe('applySnapDelta', () => {
  it('shifts all bounds fields', () => {
    const b = { left: 10, top: 20, right: 110, bottom: 120, centerX: 60, centerY: 70, width: 100, height: 100 };
    const result = applySnapDelta(b, { deltaX: 5, deltaY: -3 });
    expect(result.left).toBe(15);
    expect(result.top).toBe(17);
    expect(result.right).toBe(115);
    expect(result.bottom).toBe(117);
    expect(result.centerX).toBe(65);
    expect(result.centerY).toBe(67);
  });
});

// ─── computeAlignmentGuides ──────────────────────────────────────

describe('computeAlignmentGuides', () => {
  it('extracts guides from snap result', () => {
    const snapResult = {
      deltaX: 0,
      deltaY: -4,
      guides: [{ axis: 'y', at: 360, kind: 'canvas-center' }],
      matches: [],
    };
    expect(computeAlignmentGuides(snapResult)).toEqual([{ axis: 'y', at: 360, kind: 'canvas-center' }]);
  });
});

// ─── alignElements ───────────────────────────────────────────────

describe('alignElements', () => {
  const canvasBounds = { width: 1280, height: 720 };

  it('aligns left', () => {
    const els = [
      { id: 'a', x: 100, y: 0, width: 50, height: 50, scale: 1 },
      { id: 'b', x: 200, y: 0, width: 50, height: 50, scale: 1 },
    ];
    alignElements(els, new Set(['a', 'b']), 'left', canvasBounds);
    expect(els[0].x).toBe(100);
    expect(els[1].x).toBe(100);
  });

  it('aligns horizontal center', () => {
    const els = [
      { id: 'a', x: 100, y: 0, width: 50, height: 50, scale: 1 }, // centerX=125
      { id: 'b', x: 200, y: 0, width: 80, height: 50, scale: 1 },  // centerX=240
    ];
    alignElements(els, new Set(['a', 'b']), 'horizontal-center', canvasBounds);
    // ref = min center = 125
    // b needs delta = 125-240 = -115
    expect(els[0].x).toBe(100);
    expect(els[1].x).toBe(85); // 200 + (-115) = 85
  });

  it('aligns right', () => {
    const els = [
      { id: 'a', x: 100, y: 0, width: 50, height: 50, scale: 1 },  // right=150
      { id: 'b', x: 200, y: 0, width: 80, height: 50, scale: 1 },  // right=280
    ];
    alignElements(els, new Set(['a', 'b']), 'right', canvasBounds);
    // ref = max right = 280
    // a needs delta = 280-150 = 130
    expect(els[0].x).toBe(230); // 100 + 130
    expect(els[1].x).toBe(200);
  });

  it('aligns top', () => {
    const els = [
      { id: 'a', x: 0, y: 50, width: 50, height: 50, scale: 1 },
      { id: 'b', x: 0, y: 150, width: 50, height: 50, scale: 1 },
    ];
    alignElements(els, new Set(['a', 'b']), 'top', canvasBounds);
    expect(els[0].y).toBe(50);
    expect(els[1].y).toBe(50);
  });

  it('aligns vertical center', () => {
    const els = [
      { id: 'a', x: 0, y: 50, width: 50, height: 50, scale: 1 },  // centerY=75
      { id: 'b', x: 0, y: 150, width: 50, height: 80, scale: 1 },  // centerY=190
    ];
    alignElements(els, new Set(['a', 'b']), 'vertical-center', canvasBounds);
    // ref = min center = 75
    // b delta = 75 - 190 = -115
    expect(els[1].y).toBe(35); // 150 + (-115) = 35
  });

  it('aligns bottom', () => {
    const els = [
      { id: 'a', x: 0, y: 50, width: 50, height: 50, scale: 1 },  // bottom=100
      { id: 'b', x: 0, y: 150, width: 50, height: 80, scale: 1 },  // bottom=230
    ];
    alignElements(els, new Set(['a', 'b']), 'bottom', canvasBounds);
    // ref = max bottom = 230
    // a delta = 230 - 100 = 130
    expect(els[0].y).toBe(180); // 50 + 130
    expect(els[1].y).toBe(150);
  });

  it('does nothing with fewer than 2 selected', () => {
    const els = [{ id: 'a', x: 100, y: 0, width: 50, height: 50, scale: 1 }];
    alignElements(els, new Set(['a']), 'left', canvasBounds);
    expect(els[0].x).toBe(100);
  });

  it('throws on unknown command', () => {
    expect(() => alignElements([], new Set(), 'invalid', {})).toThrow('Unknown alignment command');
  });

  it('does not move unselected elements', () => {
    const els = [
      { id: 'a', x: 100, y: 0, width: 50, height: 50, scale: 1 },
      { id: 'b', x: 300, y: 0, width: 50, height: 50, scale: 1 },  // unselected
      { id: 'c', x: 500, y: 0, width: 50, height: 50, scale: 1 },
    ];
    // Only select 'a' and 'c' — 'b' must not be moved
    alignElements(els, new Set(['a', 'c']), 'left', canvasBounds);
    expect(els[1].x).toBe(300); // 'b' stays at original position
    expect(els[1].y).toBe(0);
  });
});

// ─── distributeElements ──────────────────────────────────────────

describe('distributeElements', () => {
  it('distributes horizontally', () => {
    const els = [
      { id: 'a', x: 0, y: 0, width: 50, height: 50, scale: 1 },    // centerX=25
      { id: 'b', x: 200, y: 0, width: 50, height: 50, scale: 1 },   // centerX=225
      { id: 'c', x: 500, y: 0, width: 50, height: 50, scale: 1 },   // centerX=525
    ];
    distributeElements(els, new Set(['a', 'b', 'c']), 'x');
    // First stays at centerX=25, last at 525
    // Step = (525-25)/2 = 250
    // b center should be 25 + 250 = 275, so b.x = 275 - 25 = 250
    expect(els[1].x).toBe(250);
  });

  it('distributes vertically', () => {
    const els = [
      { id: 'a', x: 0, y: 0, width: 50, height: 50, scale: 1 },    // centerY=25
      { id: 'b', x: 0, y: 200, width: 50, height: 50, scale: 1 },  // centerY=225
      { id: 'c', x: 0, y: 500, width: 50, height: 50, scale: 1 },  // centerY=525
    ];
    distributeElements(els, new Set(['a', 'b', 'c']), 'y');
    expect(els[1].y).toBe(250);
  });

  it('does nothing with fewer than 3 selected', () => {
    const els = [
      { id: 'a', x: 0, y: 0, width: 50, height: 50, scale: 1 },
      { id: 'b', x: 200, y: 0, width: 50, height: 50, scale: 1 },
    ];
    const origX = els[1].x;
    distributeElements(els, new Set(['a', 'b']), 'x');
    expect(els[1].x).toBe(origX);
  });

  it('does not move unselected elements', () => {
    const els = [
      { id: 'a', x: 0, y: 0, width: 50, height: 50, scale: 1 },    // selected
      { id: 'b', x: 100, y: 0, width: 50, height: 50, scale: 1 },   // unselected
      { id: 'c', x: 500, y: 0, width: 50, height: 50, scale: 1 },   // selected
    ];
    const origBx = els[1].x;
    distributeElements(els, new Set(['a', 'c']), 'x');
    expect(els[1].x).toBe(origBx); // 'b' stays at original position
  });
});
