# Window Actions

Adds a window close button (amongst others) to the Top Bar.

This is a GNOME Shell extension.

The code is inspired by https://github.com/PWall2222/WB.

The actions that are added:
- Close
- Move to Workspace Left
- Move to Workspace Right
- Always on Top
- Always on Visible Workspace

## Test environment

- Fedora 34
- GNOME 40

## Manual installation

1. Create the folder ~/.local/share/gnome-shell/extensions/window-actions@hum.per.sg
2. Copy these files into the folder:
   - extension.js
   - metadata.json
   - stylesheet.css
   - *.svg
3. Restart GNOME Shell by logging out and back in
4. Enable "Window Actions" in the Extensions app

## Manual uninstallation

1. Disable "Window Actions" in the Extensions app
2. Delete the folder ~/.local/share/gnome-shell/extensions/window-actions@hum.per.sg
3. Restart GNOME Shell by logging out and back in
