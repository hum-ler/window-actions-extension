'use strict';

const { Gio, Meta, Shell, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;

let settings = null;

// Widgets that need to be updated.
let buttonsBox = null;
let alwaysOnTopToggle = null;
let alwaysOnVisibleWorkspaceToggle = null;

const Mode = {
  LIGHT: 1,   // No watch
  NORMAL: 2,  // Watch focus_window
  FULL: 3     // Watch focus_window, above, on_all_workspaces
};
let mode = Mode.NORMAL;

// Used in NORMAL mode.
let focusWindowHandlerId = 0;

// Used in FULL mode.
let monitorWindow = null;
let monitorAboveHandlerId = 0;
let monitorOnAllWorkspacesHandlerId = 0;

function init() {
  const theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
  const stylesheetFile = Me.dir.get_child("stylesheet.css");
  theme.load_stylesheet(stylesheetFile);
  stylesheetFile.unref();

  settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions." + Me.metadata.uuid
  );
  mode = settings.get_int("mode");
}

function enable() {
  create_widgets();
  Main.panel.statusArea["appMenu"]._container.add_actor(buttonsBox);

  if (mode !== Mode.LIGHT) {
    focusWindowHandlerId = global.display.connect(
      "notify::focus-window",
      () => { focus_window_changed(); }
    );

    focus_window_changed();
  }
}

function disable() {
  if (focusWindowHandlerId !== 0) {
    global.display.disconnect(focusWindowHandlerId);
    focusWindowHandlerId = 0;
  }

  if (monitorWindow !== null) {
    disconnect_focus_window_signals();
    monitorWindow = null;
  }

  destroy_widgets();
  buttonsBox = null;
  alwaysOnTopToggle = null;
  alwaysOnVisibleWorkspaceToggle = null;
}

// Creates the widgets.
//
// Creates buttonsBox, alwaysOnTopToggle and alwaysOnVisibleWorkspaceToggle at
// the global level.
function create_widgets() {
  const closeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-close-symbolic" })
  });
  const closeButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  closeButton.set_child(closeIcon);
  closeButton.connect("button-press-event", () => { close(); });
  settings.bind(
    'show-close-button',
    closeButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  const moveToWorkspaceLeftIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-previous-symbolic" })
  });
  const moveToWorkspaceLeftButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  moveToWorkspaceLeftButton.set_child(moveToWorkspaceLeftIcon);
  moveToWorkspaceLeftButton.connect(
    "button-press-event",
    () => { move_to_workspace_left(); }
  );
  settings.bind(
    'show-move-to-workspace-left-button',
    moveToWorkspaceLeftButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  const moveToWorkspaceRightIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-next-symbolic" })
  });
  const moveToWorkspaceRightButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  moveToWorkspaceRightButton.set_child(moveToWorkspaceRightIcon);
  moveToWorkspaceRightButton.connect(
    "button-press-event",
    () => { move_to_workspace_right(); }
  );
  settings.bind(
    'show-move-to-workspace-right-button',
    moveToWorkspaceRightButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  const alwaysOnTopIcon = new St.Icon({
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
  settings.bind(
    'show-always-on-top-toggle',
    alwaysOnTopToggle,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  const alwaysOnVisibleWorkspaceIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "object-flip-horizontal-symbolic" })
  });
  alwaysOnVisibleWorkspaceToggle = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  alwaysOnVisibleWorkspaceToggle.set_child(alwaysOnVisibleWorkspaceIcon);
  alwaysOnVisibleWorkspaceToggle.connect(
    "button-press-event",
    () => { always_on_visible_workspace(); }
  );
  settings.bind(
    'show-always-on-visible-workspace-toggle',
    alwaysOnVisibleWorkspaceToggle,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  buttonsBox = new St.BoxLayout({ style_class: "action-button-box" });
  buttonsBox.add(closeButton);
  buttonsBox.add(moveToWorkspaceLeftButton);
  buttonsBox.add(moveToWorkspaceRightButton);
  buttonsBox.add(alwaysOnTopToggle);
  buttonsBox.add(alwaysOnVisibleWorkspaceToggle);
}

