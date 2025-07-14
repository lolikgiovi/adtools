# Release Notes - July 13, 2025
## [Enhancement: Quick Query](../features/quickQuery)

#### NEW: UPDATE Query
- You can now create UPDATE query~
- How it works?:
  - Firstly, ensures at least one non-primary-key field is being updated
  - Then, validates that primary key values are provided for all UPDATE operations
  - Finally, generates optimized UPDATE statements 
- The result will be:
  - Pre-update SELECT to show current values
  - UPDATE statements for each row
  - Post-update SELECT to verify changes

#### Duplicate Primary Key Detection
- Implemented duplicate primary key detection
- The report will present you which row is duplicate

## New Feature: [Image Checker](./imageChecker)

- Populate Base URLs in [HTML Template Base URL Menu](./html)
- Enter content image paths, or image id (uuid) in the Image Checker
- Hit enter to check whether the ID has been loaded to each environment

## [Image-Base64](./image)

- Converted file naming will follow the input file name (input_image.jpg -> input_image.txt)

> © 2025 - <a href="https://www.linkedin.com/in/fashalli/" target="_blank" rel="noopener noreferrer">Fashalli Giovi</a>