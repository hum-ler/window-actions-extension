'use strict';

const { Gdk, Gio, GObject, Gtk } = imports.gi;

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

const WindowActionsBuilderScope = GObject.registerClass({
  Implements: [Gtk.BuilderScope],
}, class WindowActionsBuilderScope extends GObject.Object {
  vfunc_create_closure(builder, handlerName, flags, connectObject) {
    if (flags & Gtk.BuilderClosureFlags.SWAPPED)
      throw new Error('Unsupported template signal flag "swapped"');

    if (typeof this[handlerName] === 'undefined')
      throw new Error(`${handlerName} is undefined`);

    return this[handlerName].bind(connectObject || this);
  }

  mode_changed(obj) {
    settings.set_int("mode", obj.get_value());
  }
});

function init() { }

function buildPrefsWidget() {
  let builder = new Gtk.Builder();
  builder.set_scope(new WindowActionsBuilderScope());
  builder.add_from_file(Me.dir.get_child("prefs.ui").get_path());

  settings.bind(
    "show-close-button",
    builder.get_object("showCloseButtonSwitch"),
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
  let modeScale = builder.get_object("modeScale");
  modeScale.set_value(settings.get_int("mode"));

  return builder.get_object("prefsWidget");
}
