# Release Notes - February 17, 2025

## [Quick Query](./quickQuery)

- <b>Bug Fixed</b>: Fixed issue when query parameters not being properly escaped in MERGE Statements for some cases.
- <b>New Feature</b>: Upload attachment files (Image, Text, PDF, JSON, HTML) and create query with it.
- <b>New Feature</b>: Your latest Spreadsheet Data (Data Input Table) will be saved in Local Storage. When you open the schema, the data will also be loaded.
- <b>Improvement</b>: Added support for abbreviations in schema and table names. For example, you can now type `wsb` and got `WEALTH_SECONDARY_BOND` as the result, or `wprod.cfg` to get `WEALTH_PRODUCT.CONFIG`.

## [HTML Template](./html)

- <b>Bug Fixed</b>: Now can render HTML Templates smoothly.
- <b>New Feature</b>: Base URL Management - Populate your Base URLs and load the HTML with it, saved in Local Storage.
- <b>New Feature</b>: Velocity Template Language (VTL) Parsing. The `#if #else #end` and `#foreach` tags are supported.
  - I am bundling the VTL Parser from <u><a href="https://www.npmjs.com/package/velocityjs?activeTab=readme" rel="noopener noreferrer">velocityjs npm package</a></u> and adding it to the project.
  - The VTL Parser doesn't include custom formatter that we use (`$format.currency` and `$format.date`), so that's the limitation.

## Technical Updates

- Update code structure to be more modular
- Still using dependencies from CDN, but no double loading

> © 2025 - <a href="https://www.linkedin.com/in/fashalli/" target="_blank" rel="noopener noreferrer">Fashalli Giovi</a>
