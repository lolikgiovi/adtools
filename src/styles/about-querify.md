## How It Works

1. **File Upload**

   - Users can upload Excel (.xlsx or .xls) files via drag-and-drop or file selection.
   - Also supports text (.txt) and image files (.jpg, .jpeg, .png) for CLOB data.

2. **Excel File Structure**

   - The Excel file must contain two sheets:
     - Sheet 1: Data to be inserted/merged, first row is used as field names
     - Sheet 2: Table schema information, copied from Oracle Schema

3. **Data Parsing and Validation**

   - Querify reads both sheets of the Excel file.
   - Sheet 1 data is parsed into a table structure.
   - Sheet 2 is used to determine data types and constraints for each column.
   - Querify validates the data against the schema:
     - Checks for correct data types (VARCHAR, NUMBER, TIMESTAMP, etc.)
     - Ensures non-nullable fields are not empty
     - Verifies field names match between data and schema

4. **Primary Key Detection**

   - For table ends with config -> use parameter_key as PK.
   - For table ends with event -> use event_code as PK.
   - For other tables, it looks for fields with "PK" or "pk" in the "order" column of schema sheet.
   - If multiple fields are marked as PK, all are considered part of a composite PK.
   - If no PK is explicitly marked, use first field (order 1) in the schema as the PK.

5. **Special Field Handling**

   - `created_time` and `updated_time`: Set to `SYSDATE`
   - `created_by` and `updated_by`: Set to `'SYSTEM'`
   - Supports sequential ID generation for `config_id` and `system_config_id`
   - For CLOB fields, Querify will split data per 1000 characters to avoid ORA-01461
   - For BLOB fields, it assumes base64 encoded data and uses `UTL_RAW.CAST_TO_RAW`.
   - Detects various date/time formats and converts them to Oracle-compatible timestamp strings.

6. **Query Output**

   - Generates a complete SQL script including:
     - `SET DEFINE OFF;` statement
     - Main INSERT or MERGE statements
     - COUNT(\*) query to verify affected rows
     - SELECT query for primary keys of affected rows

7. **User Experience**
   - Query splitting for large datasets (into 90KB chunks)
   - Download options for individual queries or all generated queries as a zip file
   - Copy to clipboard functionality
   - Word wrap toggle for better query readability

## Usage

1. Upload your Excel file containing data and schema information.
2. Select the desired query type (INSERT, MERGE, or MERGE-CLASSIC).
3. Click "Generate All" to process the file and create SQL queries.
4. Review the generated SQL in the editor.
5. Use the provided buttons to download, copy, or further process the SQL as needed.
