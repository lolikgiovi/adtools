# AD Tools

## Overview

AD Tools is a comprehensive web-based development utility suite designed to streamline database operations, query generation, and content management tasks. The application provides a collection of specialized tools for developers and database administrators to enhance productivity and reduce manual work.

**Version:** 1.0.0  
**Target Users:** Developers, Database Administrators, DevOps Engineers  
**Platform:** Web Application (Browser-based)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lolikgiovi/adtools)

---

## Feature Specifications

### 1. Home Dashboard

**Functionality:**
- Central navigation hub for all tools
- Usage analytics and statistics display
- Quick access to most used and recently used tools
- Release notes integration

**Business Rules:**
- Tracks tool usage statistics locally
- Displays tools ordered by usage frequency
- Shows global statistics (total uses, total visits)
- Automatically updates recent tools list based on user activity

**User Flow:**
1. User opens AD Tools application
2. Home dashboard loads with tool overview
3. User can view:
   - Latest release notes
   - Most used tools section
   - Recently used tools section
   - Usage statistics
   - Complete tools grid
4. User clicks on any tool card to navigate to that feature
5. System tracks navigation and updates usage statistics

---

### 2. Quick Query Generator

**Functionality:**
- Generate Oracle SQL statements (INSERT, UPDATE, MERGE)
- Interactive schema definition with spreadsheet interface
- File attachment support for BLOB/CLOB data
- Schema management with local storage
- Advanced data validation and processing

**Business Rules:**
- Supports Oracle data types: VARCHAR, NUMBER, DATE, TIMESTAMP, BLOB, CLOB, etc.
- Primary key detection and duplicate handling
- Special value processing ("max" for auto-increment, UUID generation)
- File size validation against field constraints
- Schema storage limit: 100 schemas maximum
- 7-tier search algorithm for schema lookup

**User Flow:**
1. **Schema Setup:**
   - User enters table name or searches existing schemas
   - Define schema manually or load from saved schemas
   - Set field names, data types, nullable/PK constraints

2. **Data Input:**
   - Click "Add field names from schema" to populate data table
   - Enter data values in spreadsheet format
   - Attach files for BLOB/CLOB fields (optional)
   - Use special values like "max" for auto-increment

3. **Query Generation:**
   - Select query type (MERGE, INSERT, UPDATE)
   - Click "Generate Query" button
   - Review generated SQL in code editor
   - Copy to clipboard or download as file

4. **Schema Management:**
   - Save schemas for reuse
   - Export/import schema collections
   - Search and load existing schemas

---

### 3. Querify (Excel to SQL)

**Functionality:**
- Convert Excel files (.xlsx, .xls) to SQL queries
- Support for text files and images
- Multiple query types (MERGE, INSERT)
- Batch processing capabilities
- Query splitting for large datasets

**Business Rules:**
- Supports Excel, text, and image file formats
- Automatic primary key detection from Excel structure
- Query size limit: 90KB chunks for Jenkins execution
- File validation and error reporting
- Batch processing with progress tracking

**User Flow:**
1. **File Upload:**
   - Drag and drop files or click to select
   - Support for multiple file types (.xlsx, .xls, .txt, images)
   - Files appear in categorized lists

2. **Query Generation:**
   - Select query type from dropdown
   - Click "Generate All" for batch processing
   - Review generated SQL in editor

3. **Output Management:**
   - Copy individual queries
   - Download single or all queries
   - Split large queries into chunks
   - Preview images and text files

---

### 4. Query IN Generator

**Functionality:**
- Generate SQL IN clauses from value lists
- Simple text-based input processing
- Configurable schema, table, and field names

**Business Rules:**
- Processes line-separated values
- Generates standard SQL IN syntax
- Validates input format
- Supports any database schema structure

**User Flow:**
1. **Input Setup:**
   - Enter values in textarea (one per line)
   - Specify schema name, table name, and field name

2. **Query Generation:**
   - Click "Generate" button
   - Review generated SQL query
   - Copy query to clipboard

---

### 5. Image-Base64 Converter

**Functionality:**
- Convert images to Base64 encoding
- Convert Base64 strings back to images
- Support for multiple image formats
- Batch processing capabilities

**Business Rules:**
- Supports common image formats: PNG, JPG, JPEG, GIF, BMP, WEBP, SVG
- Handles multiple files simultaneously
- Provides download options for converted files
- Real-time preview of conversions

**User Flow:**
1. **Image to Base64:**
   - Upload image files (single or multiple)
   - View image previews
   - Download Base64 strings
   - Clear results when needed

2. **Base64 to Image:**
   - Paste Base64 string or upload text file
   - Click "Convert to Image"
   - Preview converted images
   - Download converted images

---

### 6. HTML Template Editor

**Functionality:**
- HTML code editing with syntax highlighting
- Live preview with iPhone simulator frame
- Base URL management for testing
- HTML formatting and minification
- Dynamic field processing

