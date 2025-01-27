export class QueryInService {
    generateQuery(inputValues, schemaName, tableName, fieldName) {
        const values = inputValues
            .split("\n")
            .filter((value) => value.trim() !== "")
            .map((value) => `    '${value.trim()}'`)
            .join(",\n");

        const query = `SELECT *
FROM ${schemaName}.${tableName}
WHERE ${fieldName} IN (
${values});`;

        return query;
    }
}