export const oracleReservedWords = new Set([
  "access",
  "add",
  "all",
  "alter",
  "and",
  "any",
  "as",
  "asc",
  "audit",
  "between",
  "by",
  "char",
  "check",
  "cluster",
  "column",
  "comment",
  "compress",
  "connect",
  "create",
  "current",
  "date",
  "decimal",
  "default",
  "delete",
  "desc",
  "distinct",
  "drop",
  "else",
  "exclusive",
  "exists",
  "file",
  "float",
  "for",
  "from",
  "grant",
  "group",
  "having",
  "identified",
  "immediate",
  "in",
  "increment",
  "index",
  "initial",
  "insert",
  "integer",
  "intersect",
  "into",
  "is",
  "level",
  "like",
  "lock",
  "long",
  "maxextents",
  "minus",
  "mlslabel",
  "mode",
  "modify",
  "noaudit",
  "nocompress",
  "not",
  "nowait",
  "null",
  "number",
  "of",
  "offline",
  "on",
  "online",
  "option",
  "or",
  "order",
  "pctfree",
  "prior",
  "privileges",
  "public",
  "raw",
  "rename",
  "resource",
  "revoke",
  "row",
  "rowid",
  "rownum",
  "rows",
  "select",
  "session",
  "set",
  "share",
  "size",
  "smallint",
  "start",
  "successful",
  "synonym",
  "sysdate",
  "table",
  "then",
  "to",
  "trigger",
  "uid",
  "union",
  "unique",
  "update",
  "user",
  "validate",
  "values",
  "varchar",
  "varchar2",
  "view",
  "whenever",
  "where",
  "with",
  "sequence",
  "type",
  "package",
  "body",
]);

export const oracleDateFormats = {
  DATE_ONLY: {
    formats: ["DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD", "DD/M/YYYY", "M/D/YYYY", "DD-MON-YY", "DD-MON-YYYY"],
    regex: /^(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{2}-[A-Z]{3}-\d{2}|\d{2}-[A-Z]{3}-\d{4})$/i,
    oracleFormat: "YYYY-MM-DD",
  },
  DATE_TIME: {
    formats: ["DD-MM-YYYY HH:mm:ss", "YYYY-MM-DD HH:mm:ss", "DD-MON-YYYY HH:mm:ss"],
    regex: /^(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-[A-Z]{3}-\d{4})\s\d{2}:\d{2}:\d{2}$/i,
    oracleFormat: "DD-MM-YYYY HH24:MI:SS",
  },
  ISO_TIMESTAMP: {
    formats: ["YYYY-MM-DD HH:mm:ss.SSS"],
    regex: /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3}$/,
    oracleFormat: "YYYY-MM-DD HH24:MI:SS.FF3",
  },
  TIMESTAMP: {
    formats: ["DD-MM-YYYY HH.mm.ss,SSSSSSSSS"],
    regex: /^\d{2}-\d{2}-\d{4}\s\d{2}\.\d{2}\.\d{2},\d{1,9}$/,
    oracleFormat: "DD-MM-YYYY HH24:MI:SS.FF9",
  },
  TIMESTAMP_AM_PM: {
    formats: ["M/D/YYYY h:mm:ss.SSSSSS A"],
    regex: /^\d{1,2}\/\d{1,2}\/\d{4}\s\d{1,2}:\d{2}:\d{2}(\.\d{1,6})?\s[AP]M$/,
    oracleFormat: "MM/DD/YYYY HH24:MI:SS.FF6",
  },
};

export const sampleSchema1 = [
  ["TABLE_ID", "VARCHAR2(36)", "PK", "", "1"],
  ["DESC_ID", "VARCHAR2(500)", "PK", "", "2"],
  ["DESC_EN", "VARCHAR2(500)", "No", "", "3"],
  ["AMOUNT", "NUMBER(15,2)", "Yes", "", "4"],
  ["SEQUENCE", "NUMBER(3,0)", "No", "", "5"],
  ["IS_ACTIVE", "NUMBER", "No", "", "6"],
  ["CREATED_TIME", "TIMESTAMP(6)", "No", "", "7"],
  ["CREATED_BY", "VARCHAR2(36)", "No", "", "8"],
  ["UPDATED_TIME", "TIMESTAMP(6)", "No", "", "9"],
  ["UPDATED_BY", "VARCHAR2(36)", "No", "", "10"],
];

export const sampleData1 = [
  ["TABLE_ID", "DESC_ID", "DESC_EN", "AMOUNT", "SEQUENCE", "IS_ACTIVE", "CREATED_TIME", "CREATED_BY", "UPDATED_TIME", "UPDATED_BY"],
  ["TABLE_ID_1", "DESC_ID_1", "DESC_EN_1", "100000", "1", "1", "CREATED_TIME_1", "CREATED_BY_1", "UPDATED_TIME_1", "UPDATED_BY_1"],
  ["TABLE_ID_2", "DESC_ID_2", "DESC_EN_2", "", "2", "1", "CREATED_TIME_2", "CREATED_BY_2", "UPDATED_TIME_2", "UPDATED_BY_2"],
];

export const initialSchemaTableSpecification = {
  data: [["", "", "", ""]], // empty data
  colHeaders: ["Field Name", "Data Type", "Nullable/PK", "Default", "Field Order", "Comments"],
  columns: [
    {
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        td.style.fontWeight = "bold";
      },
    },
    {},
    {
      type: "dropdown",
      source: ["Yes", "No", "PK"],
      validator: function (value, callback) {
        callback(["Yes", "No", "PK", "yes", "no", "pk", "Yes", "No", "Pk", "Y", "N", "y", "n"].includes(value));
      },
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.DropdownRenderer.apply(this, arguments);
        td.style.textAlign = "center";
      },
    },
    {},
    {
      type: "numeric",
      validator: function (value, callback) {
        callback(value === null || value === "" || !isNaN(parseFloat(value)));
      },
      renderer: function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.NumericRenderer.apply(this, arguments);
        td.style.textAlign = "center";
      },
    },
    {},
  ],
  height: "auto",
  licenseKey: "non-commercial-and-evaluation",
  minCols: 6,
  minRows: 1,
  contextMenu: true,
  mergeCells: true,
  manualColumnResize: true,
  afterChange: (changes) => {
    if (changes) {
      this.updateDataSpreadsheet();
    }
  },
  afterGetColHeader: function (col, TH) {
    const header = TH.querySelector(".colHeader");
    if (header) {
      header.style.fontWeight = "bold";
    }
  },
};

export const initialDataTableSpecification = {
  data: [[], []],
  colHeaders: true,
  rowHeaders: true,
  height: "auto",
  licenseKey: "non-commercial-and-evaluation",
  minCols: 1,
  contextMenu: true,
  manualColumnResize: true,
  stretchH: "none",
  className: "hide-scrollbar",
  cells: function (row, col) {
    const cellProperties = {};
    if (row === 0) {
      cellProperties.renderer = function (instance, td, row, col, prop, value, cellProperties) {
        Handsontable.renderers.TextRenderer.apply(this, arguments);
        td.style.fontWeight = "bold";
        td.style.textAlign = "center";
      };
    }
    return cellProperties;
  },
};