**Business Rules:**
- Supports HTML formatting and minification
- Base URL management for preview testing
- Dynamic field extraction and processing
- Real-time preview updates
- Mobile-responsive preview frame

**User Flow:**
1. **Code Editing:**
   - Open HTML file or paste code
   - Use formatting/minification tools
   - Toggle syntax highlighting and word wrap

2. **Preview Testing:**
   - Select base URL for testing
   - View live preview in iPhone simulator
   - Manage base URLs for different environments
   - Reload images and content

3. **Content Management:**
   - Copy formatted code
   - Clear editor content
   - Process dynamic fields

---

### 7. Image Checker

**Functionality:**
- Verify image existence across multiple environments
- Support for image paths and UUIDs
- Batch image checking
- Image metadata display (dimensions, aspect ratio)

**Business Rules:**
- Supports image paths and UUID formats
- Checks against configured base URLs
- Normalizes input formats automatically
- Provides detailed metadata for existing images
- Handles CORS limitations with image probing

**User Flow:**
1. **Input Setup:**
   - Enter image paths or UUIDs (one per line)
   - System normalizes input formats

2. **Image Checking:**
   - Click "Check Images" button
   - System tests against all configured base URLs
   - Results show existence status and metadata

3. **Results Review:**
   - View image existence status
   - Check dimensions and aspect ratios
   - Clear results when needed

---

### 8. Splunk Template Editor

**Functionality:**
- Edit and format Splunk queries
- Syntax highlighting for Splunk SPL
- Query formatting and minification
- Space removal after equals signs

**Business Rules:**
- Supports Splunk SPL syntax
- Provides formatting and minification options
- Handles special Splunk query formatting rules
- Maintains query structure integrity

**User Flow:**
1. **Query Editing:**
   - Paste or type Splunk query
   - Use formatting tools (format, minify)
   - Toggle syntax highlighting

2. **Query Processing:**
   - Remove spaces after equals signs
   - Copy formatted query
   - Clear editor content

---

### 9. Deploy Documentation Generator

**Functionality:**
- Generate deployment documentation templates
- Process table names for configuration deployment
- Create structured documentation format

**Business Rules:**
- Processes table names line by line
- Generates standardized documentation templates
- Supports configuration deployment workflows

**User Flow:**
1. **Input Setup:**
   - Enter table names (one per line)
   - Paste from external sources

2. **Document Generation:**
   - Click "Generate Document" button
   - System creates documentation template
   - Review generated content

---

### 10. UUID Generator

**Functionality:**
- Generate UUID v4 strings
- Single and batch UUID generation
- Copy individual or multiple UUIDs

**Business Rules:**
- Generates standard UUID v4 format
- Supports batch generation (1-1000 UUIDs)
- Provides individual and bulk copy options

**User Flow:**
1. **Single UUID:**
   - Click "Generate" button
   - Copy generated UUID

2. **Multiple UUIDs:**
   - Enter desired quantity (1-1000)
   - Click "Generate" button
   - Copy all UUIDs or clear results

---

## Technical Architecture

### Core Components
- **Router:** Handles navigation and URL management
- **State Management:** Centralized application state
- **UI Manager:** Manages interface updates and loading states
- **Resource Loader:** Dynamic loading of tool modules and CSS
- **Analytics:** Usage tracking and statistics

### Data Storage
- **Local Storage:** Schema storage, usage statistics, user preferences
- **Session Storage:** Temporary data and file processing
- **File System:** Import/export capabilities

### Security Considerations
- **SQL Injection Prevention:** Input validation and parameterization
- **File Upload Security:** Type validation and size limits
- **Data Sanitization:** Input cleaning and validation
- **CORS Handling:** Proper cross-origin request management

---

## Performance Requirements

### Response Times
- Tool loading: < 2 seconds
- Query generation: < 5 seconds
- File processing: < 10 seconds for typical files
- Search operations: < 1 second

### Resource Limits
- File upload size: Configurable per feature
- Schema storage: 100 schemas maximum
- Batch processing: Optimized for large datasets
- Memory usage: Efficient cleanup and management

### Browser Compatibility
- Modern browsers with ES6+ support
- File API compatibility
- Local storage support
- CSS Grid and Flexbox support

---

## Future Enhancements

### Planned Features
- Database connectivity for schema import
- Advanced query optimization suggestions
- Collaborative schema sharing
- Export to multiple database formats
- Enhanced mobile responsiveness
- Plugin architecture for custom tools

### Integration Opportunities
- CI/CD pipeline integration
- Database management tools
- Version control systems
- Cloud storage services
- Enterprise authentication systems

---

## Success Metrics

### User Engagement
- Daily active users
- Tool usage frequency
- Session duration
- Feature adoption rates

### Performance Metrics
- Query generation accuracy
- File processing success rates
- Error rates and resolution
- User satisfaction scores

### Business Impact
- Development time savings
- Error reduction in SQL queries
- Improved deployment documentation
- Enhanced productivity