// Destroys the widgets.
//
// Destroys buttonsBox, alwaysOnTopToggle and alwaysOnVisibleWorkspaceToggle at
// the global level.
function destroy_widgets() {
  if (alwaysOnTopToggle !== null) {
    alwaysOnTopToggle.destroy();
  }

  if (alwaysOnVisibleWorkspaceToggle !== null) {
    alwaysOnVisibleWorkspaceToggle.destroy();
  }

  if (buttonsBox !== null) {
    buttonsBox.destroy();
  }
}

// Grabs the focus window and deletes it.
function close() {
  const window = global.display.focus_window;
  if (window !== null && window.can_close()) {
    window.delete(global.get_current_time());
  }
}

// Grabs the focus window and sends it one workspace over.
function move_to_workspace_left() {
  const index = global.workspace_manager.get_active_workspace_index();
  if (index === 0) {
    return;
  }

  const window = global.display.focus_window;
  if (window !== null && !window.on_all_workspaces) {
    window.change_workspace_by_index(index - 1, false);
  }
}

// Grabs the focus window and sends it one workspace over.
function move_to_workspace_right() {
  const index = global.workspace_manager.get_active_workspace_index();

  const window = global.display.focus_window;
  if (window !== null && !window.on_all_workspaces) {
    window.change_workspace_by_index(index + 1, true);
  }
}

// Grabs the focus window and toggles its always-on-top state.
function always_on_top() {
  const window = global.display.focus_window;
  if (window !== null) {
    if (window.above) {
      window.unmake_above();
    } else {
      window.make_above();
    }

    if (mode !== Mode.LIGHT) {
      update_always_on_top_toggle();
    }
  }
}

// Grabs the focus window and toggles its always-on-visible-workspace state.
function always_on_visible_workspace() {
  const window = global.display.focus_window;
  if (window !== null) {
    if (window.on_all_workspaces) {
      window.unstick();
    } else {
      window.stick();
    }

    if (mode !== Mode.LIGHT) {
      update_always_on_visible_workspace_toggle();
    }
  }
}

// Handles a focus window change.
function focus_window_changed() {
  update_toggles();

  if (mode === Mode.FULL) {
    monitor_focus_window();
  }
}

// Updates the toggles.
function update_toggles() {
  update_always_on_top_toggle();
  update_always_on_visible_workspace_toggle();
}

// Updates alwaysOnTopToggle if there is a focus window.
function update_always_on_top_toggle() {
  const window = global.display.focus_window;
  if (window !== null) {
    if (window.above) {
      alwaysOnTopToggle.style_class = "action-button activated";
    } else {
      alwaysOnTopToggle.style_class = "action-button";
    }
  }
}

// Updates alwaysOnVisibleWorkspaceToggle if there is a focus window.
function update_always_on_visible_workspace_toggle() {
  const window = global.display.focus_window;
  if (window !== null) {
    if (window.on_all_workspaces) {
      alwaysOnVisibleWorkspaceToggle.style_class = "action-button activated";
    } else {
      alwaysOnVisibleWorkspaceToggle.style_class = "action-button";
    }
  }
}

// Monitors the current focus window for property changes.
function monitor_focus_window() {
  const window = global.display.focus_window;

  if (window === null) {
    return disconnect_focus_window_signals();
  }

  if (monitorWindow !== window) {
    disconnect_focus_window_signals();
    connect_focus_window_signals(window);
  }
}

// Subscribes to changes in monitored properties.
function connect_focus_window_signals(window) {
  monitorAboveHandlerId = window.connect(
    "notify::above",
    () => { update_always_on_top_toggle(); }
  );
  monitorOnAllWorkspacesHandlerId = window.connect(
    "notify::on-all-workspaces",
    () => { update_always_on_visible_workspace_toggle(); }
  );
  monitorWindow = window;
}

// Unsubscribes from changes in monitored properties.
function disconnect_focus_window_signals() {
  if (monitorWindow !== null) {
    monitorWindow.disconnect(monitorAboveHandlerId);
    monitorWindow.disconnect(monitorOnAllWorkspacesHandlerId);
    monitorWindow = null;
    monitorAboveHandlerId = 0;
    monitorOnAllWorkspacesHandlerId = 0;
  }
}
