// Neon Horizon: a small synthwave sunset over a perspective grid, for the
// bottom of the sidebar. Hidden on the collapsed rail. Motion is native.
import { View, div, image, PathBuilder } from "gpui-kit";

const FLOOR = 58; // px from the top where the horizon sits
const PINK = "#ff2bd6";
const VIOLET = "#c13cff";

// Lines fanning out from a vanishing point on the horizon, and rows that
// crowd together toward it.
function grid(w, h) {
  const cx = w / 2;
  const fan = PathBuilder.stroke(1);
  for (let i = -6; i <= 6; i++) {
    fan.move_to(cx + i * 14, 0).line_to(cx + i * 70, h);
  }
  const rows = PathBuilder.stroke(1);
  for (const y of [4, 9, 16, 26, 40, 58]) {
    if (y < h) rows.move_to(0, y).line_to(w, y);
  }
  return [fan.build(), rows.build()];
}

export default class NeonHorizon extends View {
  init() {
    this.w = 268;
    this.h = 118;
  }
  render() {
    const { w, h } = this;
    const root = div()
      .id("neon-horizon")
      .on_size_change((size, cx) => {
        if (Math.abs(size.width - this.w) > 1 || Math.abs(size.height - this.h) > 1) {
          this.w = size.width; this.h = size.height; cx.notify();
        }
      })
      .relative().size_full().overflow_hidden();
    if (w < 160) return root;
    const floorH = Math.max(0, h - FLOOR);
    const [fan, rows] = grid(w, floorH);
    return root
      .child(div().absolute().left(Math.round(w / 2) - 35).top(FLOOR - 56)
        .child(image("mods/neon-drive/sun.svg").w(70).h(70))
        .loop("opacity", { from: 0.8, to: 1, period: 3200 }))
      .child(div().absolute().left(0).top(FLOOR).w(w).h(floorH).bg("#0a0514").overflow_hidden()
        .child(div().absolute().left(0).top(0).w(w).h(floorH)
          .child(window.paint_path(fan, PINK).absolute().top(0).left(0).size_full())
          .child(window.paint_path(rows, VIOLET).absolute().top(0).left(0).size_full())
          .loop("opacity", { from: 0.55, to: 1, period: 2400 }))
        .child(div().absolute().left(0).top(0).w(w).h(2).bg(PINK)));
  }
}
