# Window Actions

Adds a window close button (amongst others) to the Top Bar.

This is a GNOME Shell extension.

The code is inspired by https://github.com/PWall2222/WB.

The actions that are added:
- Minimize
- Maximize
- Close
- Shade
- Move
- Resize
- Move to Workspace Left
- Move to Workspace Right
- Always on Top
- Always on Visible Workspace

## Test environment

- Fedora 34
- GNOME 40 (Wayland)

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

The option "Monitor the current focus window for changes" makes the extension's toggles update in real time, at the expense of some processing power. Enable it if you also use the window menu (i.e. right-click on the title bar) or the title bar itself to set "Always on Top" / "Always on Visible Workspace", or to maximize / restore windows.
