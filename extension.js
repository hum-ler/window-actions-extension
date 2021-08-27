'use strict';

const { Gio, Graphene, Meta, Shell, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let settings = null;

let buttonsPanel = null;
let maximizeToggle = null;
let alwaysOnTopToggle = null;
let alwaysOnVisibleWorkspaceToggle = null;

let focusAppHandlerId = 0;
let focusWindowHandlerId = 0;
let overviewShowingHandlerId = 0;
let overviewHiddenHandlerId = 0;

// Used for monitoring the focus window for property changes.
let enableMonitor = false;
let monitorWindow = null;
let monitorMaximizedHorizontallyHandlerId = 0;
let monitorMaximizedVerticallyHandlerId = 0;
let monitorAboveHandlerId = 0;
let monitorOnAllWorkspacesHandlerId = 0;

function init() {
  let theme = St.ThemeContext.get_for_stage(global.stage).get_theme();
  theme.load_stylesheet(Me.dir.get_child("stylesheet.css"));

  settings = ExtensionUtils.getSettings(
    "org.gnome.shell.extensions." + Me.metadata.uuid
  );
  enableMonitor = settings.get_boolean("monitor-current-focus-window");
}

function enable() {
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
  alwaysOnVisibleWorkspaceToggle = null;
}

// Creates the widgets.
function create_widgets() {
  let minimizeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-minimize-symbolic" })
  });
  let minimizeButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  minimizeButton.set_child(minimizeIcon);
  minimizeButton.connect("button-press-event", () => { minimize(); });
  settings.bind(
    'show-minimize-button',
    minimizeButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  let maximizeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-maximize-symbolic" })
  });
  maximizeToggle = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  maximizeToggle.set_child(maximizeIcon);
  maximizeToggle.connect("button-press-event", () => { maximize(); });
  settings.bind(
    'show-maximize-toggle',
    maximizeToggle,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  let closeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-close-symbolic" })
  });
  let closeButton = new St.Button({
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

  let shadeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "window-minimize-symbolic" }),
    scale_y: -1,
    pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 })
  });
  let shadeButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  shadeButton.set_child(shadeIcon);
  shadeButton.connect("button-press-event", () => { shade(); });
  settings.bind(
    'show-shade-button',
    shadeButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  let moveIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "value-increase-symbolic" })
  });
  let moveButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  moveButton.set_child(moveIcon);
  moveButton.connect("button-press-event", () => { move(); });
  settings.bind(
    'show-move-button',
    moveButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  let resizeIcon = new St.Icon({
    gicon: new Gio.ThemedIcon({ name: "go-next-symbolic" }),
    rotation_angle_z: 45,
    translation_x: 4,
    translation_y: 4,
    pivot_point: new Graphene.Point({ x: 0.5, y: 0.5 })
  });
  let resizeButton = new St.Button({
    style_class: "action-button",
    track_hover: true
  });
  resizeButton.set_child(resizeIcon);
  resizeButton.connect("button-press-event", () => { resize(); });
  settings.bind(
    'show-resize-button',
    resizeButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

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
  settings.bind(
    'show-move-to-workspace-left-button',
    moveToWorkspaceLeftButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
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
  settings.bind(
    'show-move-to-workspace-right-button',
    moveToWorkspaceRightButton,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
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
  settings.bind(
    'show-always-on-top-toggle',
    alwaysOnTopToggle,
    'visible',
    Gio.SettingsBindFlags.DEFAULT
  );

  let alwaysOnVisibleWorkspaceIcon = new St.Icon({
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

  let boxLayout = new St.BoxLayout({ style_class: "action-button-box" });
  boxLayout.add(minimizeButton);
  boxLayout.add(maximizeToggle);
  boxLayout.add(closeButton);
  boxLayout.add(shadeButton);
  boxLayout.add(moveButton);
  boxLayout.add(resizeButton);
  boxLayout.add(moveToWorkspaceLeftButton);
  boxLayout.add(moveToWorkspaceRightButton);
  boxLayout.add(alwaysOnTopToggle);
  boxLayout.add(alwaysOnVisibleWorkspaceToggle);

  buttonsPanel = new PanelMenu.Button(-1, "Window Actions", true);
  buttonsPanel.add_child(boxLayout);
  buttonsPanel.hide();
}

// Destroys the widgets.
function destroy_widgets() {
  if (buttonsPanel !== null) {
    buttonsPanel.destroy();
  }
}

// Grabs the focus window and minimizes it.
function minimize() {
  let window = global.display.focus_window;
  if (window !== null && window.can_minimize()) {
    window.minimize();
  }
}

// Grabs the focus window and toggles its maximize state.
function maximize() {
  let window = global.display.focus_window;
  if (window !== null && window.can_maximize()) {
    let flags = window.get_maximized();
    if (flags !== 0) {
      window.unmaximize(flags);
    } else {
      window.maximize(Meta.MaximizeFlags.BOTH);
    }

    update_maximize_toggle();
  }
}

// Grabs the focus window and deletes it.
function close() {
  let window = global.display.focus_window;
  if (window !== null && window.can_close()) {
    window.delete(global.get_current_time());
  }
}

// Grabs the focus window and shades it.
function shade() {
  let window = global.display.focus_window;
  if (window !== null && window.can_shade()) {
    window.shade(global.get_current_time());
  }
}

function move() {
  let window = global.display.focus_window;
  if (window !== null && window.allows_move()) {
    window.begin_grab_op(Meta.GrabOp.MOVING, true, global.get_current_time());
  }
}

function resize() {
  let window = global.display.focus_window;
  if (window !== null && window.resizeable) {
    window.begin_grab_op(
      Meta.GrabOp.RESIZING_SE,
      true,
      global.get_current_time()
    );
  }
}

// Grabs the focus window and sends it one workspace over.
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

// Grabs the focus window and sends it one workspace over.
function move_to_workspace_right() {
  let index = global.workspace_manager.get_active_workspace_index();

  let window = global.display.focus_window;
  if (window !== null && !window.on_all_workspaces) {
    window.change_workspace_by_index(index + 1, true);
  }
}

// Grabs the focus window and toggles its always-on-top state.
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

// Grabs the focus window and toggles its always-on-visible-workspace state.
function always_on_visible_workspace() {
  let window = global.display.focus_window;
  if (window !== null) {
    if (window.on_all_workspaces) {
      window.unstick();
    } else {
      window.stick();
    }

    update_always_on_visible_workspace_toggle();
  }
}

// Handles a focus app change.
function focus_app_changed() {
  update_buttons_panel();
  update_toggles();

  if (enableMonitor) {
    monitor_focus_window();
  }
}

// Handles a focus window change.
function focus_window_changed() {
  update_toggles();

  if (enableMonitor) {
    monitor_focus_window();
  }
}

// Updates buttonsPanel if there is a current focus window.
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

// Updates the toggles.
function update_toggles() {
  update_maximize_toggle();
  update_always_on_top_toggle();
  update_always_on_visible_workspace_toggle();
}

// Updates maximizeToggle if there is a current focus window.
function update_maximize_toggle() {
  let window = global.display.focus_window;
  if (window !== null) {
    if (window.get_maximized() !== 0) {
      maximizeToggle.style_class = "action-button activated";
    } else {
      maximizeToggle.style_class = "action-button";
    }
  }
}

// Updates alwaysOnTopToggle if there is a current focus window.
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

// Updates alwaysOnVisibleWorkspaceToggle if there is a current focus window.
function update_always_on_visible_workspace_toggle() {
  let window = global.display.focus_window;
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
  let window = global.display.focus_window;

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
  monitorMaximizedHorizontallyHandlerId = window.connect(
    "notify::maximized-horizontally",
    () => { update_maximize_toggle(); }
  );
  monitorMaximizedVerticallyHandlerId = window.connect(
    "notify::maximized-vertically",
    () => { update_maximize_toggle(); }
  );
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
    monitorWindow.disconnect(monitorMaximizedHorizontallyHandlerId);
    monitorWindow.disconnect(monitorMaximizedVerticallyHandlerId);
    monitorWindow.disconnect(monitorAboveHandlerId);
    monitorWindow.disconnect(monitorOnAllWorkspacesHandlerId);
    monitorWindow = null;
    monitorMaximizedHorizontallyHandlerId = 0;
    monitorMaximizedVerticallyHandlerId = 0;
    monitorAboveHandlerId = 0;
    monitorOnAllWorkspacesHandlerId = 0;
  }
}
