'use strict';

const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;

let widget = null;
let focusAppHandlerId = 0;
let overviewShowingHandlerId = 0;
let overviewHiddenHandlerId = 0;

function init() { }

function enable() {
  // Refer to AppMenuButton implementation in
  // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js.

  load_stylesheet();

  widget = create_widget();

  // Requires a subclass of PanelMenu.Button instead.
  // Main.panel.addToStatusArea('?', bin, 0, 0);

  // FIXME: Should be inserted above AppMenuButton.
  Main.panel._leftBox.insert_child_above(widget, null);

  focusAppHandlerId = Shell.WindowTracker.get_default().connect(
    "notify::focus-app",
    (_) => { focus_changed(); }
  );
  overviewShowingHandlerId = Main.overview.connect(
    "showing",
    (_) => { focus_changed(); }
  );
  overviewHiddenHandlerId = Main.overview.connect(
    "hidden",
    (_) => { focus_changed(); });

  focus_changed();
}

function disable() {
  destroy_widget(widget);
  widget = null;

  if (focusAppHandlerId !== 0) {
    Shell.WindowTracker.get_default().disconnect(focusAppHandlerId);
    focusAppHandlerId = 0;
  }
  if (overviewShowingHandlerId !== 0) {
    Main.overview.disconnect(overviewShowingHandlerId);
    overviewShowingHandlerId = 0;
  }
  if (overviewHiddenHandlerId !== 0) {
    Main.overview.disconnect(overviewHiddenHandlerId);
    overviewHiddenHandlerId = 0
  }
}

// Loads the widget style and images.
function load_stylesheet() {
  let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
  theme.load_stylesheet(Me.dir.get_child("stylesheet.css"));
}

// Creates the widget holding the buttons.
function create_widget() {
  let closeButton = new St.Button({
    style_class: "close action-button",
    track_hover: true
  });
  closeButton.connect("button-press-event", (_) => { close(); });

  let moveToWorkspaceLeftButton = new St.Button({
    style_class: "move-to-workspace-left action-button",
    track_hover: true
  });
  moveToWorkspaceLeftButton.connect("button-press-event", (_) => {
    move_to_workspace_left();
  });

  let moveToWorkspaceRightButton = new St.Button({
    style_class: "move-to-workspace-right action-button",
    track_hover: true
  });
  moveToWorkspaceRightButton.connect("button-press-event", (_) => {
    move_to_workspace_right();
  })

  let box = new St.BoxLayout({ style_class: "action-button-box" });
  box.add(closeButton);
  box.add(moveToWorkspaceLeftButton);
  box.add(moveToWorkspaceRightButton);

  let bin = new St.Bin({ style_class: "widget-bin" });
  bin.set_child(box);

  return bin;
}

// Destroys the widget holding the buttons.
function destroy_widget(widget) {
  if (widget !== null) {
    widget.destroy();
  }
}

// Grabs the window in focus and deletes it.
function close() {
  let window = global.display.focus_window;

  if (window !== null) {
    window.delete(global.get_current_time());
  }
}

// Grabs the window in focus and sends it one workspace over.
function move_to_workspace_left() {
  let index = global.workspace_manager.get_active_workspace_index();
  if (index === 0) {
    return;
  }

  let window = global.display.focus_window;
  if (window !== null && !window.on_all_workspaces) {
    window.change_workspace_by_index(index - 1, false);
  }
}

// Grabs the window in focus and sends it one workspace over.
function move_to_workspace_right() {
  let index = global.workspace_manager.get_active_workspace_index();

  let window = global.display.focus_window;
  if (window !== null && !window.on_all_workspaces) {
    window.change_workspace_by_index(index + 1, true);
  }
}

// Shows the widget if there is a window in focus.
function focus_changed() {
  if (Main.overview.visible) {
    return widget.hide();
  }

  if (global.display.focus_window !== null) {
    return widget.show();
  }

  widget.hide();
}
