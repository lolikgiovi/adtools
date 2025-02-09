export const APP_CONFIG = {
  DEFAULT_TOOL: "quickQuery",
  ANALYTICS_DELAY: 10, //milliseconds
  IS_DEVELOPMENT: ["localhost", "127.0.0.1"].includes(location.hostname),
  BASE_CSS_PATH: "/src/styles/tools",
  TOOLS_BASE_PATH: "/tools",
};

export const TOOLS_CONFIG = {
  uuid: {
    init: "initUuidGenerator",
    title: "UUIDv4",
    description: "Generate UUID v4 strings",
    order: 1,
  },
  queryin: {
    init: "initQueryInGenerator",
    title: "Query IN",
    description: "Generate SQL IN clauses",
    order: 2,
  },
  image: {
    init: "initImageConverter",
    title: "Image-Base64",
    description: "Convert images to base64",
    order: 3,
  },
  splunk: {
    init: "initSplunkTemplate",
    title: "Splunk Template",
    description: "Generate Splunk queries",
    order: 4,
  },
  html: {
    init: "initHtmlTemplate",
    title: "HTML Template",
    description: "Generate HTML templates",
    order: 5,
  },
  screenshot: {
    init: "initScreenshotTemplate",
    title: "Deploy Docs",
    description: "Create deployment documentation",
    order: 6,
  },
  querify: {
    init: "initQuerify",
    title: "Querify",
    description: "SQL query builder",
    order: 7,
  },
  quickQuery: {
    init: "initQuickQuery",
    title: "Quick Query",
    description: "Fast SQL query generator",
    order: 8,
  },
};
