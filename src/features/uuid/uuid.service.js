export class UuidService {
    generateSingleUuid() {
        return crypto.randomUUID();
    }

    generateMultipleUuids(count) {
        if (count < 1 || count > 2000) {
            throw new Error("Count must be between 1 and 2000");
        }
        return Array.from({ length: count }, () => crypto.randomUUID()).join("\n");
    }
}