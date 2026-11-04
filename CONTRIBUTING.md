# Contributing

Thanks for your interest in Maze Generator.

**This project is not open source.** It is source-available under the
proprietary [Free-to-Use License](LICENSE): you may read the code and
run the app as-is for personal use, but modifications, redistribution
and other use cases are not granted without permission from the
developer.

## Reporting bugs and giving feedback

Bug reports, typos and general feedback are welcome — open an issue if
the repository is hosted, or contact the developer directly
(Shibsundar Chakrabor).

When reporting a bug, please include:

- what you did, what you expected, and what happened instead;
- your browser and operating system;
- steps to reproduce, if possible.

## Proposing changes

Pull requests are **not** accepted in the open-source sense, because
the code stays under its own license. If you have an idea for a change
or want to use the code in a custom way, contact the developer first —
permissions beyond the base license are granted case by case.

## Working locally

There is no build step and no tooling to install:

1. Edit the files directly (see the structure in [README.md](README.md)).
2. Reload `index.html` in your browser.

Keep the existing conventions: one file per concern for CSS and JS,
theme colours only as CSS custom properties from `css/themes/`, classic
`<script>` tags (no ES modules, so `file://` keeps working), and every
piece of logic in its own file under `js/`.
