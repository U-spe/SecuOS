# SecuOS application modules

Every application owns its HTML, CSS, JavaScript, and JSON files inside its
folder under this directory.

## Layout

`/assets/apps/<app-id>/`

- `app.json` is the application manifest.
- `app.js` is the application entry point.
- Additional app-owned CSS, JS, HTML, and JSON files stay beside the entry point.
- Third-party packages may be installed inside the app folder when required.

Non-app code written in other languages belongs under `/assets/lang/<language>/`.
Shared OS runtime code remains in `/js/`.

This commit establishes the canonical application folders and manifests.
Existing application implementations are still hosted by the legacy
`js/system-experience.js` runtime and will be moved into these folders in
the implementation migration pass. The legacy runtime must remain in place
until each app has been migrated and tested.
