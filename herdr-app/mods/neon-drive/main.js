// Neon Drive: a synthwave strip where a sports car holds its place on a neon
// road while the scenery scrolls past in parallax layers. It travels: every
// LEG_MS it moves to the next scene in ITINERARY, passing a roadside
// structure (TRANSITIONS: a tunnel, an exit sign, a billboard, a truck
// stop, an overpass)
// that rolls by in front of the car. The new scene's edge rides hidden behind that structure, so one
// scene turns into the next without a visible seam.
// The `neon-drive.next_scene` key command skips ahead to the next leg.
//
// The road goes faster while an agent is working, slower with hazards
// flashing while one is blocked, and cruises otherwise.
//
// Motion is native. The road dashes are text frames. Each scenery layer is a
// strip of tiles that slides left one tile width with a linear transition,
// then is swapped for a fresh copy at 0 (a new id, so it doesn't slide back).
// A leg's layers sit in clips: an arriving leg's clips slide in from the
// right while their content slides the other way (so the scenery stays put
// on screen and is uncovered), and the leaving leg's clips narrow in step,
// so nothing of the old scene is left drawn under the new one.
//
// Drawing order: tinted icons (svg) draw above full-colour images whatever
// their order, so whatever must cover one is made of tinted icons too (the
// tunnel, the overpass, the wind farm's poles). And anything spinning draws
// above everything, even clips: so a wheel stops spinning while a structure
// covers it, and turbine blades stop while a scene change is under way.
import { View, div, image, svg, PathBuilder, Background } from "gpui-kit";
import { agents, props, nextCommand } from "herdr";

const H = 90; // strip height; the layout block should match
const HORIZON = 54;
const CHAR_W = 7.2; // JetBrains Mono at 12px
const CAR_X = 0.16; // the car's spot, as a share of the width
const CAR_SCALE = 1.25; // the car's size over its 120x38 art
const SUN_X = 0.66; // the sun's spot, as a share of the width
const ASSET = (f) => `mods/neon-drive/${f}`;

const ITINERARY = ["city", "bridge", "ocean", "desert", "windfarm"];
const LEG_MS = 15000; // time in each scene, its transition included
const COVER_SPEED = 450; // px/s a tunnel or overpass passes at

const PINK = "#ff2bd6";
const CYAN = "#2de2ff";
const AMBER = "#ffb01f";

// What each change passes through ("from>to"); anything unlisted: overpass.
// The story: out of downtown through a tunnel onto the bridge, off at the
// exit for the coast, past the diner billboard into the desert, by a truck
// stop out to the wind farm, and back into town under the interchange.
const TRANSITIONS = {
  "city>bridge": "tunnel",
  "bridge>ocean": "exit",
  "ocean>desert": "billboard",
  "desert>windfarm": "truckstop",
  "windfarm>city": "overpass",
};

