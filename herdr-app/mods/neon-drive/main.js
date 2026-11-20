// Neon Drive: a synthwave strip where a sports car holds its place on a neon
// road while the scenery scrolls past in parallax layers. It travels: every
// LEG_MS the next scene in ITINERARY rolls in from the right (each layer at
// its own pace; the back layer brings the scene's sky, stars and sun).
// The `neon-drive.next_scene` key command skips ahead to the next leg.
//
// The road goes faster while an agent is working, slower with hazards
// flashing while one is blocked, and cruises otherwise.
//
// Motion is native. The road dashes are text frames. Each scenery layer is a
// strip of tiles that slides left one tile width with a linear transition,
// then is swapped for a fresh copy at 0 (a new id, so it doesn't slide back).
// An arriving layer sits in a clip that slides in from the right while its
// content slides the other way, so the content stays put on screen and is
// revealed from the right edge.
import { View, div, image, svg, PathBuilder, Background } from "gpui-kit";
import { agents, props, nextCommand } from "herdr";

const H = 90; // strip height; the layout block should match
const HORIZON = 54;
const CHAR_W = 7.2; // JetBrains Mono at 12px
const CAR_X = 0.16; // the car's spot, as a share of the width
const CAR_SCALE = 1.25; // the car's size over its 120x38 art
const SUN_X = 0.66; // the sun's spot, as a share of the width
const ASSET = (f) => `mods/neon-drive/${f}`;

const ITINERARY = ["city", "desert", "ocean", "desert"];
const LEG_MS = 15000; // time in each scene, arrival included

const PINK = "#ff2bd6";
const CYAN = "#2de2ff";
const AMBER = "#ffb01f";

// Layers draw back to front; `speed` is px/s while cruising and `arrive` how
// long, in ms, it takes to roll in. A layer's bottom sits `lift` px above the
// horizon. `sun: true` draws the sun at SUN_X (the same spot in every scene, so
// it doesn't move while scenes change); `reflection` paints it on the water;
// `rail` puts a guardrail along the road (it fades as the scene arrives).
const SCENES = {
  city: {
    rail: true,
    sky: ["#0b0320", "#4a0f63"],
    sun: true,
    layers: [
      { file: "scenes/city/far.svg", w: 420, h: 46, speed: 8, arrive: 9000 },
      { file: "scenes/city/near.svg", w: 560, h: 40, speed: 26, arrive: 5000 },
    ],
  },
  desert: {
    sky: ["#14042b", "#5a1470"],
    sun: true,
    layers: [
      { file: "scenes/desert/mountains.svg", w: 480, h: 40, speed: 6, arrive: 9000 },
      { file: "scenes/desert/palms.svg", w: 600, h: 44, speed: 30, arrive: 5000 },
    ],
  },
  ocean: {
    rail: true,
    sky: ["#0a0630", "#7a1a6e"],
    sun: true,
    reflection: true,
    layers: [
      { file: "scenes/ocean/islands.svg", w: 520, h: 22, lift: 20, speed: 5, arrive: 9000 },
      { file: "scenes/ocean/waves.svg", w: 600, h: 30, speed: 22, arrive: 5000 },
    ],
  },
};

const PACE = {
  cruise: { factor: 1, tick: 90 }, // tick: ms per char of road dashes
  working: { factor: 2, tick: 45 },
  blocked: { factor: 0.5, tick: 180 },
};

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

