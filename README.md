# Window Actions

Adds a Close button (amongst others) to the AppMenuButton.

This is a GNOME Shell extension.

## About This Extension

There are several extensions that hide the title bar when a window is maximized. This extension complements them by recovering some of the functionality that is hidden away in the window menu, or on the title bar itself.

The actions that are added:
- Close
- Move to Workspace Left
- Move to Workspace Right
- Always on Top
- Always on Visible Workspace

The actions that will *NOT* be added:
- Minimize -- there is no longer a Window List by default
- Maximize -- drag the window to the top of the screen
- Restore -- drag down from the Top Bar
- Shade -- does not work on Wayland apps
- Move -- no change, just move the window as usual
- Resize -- no change, just resize the window as usual

The code is inspired by https://github.com/PWall2222/WB.

## Test environment

- Fedora 34
- Wayland
- GNOME 40
- English

## Installation

1. Package the extension: `gnome-extensions pack --extra-source=prefs.ui .`
2. Install the extension: `gnome-extensions install window-actions@hum.per.sg.shell-extension.zip`
3. Restart GNOME Shell by logging out and back in
4. Enable the extension: `gnome-extensions enable window-actions@hum.per.sg`

## Uninstallation

1. Uninstall the extension: `gnome-extensions uninstall window-actions@hum.per.sg`
2. Restart GNOME Shell by logging out and back in

## Preferences

Show the preferences window: `gnome-extensions prefs window-actions@hum.per.sg`

The option "Monitor the current focus window for changes" makes the extension's toggles update in real time, at the expense of some processing power. It is only necessary if you set "Always on Top" or "Always on Visible Workspace" from the actual window menu.
