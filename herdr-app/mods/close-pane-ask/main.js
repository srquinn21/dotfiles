// Asks y/n before pane.close, like tmux's confirm-before. Bound in keys.json.
// The target is captured on open, so focus moving underneath doesn't change it.
import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, props, focused, closeOverlay, theme } from "herdr";

export default class CloseAsk extends View {
  init(_props, cx) {
    this.target = focused()?.pane ?? null;
    this.handle = cx.focus_handle();
    this.handle.focus();
  }
  no() {
    closeOverlay(props().overlay);
  }
  yes() {
    closeOverlay(props().overlay);
    if (this.target) run("pane.close", { pane: this.target });
  }
  render(cx) {
    const t = theme();
    const button = (id, label, bg, fg, onClick) =>
      h_flex().id(id).h(32).px(14).items_center().rounded(8).border_1().border_color(id === "yes" ? t.input : bg).bg(bg).text_color(fg).cursor_pointer().hover((s) => s.opacity(0.88)).on_click(onClick).child(label);
    return v_flex()
      .id("close-ask")
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (e.key === "y") this.yes();
        else if (e.key === "n" || e.key === "enter" || e.key === "escape") this.no();
        else return;
        cx.stop_propagation();
      })
      .size_full().min_h(0).p(18).gap(12).rounded(8).bg(t.popover).text_size(13)
      .child(h_flex().items_center().child(div().flex_1().text_size(15).font_semibold().text_color(t.foreground).child("Close pane?")).child(div().text_size(11).text_color(t.dim).child("y/N")))
      .child(div().flex_1().min_h(0).text_color(t.muted).child(this.target ? "Its program will be ended." : "Nothing to close."))
      .child(h_flex().justify_end().gap(8).text_size(12)
        .child(button("no", "No", t.solid, t.solid_foreground, () => this.no()))
        .child(button("yes", "Yes", t.raised, t.foreground, () => this.yes())));
  }
}
