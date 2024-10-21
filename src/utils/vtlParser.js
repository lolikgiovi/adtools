const defaultFormatters = {
  currency: (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(numValue)
      .replace(/\s/g, "")
      .replace(/Rp\s?/, "");
  },
  date: (value, format) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const formatOptions = {
      short: { year: "numeric", month: "short", day: "numeric" },
      medium: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
      long: {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
      full: {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      },
    };

    return new Intl.DateTimeFormat(
      "id-ID",
      formatOptions[format] || formatOptions["medium"]
    ).format(date);
  },
};

let customFormatters = {};

export function addCustomFormatter(name, formatter) {
  customFormatters[name] = formatter;
}

export function parseVelocityTemplate(content) {
  // Parse currency
  content = content.replace(
    /\$format\.currency\((\$\{[^}]+\}|\d+(?:\.\d+)?)\)/g,
    (match, p1) => {
      if (p1.startsWith("${") && p1.endsWith("}")) {
        return match; // This is a placeholder, return as is
      }
      return (customFormatters.currency || defaultFormatters.currency)(p1);
    }
  );

  // Parse date
  content = content.replace(
    /\$format\.date\(\$\{([^}]+)\},\s*['"]([^'"]+)['"]\)/g,
    (match, dateStr, formatStr) => {
      return (customFormatters.date || defaultFormatters.date)(
        dateStr,
        formatStr
      );
    }
  );

  // Parse custom formatters
  Object.keys(customFormatters).forEach((formatterName) => {
    if (formatterName !== "currency" && formatterName !== "date") {
      const regex = new RegExp(
        `\\$format\\.${formatterName}\\(([^)]+)\\)`,
        "g"
      );
      content = content.replace(regex, (match, p1) => {
        return customFormatters[formatterName](p1);
      });
    }
  });

  return content;
}
