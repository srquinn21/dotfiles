// Neon Drive: a synthwave strip where a wedge sports car drives a neon road
// under a striped sunset. The road speeds up while an agent is working, the
// car flashes its hazards while one is blocked, and it cruises otherwise.
// All motion is native (.frames / .loop): render only runs when agents change.
import { View, div, image, svg, PathBuilder, Background } from "gpui-kit";
import { agents } from "herdr";

const H = 90; // strip height; the layout block should match
const HORIZON = 54;
const CHAR_W = 7.2; // JetBrains Mono at 12px
const ASSET = (f) => `mods/neon-drive/${f}`;

const SKY_TOP = "#14042b";
const SKY_LOW = "#5a1470";
const PINK = "#ff2bd6";
const CYAN = "#2de2ff";
const AMBER = "#ffb01f";

const RECT = () => PathBuilder.fill().move_to("0%", "0%").line_to("100%", "0%").line_to("100%", "100%").line_to("0%", "100%").close().build();

// Stars as fractions of the width and px from the top, each with its own twinkle.
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
  init() {
    this.w = 1200;
  }

  render() {
    const w = this.w;
    const m = mood();
    const tick = m === "working" ? 26 : m === "blocked" ? 110 : 60; // ms per char of road
    const text = (color, size = 12) =>
      div().absolute().left(0).font_family("JetBrains Mono").text_size(size).line_height(1).whitespace_nowrap().text_color(color);

    // Sky, sun and mountains, clipped at the horizon.
    const sky = div().absolute().left(0).top(0).w_full().h(HORIZON).overflow_hidden()
      .child(window.paint_path(RECT(), Background.linear_gradient(180, SKY_TOP, SKY_LOW)).absolute().top(0).left(0).size_full())
      .children(STARS.map(([x, y, p], i) =>
        div().id(`star-${i}`).absolute().left(Math.round(x * w)).top(y).w(2).h(2).rounded_full().bg("#ffe9ff")
          .loop("opacity", { from: 0.15, to: 1, period: p })))
      .child(div().absolute().left(Math.round(w * 0.68) - 40).top(HORIZON - 74)
        .child(image(ASSET("sun.svg")).w(80).h(80))
        .loop("opacity", { from: 0.85, to: 1, period: 3200 }))
      .children(Array.from({ length: Math.ceil(w / 480) + 1 }, (_, i) =>
        div().absolute().left(i * 480).top(HORIZON - 40).child(image(ASSET("range.svg")).w(480).h(40))));

    // Ground: a far grid row, the road edges and the lane dashes, all scrolling left.
    const ground = div().absolute().left(0).top(HORIZON).w_full().h(H - HORIZON).bg("#0a0514").overflow_hidden()
      .child(div().absolute().left(0).top(0).w_full().h(2).bg(PINK))
      .child(text("#7a2fb0", 10).top(5).frames(scroller("┼──────", w), tick * 3))
      .child(div().absolute().left(0).top(17).w_full().h(1).bg("#c13cff"))
      .child(text(CYAN).top(22).frames(scroller("▬▬▬▬    ", w), tick))
      .child(div().absolute().left(0).top(H - HORIZON - 2).w_full().h(2).bg(PINK).loop("opacity", { from: 0.6, to: 1, period: 1400 }));

    // The car: drifts forward and back on the road, bobs, spins its wheels.
    const hazard = (x, y) => div().absolute().left(x).top(y).w(4).h(3).rounded(1).bg(AMBER)
      .loop("opacity", { from: 0, to: 1, period: 700 });
    const wheel = (x) => div().absolute().left(x).top(22).child(svg(ASSET("wheel.svg")).w(14).h(14).text_color(CYAN).spin(tick * 14));
    const body = div().absolute().left(0).top(0).w(120).h(38)
      .loop("top", { from: 0, to: -1.2, period: m === "working" ? 240 : 420 })
      .child(image(ASSET("car.svg")).w(120).h(38))
      .child(wheel(21))
      .child(wheel(87))
      .child(div().absolute().left(1).top(22).w(4).h(3).rounded(1).bg("#ff3b6b")) // tail light
      .when(m === "blocked", (el) => el.child(hazard(1, 22)).child(hazard(112, 20)))
      .when(m === "working", (el) => el.child(text(PINK, 11).left(-34).top(16).frames(["≡  ", " ≡ ", "  ≡", "═≡ "], 70)));
    const reach = Math.max(0, Math.min(w * 0.35, w - 160));
    const car = div().absolute().top(HORIZON - 6).left(40).w(120).h(38)
      .loop("left", { from: 40, to: 40 + reach, period: m === "working" ? 5000 : 11000 })
      .child(body);

    return div()
      .id("neon-drive")
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.w) > 1) { this.w = size.width; cx.notify(); }
      })
      .relative().size_full().overflow_hidden().bg(SKY_TOP)
      .child(sky)
      .child(ground)
      .child(car);
  }
}
