SHELL = /bin/bash
GNOME-EXTENSIONS = gnome-extensions

UUID = window-actions@hum.per.sg
SCHEMA = org.gnome.shell.extensions.$(UUID).gschema.xml
ZIP = $(UUID).shell-extension.zip

all: $(ZIP)

$(ZIP): extension.js metadata.json prefs.js prefs.ui stylesheet.css \
	schemas/$(SCHEMA)
	$(GNOME-EXTENSIONS) pack --force --extra-source=prefs.ui .

install: $(ZIP)
	$(GNOME-EXTENSIONS) install --force $(ZIP)

uninstall:
	$(GNOME-EXTENSIONS) uninstall $(UUID)

clean :
	rm -f $(ZIP) schemas/gschemas.compiled