// Structures drawn side-on over the whole strip, `w` px wide, as tinted
// pieces back to front ([file, color, pulse?], pulse: an opacity loop
// [from, to, period]), then text `labels`. The scene's seam rides at `seam`
// px from the left, behind a part that is solid top to bottom. `solid` lists
// the [x0, x1] spans that hide the car (its wheels pause behind them).
const COVERS = {
  tunnel: {
    w: 300, seam: 150, solid: [[0, 300]],
    pieces: [
      ["scenes/tunnel/body.svg", "#1a0833"],
      ["scenes/tunnel/strata.svg", "#2e1458"],
      ["scenes/tunnel/ridge.svg", PINK],
      ["scenes/tunnel/walls.svg", "#4a3a6a"],
      ["scenes/tunnel/joints.svg", "#2e2448"],
      ["scenes/tunnel/caps.svg", CYAN],
      ["scenes/tunnel/lamps.svg", AMBER],
    ],
  },
  truckstop: {
    w: 280, seam: 25, solid: [[20, 30], [118, 126], [150, 162], [210, 222], [258, 266]],
    pieces: [
      ["scenes/truckstop/shade.svg", "#05030a77"],
      ["scenes/truckstop/pole.svg", "#3a3f4b"],
      ["scenes/truckstop/signbox.svg", "#12062a"],
      ["scenes/truckstop/signborder.svg", AMBER, [0.7, 1, 1100]],
      ["scenes/truckstop/canopy.svg", "#1a1030"],
      ["scenes/truckstop/stripe.svg", CYAN],
      ["scenes/truckstop/lights.svg", "#fff6c2"],
      ["scenes/truckstop/pillars.svg", "#2a1f45"],
      ["scenes/truckstop/pumps.svg", "#4a3a6a"],
      ["scenes/truckstop/screens.svg", AMBER],
      ["scenes/truckstop/hoses.svg", "#0d0420"],
    ],
    labels: [
      { x: 10, y: 4, size: 10, color: AMBER, text: "TRUCK STOP" },
      { x: 10, y: 15, size: 7, color: "#e6e9ef", text: "DIESEL · CAFE · 24H" },
      { x: 176, y: 22, size: 7, color: CYAN, text: "DIESEL" },
    ],
  },
  overpass: {
    w: 260, seam: 32, solid: [[20, 44], [216, 240]],
    pieces: [
      ["scenes/overpass/shade.svg", "#05030a88"],
      ["scenes/overpass/deck.svg", "#1a1030"],
      ["scenes/overpass/parapet.svg", "#2e2448"],
      ["scenes/overpass/joints.svg", "#2a1f45"],
      ["scenes/overpass/trim.svg", PINK],
      ["scenes/overpass/piers.svg", "#2a1f45"],
      ["scenes/overpass/pierlight.svg", "#4a3a6a"],
      ["scenes/overpass/caps.svg", "#3a2f58"],
      ["scenes/overpass/lights.svg", AMBER],
    ],
  },
  exit: {
    w: 150, seam: 28, solid: [[24, 32], [118, 126]],
    pieces: [
      ["scenes/exit/posts.svg", "#3a3f4b"],
      ["scenes/exit/hoods.svg", "#2a2f3a"],
      ["scenes/exit/board.svg", "#0b2a3d"],
      ["scenes/exit/border.svg", CYAN],
      ["scenes/exit/tab.svg", AMBER],
    ],
    labels: [
      { x: 12, y: 9, size: 8, color: "#0b2a3d", text: "EXIT 88" },
      { x: 10, y: 22, size: 13, color: "#e6f7ff", text: "Ocean Blvd ▸" },
    ],
  },
  billboard: {
    w: 200, seam: 46, solid: [[40, 52], [148, 160]],
    pieces: [
      ["scenes/billboard/posts.svg", "#2a1f45"],
      ["scenes/billboard/arms.svg", "#3a2f58"],
      ["scenes/billboard/catwalk.svg", "#3a2f58"],
      ["scenes/billboard/board.svg", "#12062a"],
      ["scenes/billboard/border.svg", PINK, [0.75, 1, 1300]],
      ["scenes/billboard/cup.svg", PINK],
      ["scenes/billboard/steam.svg", CYAN, [0.2, 1, 1800]],
    ],
    labels: [
      { x: 54, y: 9, size: 15, color: PINK, text: "NEON DINER" },
      { x: 56, y: 28, size: 9, color: CYAN, text: "OPEN 24 HRS · EAT" },
    ],
  },
};

// Layers draw back to front; `speed` is px/s while cruising. A layer is an
// image (`file`) or tinted pieces (`tint`: [[file, color], ...]). Its bottom
// sits `lift` px above the horizon. `spin` turns a tinted icon at each `at`
// [x, y] of every tile, once per `ms` (one per spot), e.g. turbine blades.
// `sun: true` draws the sun at SUN_X (the same spot in every scene);
// `reflection` paints it on the water; `rail` runs a guardrail by the road.
const SCENES = {
  city: {
    rail: true,
    sky: ["#0b0320", "#4a0f63"],
    sun: true,
    layers: [
      { file: "scenes/city/far.svg", w: 420, h: 46, speed: 8 },
      { file: "scenes/city/near.svg", w: 560, h: 40, speed: 26 },
    ],
  },
  bridge: {
    rail: true,
    sky: ["#0b0320", "#4a0f63"],
    sun: true,
    layers: [
      { file: "scenes/bridge/bay.svg", w: 600, h: 28, speed: 7 },
      { file: "scenes/bridge/span.svg", w: 560, h: 52, speed: 34 },
    ],
  },
  ocean: {
    rail: true,
    sky: ["#0a0630", "#7a1a6e"],
    sun: true,
    reflection: true,
    layers: [
      { file: "scenes/ocean/islands.svg", w: 520, h: 22, lift: 20, speed: 5 },
      { file: "scenes/ocean/waves.svg", w: 600, h: 30, speed: 22 },
    ],
  },
  desert: {
    sky: ["#14042b", "#5a1470"],
    sun: true,
    layers: [
      { file: "scenes/desert/mountains.svg", w: 480, h: 40, speed: 6 },
      { file: "scenes/desert/palms.svg", w: 600, h: 44, speed: 30 },
    ],
  },
  windfarm: {
    sky: ["#120a3a", "#5a2a7a"],
    sun: true,
    layers: [
      { file: "scenes/windfarm/hills.svg", w: 520, h: 46, speed: 7,
        spin: { file: "scenes/windfarm/blade.svg", size: 22, color: "#e0c8ff",
                at: [[70, 10], [215, 16], [360, 8], [470, 18]], ms: [2400, 2900, 2100, 3300] } },
      { tint: [["scenes/windfarm/wires.svg", "#7a2fb0"], ["scenes/windfarm/fence.svg", "#3a1670"],
               ["scenes/windfarm/poles.svg", "#0d0420"]], w: 600, h: 40, speed: 30 },
    ],
  },
};