export default class NeonDrive extends View {
  init(_props, cx) {
    this.w = 1200;
    this.nextLeg = 0;
    // A leg is one stay in a scene: { id, scene, arrived }. At most two are
    // shown, the one being left and the one arriving.
    this.legs = [];
    this.strips = {}; // `${leg}:${layer}` -> { gen, moving, ms }
    const start = ITINERARY.indexOf(props()?.scene);
    this.stop = Math.max(0, start);
    this.addLeg(ITINERARY[this.stop], true, cx);
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

  advance(cx) {
    this.stop = (this.stop + 1) % ITINERARY.length;
    this.addLeg(ITINERARY[this.stop], false, cx);
    this.scheduleLeg(cx);
  }

  addLeg(scene, arrived, cx) {
    const leg = { id: this.nextLeg++, scene, arrived };
    // Keep only the newest shown leg plus this one; anything older is covered.
    this.legs = [...this.legs.slice(-1), leg];
    for (const key of Object.keys(this.strips)) {
      if (!this.legs.some((l) => key.startsWith(`${l.id}:`))) delete this.strips[key];
    }
    SCENES[scene].layers.forEach((_l, i) => this.cycle(leg.id, i, cx));
    if (!arrived) {
      cx.timer.after(50, (cx) => { leg.arrived = true; cx.notify(); });
      // Once every layer and the sky are in, drop the leg it covered.
      const longest = Math.max(...SCENES[scene].layers.map((l) => l.arrive));
      cx.timer.after(longest + 200, (cx) => {
        if (this.legs[this.legs.length - 1] === leg && this.legs.length > 1) {
          this.legs = [leg];
          for (const key of Object.keys(this.strips)) if (!key.startsWith(`${leg.id}:`)) delete this.strips[key];
          cx.notify();
        }
      });
    }
    cx.notify();
  }

  // One self-rescheduling chain per shown layer; it stops once its leg goes.
  cycle(legId, i, cx) {
    const key = `${legId}:${i}`;
    const leg = this.legs.find((l) => l.id === legId);
    if (!leg) return;
    const layer = SCENES[leg.scene].layers[i];
    const ms = Math.round((layer.w / (layer.speed * PACE[mood()].factor)) * 1000);
    const s = (this.strips[key] = { gen: (this.strips[key]?.gen ?? 0) + 1, moving: false, ms });
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

  // A leg's scenery, rolling in from the right. The back layer covers the
  // whole sky (gradient, stars, sun, its art), so an arriving scene hides the
  // one it replaces; the layers in front of it arrive sooner.
  renderLeg(leg, w) {
    const scene = SCENES[leg.scene];
    return scene.layers.map((l, i) => {
      const s = this.strips[`${leg.id}:${i}`] ?? { gen: 0, moving: false, ms: 10000 };
      const tiles = Math.ceil(w / l.w) + 1;
      const back = i === 0;
      const boxTop = back ? 0 : HORIZON - (l.lift ?? 0) - l.h;
      const boxH = back ? HORIZON : l.h;
      const strip = div().id(`strip-${leg.id}-${i}-${s.gen}`)
        .absolute().top(back ? HORIZON - (l.lift ?? 0) - l.h : 0).h(l.h).w(tiles * l.w)
        .left(s.moving ? -l.w : 0)
        .transition("left", { duration: s.ms, easing: "linear" })
        .children(Array.from({ length: tiles }, (_, k) =>
          div().absolute().top(0).left(k * l.w).child(image(ASSET(l.file)).w(l.w).h(l.h))));
      const hold = div().id(`hold-${leg.id}-${i}`).absolute().top(0).h(boxH).w(w);
      const arrive = { duration: l.arrive, easing: "ease-out" };
      // The clip slides in from the right; its content slides the other way,
      // so the scenery itself doesn't jump, it's just uncovered.
      return div().id(`clip-${leg.id}-${i}`).absolute().top(boxTop).h(boxH).w(w).overflow_hidden()
        .left(leg.arrived ? 0 : w).transition("left", arrive)
        .child(hold.left(leg.arrived ? 0 : -w).transition("left", arrive)
          .when(back, (el) => el
            .child(window.paint_path(RECT(), Background.linear_gradient(180, scene.sky[0], scene.sky[1]))
              .absolute().top(0).left(0).size_full())
            .children(STARS.map(([x, y, p], k) =>
              div().id(`star-${leg.id}-${k}`).absolute().left(Math.round(x * w)).top(y).w(2).h(2).rounded_full().bg("#ffe9ff")
                .loop("opacity", { from: 0.15, to: 1, period: p })))
            .when(Boolean(scene.sun), (el) => el.child(div().id(`sun-${leg.id}`).absolute().top(HORIZON - 74)
              .left(Math.round(w * SUN_X) - 40)
              .child(image(ASSET("sun.svg")).w(80).h(80))
              .loop("opacity", { from: 0.85, to: 1, period: 3200 }))))
          .child(strip)
          .when(Boolean(scene.reflection) && i === scene.layers.length - 1, (el) => el.children(
            [[0, 46], [4, 34], [8, 24], [12, 14], [16, 8]].map(([dy, rw], k) =>
              div().id(`glint-${leg.id}-${k}`).absolute().top(l.h - 20 + dy + 1).h(2).w(rw).rounded(1)
                .left(Math.round(w * SUN_X) - rw / 2).bg(k < 2 ? "#ff8a3d" : PINK)
                .loop("opacity", { from: 0.35, to: 0.9, period: 1600 + k * 300 })))));
    });
  }

  render() {
    const w = this.w;
    const m = mood();
    const { tick } = PACE[m];
    const text = (color, size = 12) =>
      div().absolute().left(0).font_family("JetBrains Mono").text_size(size).line_height(1).whitespace_nowrap().text_color(color);

    // Sky: each shown leg's layers, oldest first, clipped at the horizon.
    const sky = div().absolute().left(0).top(0).w_full().h(HORIZON).overflow_hidden()
      .children(this.legs.flatMap((leg) => this.renderLeg(leg, w)));

    // The guardrail follows the newest scene once it has started to arrive.
    const newest = this.legs[this.legs.length - 1];
    const railScene = newest.arrived ? newest : this.legs[0];
    const rail = Boolean(SCENES[railScene.scene].rail);
    // Ground: a guardrail, the road edges and the lane dashes, scrolling left.
    const ground = div().absolute().left(0).top(HORIZON).w_full().h(H - HORIZON).bg("#0a0514").overflow_hidden()
      .child(div().absolute().left(0).top(0).w_full().h(2).bg(PINK))
      .child(div().id("rail").absolute().left(0).top(0).w_full().h(18)
        .opacity(rail ? 1 : 0).transition("opacity", { duration: 3000, easing: "ease-in-out" })
        .child(text("#7a2fb0", 10).top(5).frames(scroller("┼──────", w), tick * 2))
        .child(div().absolute().left(0).top(17).w_full().h(1).bg("#c13cff")))
      .child(text(CYAN).top(22).frames(scroller("────    ", w), tick))
      .child(div().absolute().left(0).top(H - HORIZON - 2).w_full().h(2).bg(PINK).loop("opacity", { from: 0.6, to: 1, period: 1400 }));

    // The car holds its spot; it only bobs and spins its wheels. It's drawn at
    // CAR_SCALE over its 120x38 art, wheels on the road, roof above the horizon.
    const S = CAR_SCALE;
    const hazard = (x, y) => div().absolute().left(x * S).top(y * S).w(4 * S).h(3 * S).rounded(1).bg(AMBER)
      .loop("opacity", { from: 0, to: 1, period: 700 });
    const wheel = (x) => div().absolute().left(x * S).top(22 * S)
      .child(svg(ASSET("turbine.svg")).w(14 * S).h(14 * S).text_color("#d8dce8").spin(tick * 12));
    const car = div().absolute().top(H - 4 - 38 * S).left(Math.round(w * CAR_X)).w(120 * S).h(38 * S)
      .child(div().absolute().left(0).top(0).w(120 * S).h(38 * S)
        .loop("top", { from: 0, to: -1, period: m === "working" ? 260 : 520 })
        .child(image(ASSET("fox-black.svg")).w(120 * S).h(38 * S))
        .child(wheel(19))
        .child(wheel(87))
        .when(m === "blocked", (el) => el.child(hazard(2.6, 18.6)).child(hazard(104, 18.2)))
        .when(m === "working", (el) => el.child(text(PINK, 11).left(-34 * S).top(16 * S).frames(["≡  ", " ≡ ", "  ≡", "═≡ "], 90))));

    return div()
      .id("neon-drive")
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.w) > 1) { this.w = size.width; cx.notify(); }
      })
      .relative().size_full().overflow_hidden().bg("#0b0320")
      .child(sky)
      .child(ground)
      .child(car);
  }
}
