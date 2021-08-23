'use strict';

const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let buttonsPanel = null;
let alwaysOnTopToggle = null;

let focusAppHandlerId = 0;
let focusWindowHandlerId = 0;
let overviewShowingHandlerId = 0;
let overviewHiddenHandlerId = 0;

// Used for monitoring a window for change in the above property.
let monitorWindow = null;
let monitorHandlerId = 0;

function init() { }

function enable() {
  // Refer to AppMenuButton implementation in
  // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js.

  load_stylesheet();

  create_widgets();

  // FIXME: Should be inserted after the AppMenuButton.
  Main.panel.addToStatusArea("Window Actions", buttonsPanel, -1, "left");

  focusAppHandlerId = Shell.WindowTracker.get_default().connect(
    "notify::focus-app",
    () => { focus_app_changed(); }
  );
  focusWindowHandlerId = global.display.connect(
    "notify::focus-window",
    () => { focus_window_changed(); }
  );
  overviewShowingHandlerId = Main.overview.connect(
    "showing",
    () => { focus_app_changed(); }
  );
  overviewHiddenHandlerId = Main.overview.connect(
    "hidden",
    () => { focus_app_changed(); }
  );

  focus_app_changed();
}

function disable() {
  if (focusAppHandlerId !== 0) {
    Shell.WindowTracker.get_default().disconnect(focusAppHandlerId);
    focusAppHandlerId = 0;
  }
  if (focusWindowHandlerId !== 0) {
    global.display.disconnect(focusWindowHandlerId);
    focusWindowHandlerId = 0;
  }
  if (overviewShowingHandlerId !== 0) {
    Main.overview.disconnect(overviewShowingHandlerId);
    overviewShowingHandlerId = 0;
  }
  if (overviewHiddenHandlerId !== 0) {
    Main.overview.disconnect(overviewHiddenHandlerId);
    overviewHiddenHandlerId = 0
  }

  destroy_widgets();
  buttonsPanel = null;
  alwaysOnTopToggle = null;
}

// Loads the style for our widgets.
function load_stylesheet() {
  let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
  theme.load_stylesheet(Me.dir.get_child("stylesheet.css"));
}

// Creates all our widgets.
function create_widgets() {
  let closeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-close-symbolic" })
  });
  let closeButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  closeButton.set_child(closeIcon);
  closeButton.connect("button-press-event", () => { close(); });

  let moveToWorkspaceLeftIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-previous-symbolic" })
  });
  let moveToWorkspaceLeftButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  moveToWorkspaceLeftButton.set_child(moveToWorkspaceLeftIcon);
  moveToWorkspaceLeftButton.connect(
    "button-press-event",
    () => { move_to_workspace_left(); }
  );

  let moveToWorkspaceRightIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-next-symbolic" })
  });
  let moveToWorkspaceRightButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  moveToWorkspaceRightButton.set_child(moveToWorkspaceRightIcon);
  moveToWorkspaceRightButton.connect(
    "button-press-event",
    () => { move_to_workspace_right(); }
  );

  let alwaysOnTopIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-top-symbolic" })
  });
  alwaysOnTopToggle = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  alwaysOnTopToggle.set_child(alwaysOnTopIcon);
  alwaysOnTopToggle.connect(
    "button-press-event",
    () => { always_on_top(); }
  );

  let boxLayout = new St.BoxLayout({ style_class: "action-button-box" });
  boxLayout.add(closeButton);
  boxLayout.add(moveToWorkspaceLeftButton);
  boxLayout.add(moveToWorkspaceRightButton);
  boxLayout.add(alwaysOnTopToggle);

  buttonsPanel = new PanelMenu.Button(-1, "Window Actions", true);
  buttonsPanel.add_child(boxLayout);
  buttonsPanel.hide();
}

// Destroys all our widgets.
function destroy_widgets() {
  if (buttonsPanel !== null) {
    buttonsPanel.destroy();
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

// Grabs the window in focus and toggles its always-on-top state.
function always_on_top() {
  let window = global.display.focus_window;
  if (window !== null) {
    if (window.above) {
      window.unmake_above();
    } else {
      window.make_above();
    }

    update_always_on_top_toggle();
  }
}

// Handles an app change.
function focus_app_changed() {
  update_buttons_panel();
  update_always_on_top_toggle();
  monitor_above_property();
}

// Handles a window change.
function focus_window_changed() {
  update_always_on_top_toggle();
  monitor_above_property();
}

// Updates buttonsPanel if there is a window in focus.
function update_buttons_panel() {
  if (Main.overview.visible) {
    return buttonsPanel.hide();
  }

  let window = global.display.focus_window;
  if (window !== null) {
    return buttonsPanel.show();
  }

  buttonsPanel.hide();
}

// Grabs the window in focus and watches for changes in the above property.
function monitor_above_property() {
  let window = global.display.focus_window;

  if (window === null) {
    disconnect_above();
  }

  if (window !== null) {
    if (monitorWindow !== window) {
      disconnect_above();
      connect_above(window);
    }
  }
}

// Updates alwaysOnTopToggle if there is a window in focus.
function update_always_on_top_toggle() {
  let window = global.display.focus_window;
  if (window !== null) {
    if (window.above) {
      alwaysOnTopToggle.style_class = "action-button activated";
    } else {
      alwaysOnTopToggle.style_class = "action-button";
    }
  }
}

// Subscribes to changes in the above property.
function connect_above(window) {
  monitorHandlerId = window.connect(
    "notify::above",
    () => { update_always_on_top_toggle(); }
  );
  monitorWindow = window;
}

// Unsubscribes from changes in the above property.
function disconnect_above() {
  if (monitorWindow !== null) {
    monitorWindow.disconnect(monitorHandlerId);
    monitorWindow = null;
    monitorHandlerId = 0;
  }
}