const PACE = {
  cruise: { factor: 1, tick: 90 }, // tick: ms per char of road dashes
  working: { factor: 2, tick: 45 },
  blocked: { factor: 0.5, tick: 180 },
};

const RAIL_H = 18; // the guardrail's band at the top of the ground

const RECT = () => PathBuilder.fill().move_to("0%", "0%").line_to("100%", "0%").line_to("100%", "100%").line_to("0%", "100%").close().build();

// Stars as shares of the width and px from the top, each with its own twinkle.
const STARS = [
  [0.04, 8, 1700], [0.11, 22, 2300], [0.19, 6, 1900], [0.27, 30, 2700], [0.33, 12, 2100],
  [0.42, 4, 2500], [0.5, 26, 1800], [0.58, 10, 3000], [0.66, 34, 2200], [0.74, 5, 2600],
  [0.83, 18, 2000], [0.9, 8, 2800], [0.96, 28, 2400],
];

// Text frames that scroll a repeating pattern to the left, one char per frame.
function scroller(pattern, width) {
  const n = Math.ceil(width / CHAR_W) + pattern.length;
  const line = pattern.repeat(Math.ceil(n / pattern.length) + 1);
  const frames = [];
  for (let k = 0; k < pattern.length; k++) frames.push(line.slice(k, k + n));
  return frames;
}

function mood() {
  const s = agents().map((a) => a.status);
  if (s.includes("blocked")) return "blocked";
  if (s.includes("working")) return "working";
  return "cruise";
}

const text = (color, size = 12) =>
  div().absolute().left(0).font_family("JetBrains Mono").text_size(size).line_height(1).whitespace_nowrap().text_color(color);

