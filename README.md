# Resaver

Bulk re-save files in workspace to apply on-save actions.

Features:

  - Works as of Visual Studio Code 1.96
  - Minimal code (1 file, <200 lines; cf. `format-files` with dozens of files and functions)
  - Defensively written (will not open hundreds of tabs and/or silently swallow errors)
  - Does not re-implement file listing (see _Usage_ below)
  - Shows progress

## Usage

It is expected that you have actions configured on save in VS Code, for example:

```json
"files.trimTrailingWhitespace": true,
"editor.formatOnSave": true,
"editor.codeActionsOnSave": {
    "source.fixAll": "explicit",
    "source.convertImportFormat": "explicit",
    "source.organizeImports": "explicit"
},
```

This extension requires you to configure a command that is used to list the files to be re-saved. I recommend:

```json
"resaver.listFilesCommand": "git ls-files",
```

This ensures you are re-saving only files that you version and ignores .gitignored files.

Then:

  1. Make changes to your linter/formatter/etc. configuration.
  2. Commit the configuraton changes separately, for easy review.
  3. Run the `Resaver: Bulk Re-save Files` command.
  4. Review changes and commit.


## License

Licensed under the MIT license.
