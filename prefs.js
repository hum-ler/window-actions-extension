'use strict';

const { Gdk, Gio, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const cssProvider = new Gtk.CssProvider();
cssProvider.load_from_file(Me.dir.get_child("stylesheet.css"));
Gtk.StyleContext.add_provider_for_display(
  Gdk.Display.get_default(),
  cssProvider,
  Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
);

const settings = ExtensionUtils.getSettings(
  'org.gnome.shell.extensions.' + Me.metadata.uuid
);

function init() { }

function buildPrefsWidget() {
  let builder = new Gtk.Builder();
  builder.add_from_file(Me.dir.get_child("prefs.ui").get_path());

  settings.bind(
    "show-minimize-button",
    builder.get_object("showMinimizeButtonSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-maximize-toggle",
    builder.get_object("showMaximizeToggleSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-close-button",
    builder.get_object("showCloseButtonSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-shade-button",
    builder.get_object("showShadeButtonSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-move-to-workspace-left-button",
    builder.get_object("showMoveToWorkspaceLeftButtonSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-move-to-workspace-right-button",
    builder.get_object("showMoveToWorkspaceRightButtonSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-always-on-top-toggle",
    builder.get_object("showAlwaysOnTopToggleSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "show-always-on-visible-workspace-toggle",
    builder.get_object("showAlwaysOnVisibleWorkspaceToggleSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );
  settings.bind(
    "monitor-current-focus-window",
    builder.get_object("monitorCurrentFocusWindowSwitch"),
    "active",
    Gio.SettingsBindFlags.DEFAULT
  );

  return builder.get_object("prefsWidget");
}