export default class NeonDrive extends View {
  init(_props, cx) {
    this.w = 1200;
    this.nextLeg = 0;
    // A leg is one stay in a scene. At most two are shown: the one being left
    // and the one arriving. Its `box` is where its clips sit, settled.
    this.legs = [];
    this.strips = {}; // `${leg}:${layer}` -> { gen, moving, ms }
    this.stop = Math.max(0, ITINERARY.indexOf(props()?.scene));
    const first = { id: this.nextLeg++, scene: ITINERARY[this.stop], arrived: true, box: { left: 0, width: this.w } };
    this.legs = [first];
    this.startStrips(first, cx);
    this.scheduleLeg(cx);
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "next_scene") this.advance(cx);
      }
    });
  }

  scheduleLeg(cx) {
    const token = (this.legToken = (this.legToken ?? 0) + 1);
    cx.timer.after(LEG_MS, (cx) => {
      if (token === this.legToken) this.advance(cx);
    });
  }

  // Move on to the next scene through its tunnel or overpass. The seam goes
  // from just off the right edge to just off the left, under the structure.
  advance(cx) {
    if (this.legs.length > 1) return; // one change at a time
    const old = this.legs[0];
    const from = ITINERARY[this.stop];
    this.stop = (this.stop + 1) % ITINERARY.length;
    const scene = ITINERARY[this.stop];
    const kind = TRANSITIONS[`${from}>${scene}`] ?? "overpass";
    const c = COVERS[kind];
    const w = this.w;
    const edge0 = w + c.seam; // the seam when the structure is just off the right
    const edge1 = -(c.w - c.seam); // and when it has gone off the left
    const ms = Math.round(((w + c.w) / COVER_SPEED) * 1000);
    const leg = {
      id: this.nextLeg++, scene, arrived: false,
      box: { left: edge1, width: w - edge1 },
      enter: { left: edge0 },
      cover: { kind, w, ms },
    };
    // The old leg's clips first reach exactly to the seam, then narrow with it.
    old.leave = { width: edge0 - old.box.left, ms: 1 };
    this.legs = [old, leg];
    this.startStrips(leg, cx);
    this.timeBlades(old, leg, c, ms, cx);
    // Each wheel stops spinning while a solid part covers it (8 px of margin
    // for timer slack). The structure's left edge goes from w to -c.w; a span
    // [a, b] covers a wheel [l, r] while that edge is between l - b and r - a.
    const carX = Math.round(w * CAR_X);
    const at = (left) => 50 + Math.round(((w - left) / (w + c.w)) * ms);
    const S = CAR_SCALE;
    this.still = { rear: 0, front: 0 };
    for (const [part, [l, r]] of Object.entries({ rear: [19 * S, 33 * S], front: [87 * S, 101 * S] })) {
      for (const [a, b] of c.solid) {
        cx.timer.after(at(carX + r - a + 8), (cx) => { this.still[part]++; cx.notify(); });
        cx.timer.after(at(carX + l - b - 8), (cx) => { this.still[part]--; cx.notify(); });
      }
    }
    cx.notify();
    cx.timer.after(50, (cx) => {
      leg.arrived = true;
      old.leave = { width: Math.max(0, edge1 - old.box.left), ms };
      cx.notify();
    });
    cx.timer.after(50 + ms + 100, (cx) => {
      this.legs = [leg];
      leg.cover = null;
      for (const key of Object.keys(this.strips)) if (!key.startsWith(`${leg.id}:`)) delete this.strips[key];
      cx.notify();
    });
    this.scheduleLeg(cx);
  }

  // Spinning icons draw above everything, clips too, so while a change is
  // under way each turbine blade spins only on its own scene's side of the
  // structure: the leaving scene's until the structure reaches it, the
  // arriving scene's once the structure has passed it. Both move linearly,
  // so each crossing is a straight-line meeting time.
  timeBlades(old, leg, c, ms, cx) {
    const w = this.w;
    const vc = (w + c.w) / ms; // px/ms the structure moves at
    this.blades = {};
    for (const [lg, leaving] of [[old, true], [leg, false]]) {
      SCENES[lg.scene].layers.forEach((l, i) => {
        if (!l.spin) return;
        const s = this.strips[`${lg.id}:${i}`];
        if (!s) return;
        const vb = l.w / s.ms; // px/ms the layer scrolls at
        const frac = Math.min(1, Math.max(0, (Date.now() - s.start) / s.ms));
        const tiles = Math.ceil(w / l.w) + 1;
        const half = l.spin.size / 2 + 4;
        for (let k = 0; k < tiles; k++) {
          l.spin.at.forEach(([bx], j) => {
            const x0 = k * l.w + bx - l.w * frac; // blade centre on screen now
            const key = `${lg.id}:${s.gen}:${k}:${j}`;
            // Leaving: until the structure's left edge reaches it. Arriving:
            // once the structure's right edge has passed it.
            const t = leaving
              ? (w + 50 * vc - x0 - half) / (vc - vb)
              : (w + c.w + 50 * vc - x0 + half) / (vc - vb);
            this.blades[key] = leaving;
            if (t > 0) cx.timer.after(Math.round(t), (cx) => { this.blades[key] = !leaving; cx.notify(); });
            else this.blades[key] = !leaving;
          });
        }
      });
    }
  }

  startStrips(leg, cx) {
    SCENES[leg.scene].layers.forEach((_l, i) => this.cycle(leg.id, i, cx));
  }

  // One self-rescheduling chain per shown layer; it stops once its leg goes.
  cycle(legId, i, cx) {
    const key = `${legId}:${i}`;
    const leg = this.legs.find((l) => l.id === legId);
    if (!leg) return;
    const layer = SCENES[leg.scene].layers[i];
    const ms = Math.round((layer.w / (layer.speed * PACE[mood()].factor)) * 1000);
    const s = (this.strips[key] = { gen: (this.strips[key]?.gen ?? 0) + 1, moving: false, ms, start: Date.now() + 50 });
    cx.notify();
    cx.timer.after(50, (cx) => {
      if (this.strips[key] !== s) return;
      s.moving = true;
      cx.notify();
    });
    cx.timer.after(ms + 50, (cx) => {
      if (this.strips[key] === s) this.cycle(legId, i, cx);
    });
  }

  // A clip for one of a leg's layers: where it sits (sliding in while the leg
  // arrives, narrowing while it leaves) and content held still on screen.
  clip(leg, id, top, h, content) {
    const w = this.w;
    const slide = leg.cover ? { duration: leg.cover.ms, easing: "linear" } : { duration: 1, easing: "linear" };
    const left = leg.arrived ? leg.box.left : leg.enter.left;
    const width = leg.leave ? leg.leave.width : leg.box.width;
    return div().id(`clip-${leg.id}-${id}`).absolute().top(top).h(h).overflow_hidden()
      .left(left).transition("left", slide)
      .w(width).transition("width", { duration: leg.leave?.ms ?? 1, easing: "linear" })
      .child(div().id(`hold-${leg.id}-${id}`).absolute().top(0).h(h).w(w)
        .left(-left).transition("left", slide)
        .children(content));
  }

  // A leg's scenery. The back layer covers the whole sky (gradient, stars,
  // sun and its art).
  renderLeg(leg) {
    const w = this.w;
    const scene = SCENES[leg.scene];
    return scene.layers.map((l, i) => {
      const s = this.strips[`${leg.id}:${i}`] ?? { gen: 0, moving: false, ms: 10000 };
      const tiles = Math.ceil(w / l.w) + 1;
      const back = i === 0;
      const artTop = HORIZON - (l.lift ?? 0) - l.h;
      const tile = (k) => div().absolute().top(0).left(k * l.w).w(l.w).h(l.h)
        .when(Boolean(l.file), (el) => el.child(image(ASSET(l.file)).w(l.w).h(l.h)))
        .when(Boolean(l.tint), (el) => el.children(l.tint.map(([f, color]) =>
          div().absolute().top(0).left(0).child(svg(ASSET(f)).w(l.w).h(l.h).text_color(color)))))
        .when(Boolean(l.spin), (el) => el.children(l.spin.at.map(([x, y], j) =>
          div().absolute().left(x - l.spin.size / 2).top(y - l.spin.size / 2)
            .child(svg(ASSET(l.spin.file)).w(l.spin.size).h(l.spin.size).text_color(l.spin.color)
              .when(this.legs.length === 1 || Boolean(this.blades?.[`${leg.id}:${s.gen}:${k}:${j}`]), (el) => el.spin(l.spin.ms[j]))))));
      const strip = div().id(`strip-${leg.id}-${i}-${s.gen}`)
        .absolute().top(back ? artTop : 0).h(l.h).w(tiles * l.w)
        .left(s.moving ? -l.w : 0)
        .transition("left", { duration: s.ms, easing: "linear" })
        .children(Array.from({ length: tiles }, (_, k) => tile(k)));
      const content = [];
      if (back) {
        content.push(window.paint_path(RECT(), Background.linear_gradient(180, scene.sky[0], scene.sky[1]))
          .absolute().top(0).left(0).size_full());
        for (const [k, [x, y, p]] of STARS.entries()) {
          content.push(div().id(`star-${leg.id}-${k}`).absolute().left(Math.round(x * w)).top(y).w(2).h(2).rounded_full().bg("#ffe9ff")
            .loop("opacity", { from: 0.15, to: 1, period: p }));
        }
        if (scene.sun) {
          content.push(div().id(`sun-${leg.id}`).absolute().top(HORIZON - 74).left(Math.round(w * SUN_X) - 40)
            .child(image(ASSET("sun.svg")).w(80).h(80))
            .loop("opacity", { from: 0.85, to: 1, period: 3200 }));
        }
      }
      content.push(strip);
      if (scene.reflection && i === scene.layers.length - 1) {
        for (const [k, [dy, rw]] of [[0, 46], [4, 34], [8, 24], [12, 14], [16, 8]].entries()) {
          content.push(div().id(`glint-${leg.id}-${k}`).absolute().top(l.h - 20 + dy + 1).h(2).w(rw).rounded(1)
            .left(Math.round(w * SUN_X) - rw / 2).bg(k < 2 ? "#ff8a3d" : PINK)
            .loop("opacity", { from: 0.35, to: 0.9, period: 1600 + k * 300 }));
        }
      }
      return back ? this.clip(leg, i, 0, HORIZON, content) : this.clip(leg, i, artTop, l.h, content);
    });
  }

  // A leg's guardrail, in the ground's coordinates, clipped like its layers.
  renderRail(leg, tick) {
    if (!SCENES[leg.scene].rail) return [];
    const w = this.w;
    return [this.clip(leg, "rail", 0, RAIL_H, [
      text("#7a2fb0", 10).top(5).frames(scroller("┼──────", w), tick * 2),
      div().absolute().left(0).top(RAIL_H - 1).w(w).h(1).bg("#c13cff"),
    ])];
  }

  // The tunnel or overpass of an arriving leg, over everything, its seam
  // point travelling with the leg's edge.
  renderCover(leg) {
    const c = COVERS[leg.cover.kind];
    return div().id(`cover-${leg.id}`).absolute().top(0).w(c.w).h(H)
      .left(leg.arrived ? -c.w : leg.cover.w).transition("left", { duration: leg.cover.ms, easing: "linear" })
      .children(c.pieces.map(([f, color, pulse]) =>
        div().absolute().top(0).left(0).child(svg(ASSET(f)).w(c.w).h(H).text_color(color))
          .when(Boolean(pulse), (el) => el.loop("opacity", { from: pulse[0], to: pulse[1], period: pulse[2] }))))
      .children((c.labels ?? []).map((t) =>
        div().absolute().left(t.x).top(t.y).text_size(t.size).line_height(1).font_weight(700)
          .whitespace_nowrap().text_color(t.color).child(t.text)));
  }

  render() {
    const w = this.w;
    const m = mood();
    const { tick } = PACE[m];

    // Sky: each shown leg's layers, oldest first, clipped at the horizon.
    const sky = div().absolute().left(0).top(0).w_full().h(HORIZON).overflow_hidden()
      .children(this.legs.flatMap((leg) => this.renderLeg(leg)));

    // Ground: each leg's guardrail, the road edges and the lane dashes.
    const ground = div().absolute().left(0).top(HORIZON).w_full().h(H - HORIZON).bg("#0a0514").overflow_hidden()
      .child(div().absolute().left(0).top(0).w_full().h(2).bg(PINK))
      .children(this.legs.flatMap((leg) => this.renderRail(leg, tick)))
      .child(text(CYAN).top(22).frames(scroller("────    ", w), tick))
      .child(div().absolute().left(0).top(H - HORIZON - 2).w_full().h(2).bg(PINK).loop("opacity", { from: 0.6, to: 1, period: 1400 }));

    // The car holds its spot; it only bobs and spins its wheels. It's drawn at
    // CAR_SCALE over its 120x38 art, wheels on the road, roof above the horizon.
    const S = CAR_SCALE;
    const hazard = (x, y) => div().absolute().left(x * S).top(y * S).w(4 * S).h(3 * S).rounded(1).bg(AMBER)
      .loop("opacity", { from: 0, to: 1, period: 700 });
    const wheel = (x, still) => div().absolute().left(x * S).top(22 * S)
      .child(svg(ASSET("turbine.svg")).w(14 * S).h(14 * S).text_color("#d8dce8").when(!still, (el) => el.spin(tick * 12)));
    const car = div().absolute().top(H - 4 - 38 * S).left(Math.round(w * CAR_X)).w(120 * S).h(38 * S)
      .child(div().absolute().left(0).top(0).w(120 * S).h(38 * S)
        .loop("top", { from: 0, to: -1, period: m === "working" ? 260 : 520 })
        .child(image(ASSET("fox-black.svg")).w(120 * S).h(38 * S))
        .child(wheel(19, this.still?.rear > 0))
        .child(wheel(87, this.still?.front > 0))
        .when(m === "blocked", (el) => el.child(hazard(2.6, 18.6)).child(hazard(104, 18.2)))
        .when(m === "working", (el) => el.child(text(PINK, 11).left(-34 * S).top(16 * S).frames(["≡  ", " ≡ ", "  ≡", "═≡ "], 90))));

    return div()
      .id("neon-drive")
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.w) > 1) {
          this.w = size.width;
          for (const leg of this.legs) if (!leg.cover && !leg.leave) leg.box = { left: Math.min(0, leg.box.left), width: size.width - Math.min(0, leg.box.left) };
          cx.notify();
        }
      })
      .relative().size_full().overflow_hidden().bg("#0b0320")
      .child(sky)
      .child(ground)
      .child(car)
      .children(this.legs.filter((leg) => leg.cover).map((leg) => this.renderCover(leg)));
  }
}
