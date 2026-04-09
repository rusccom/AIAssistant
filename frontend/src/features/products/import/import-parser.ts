export interface ImportVariant {
    title: string;
    price: number;
    sku: string | null;
}

export interface ImportProduct {
    title: string;
    description: string;
    status: 'active' | 'inactive';
    variants: ImportVariant[];
}

type RawImportRow = Record<string, unknown>;
type FlatImportRow = Omit<ImportProduct, 'variants'> & {
    variantTitle: string;
    price: number;
    sku: string | null;
};

const TITLE_FIELDS = ['Product Title', 'title', 'name', 'Name', 'Product_Title'] as const;
const DESCRIPTION_FIELDS = ['Product Description', 'description', 'Description', 'Product_Description'] as const;
const VARIANT_FIELDS = ['Variant Title', 'variant', 'Variant', 'Variant_Title'] as const;
const PRICE_FIELDS = ['Price', 'price'] as const;
const SKU_FIELDS = ['SKU', 'sku', 'Sku'] as const;
const STATUS_FIELDS = ['Status', 'status'] as const;

export async function parseImportFile(file: File): Promise<RawImportRow[]> {
    const content = await readFileAsText(file);

    if (isJsonFile(file)) {
        return parseJsonContent(content);
    }

    if (isCsvFile(file)) {
        return parseCsvContent(content);
    }

    throw new Error('Only CSV and JSON files are supported.');
}

export function processImportData(rawData: RawImportRow[], groupVariants = true): ImportProduct[] {
    if (rawData.every(isStructuredImportProduct)) {
        return rawData.map(normalizeStructuredProduct).filter(Boolean) as ImportProduct[];
    }

    return groupVariants ? groupProducts(rawData) : splitProducts(rawData);
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read the selected file.'));
        reader.readAsText(file);
    });
}

function isJsonFile(file: File): boolean {
    return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
}

function isCsvFile(file: File): boolean {
    return file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv');
}

function parseJsonContent(content: string): RawImportRow[] {
    const parsed = JSON.parse(removeBom(content));

    if (!Array.isArray(parsed)) {
        throw new Error('JSON file must contain an array.');
    }

    return parsed.filter(isRecord);
}

function parseCsvContent(content: string): RawImportRow[] {
    const lines = removeBom(content).split(/\r?\n/).filter(hasValue);

    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row.');
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = parseCsvLine(lines[0], delimiter);

    if (headers.length < 3) {
        throw new Error(`Invalid CSV format. Expected multiple columns, found: ${headers.join(', ')}`);
    }

    return lines.slice(1).map(line => mapCsvRow(headers, parseCsvLine(line, delimiter)));
}

function removeBom(content: string): string {
    return content.replace(/^\uFEFF/, '');
}

function hasValue(line: string): boolean {
    return line.trim().length > 0;
}

function detectDelimiter(line: string): string {
    const semicolons = (line.match(/;/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    return semicolons > commas ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const next = line[index + 1];

        if (char === '"' && inQuotes && next === '"') {
            current += '"';
            index += 1;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

function mapCsvRow(headers: string[], columns: string[]): RawImportRow {
    return headers.reduce<RawImportRow>((row, header, index) => {
        row[header] = columns[index] || '';
        return row;
    }, {});
}

function splitProducts(rawData: RawImportRow[]): ImportProduct[] {
    return rawData.map(toStandaloneProduct).filter(Boolean) as ImportProduct[];
}

function groupProducts(rawData: RawImportRow[]): ImportProduct[] {
    const products = new Map<string, ImportProduct>();

    rawData.forEach(row => addVariantToProductMap(products, row));

    return Array.from(products.values()).filter(hasVariants);
}

function toStandaloneProduct(row: RawImportRow): ImportProduct | null {
    const normalized = normalizeFlatRow(row);

    if (!normalized) {
        return null;
    }

    return {
        title: buildStandaloneTitle(normalized.title, normalized.variantTitle),
        description: normalized.description,
        status: normalized.status,
        variants: [{ title: 'Default Title', price: normalized.price, sku: normalized.sku }]
    };
}

function addVariantToProductMap(products: Map<string, ImportProduct>, row: RawImportRow): void {
    const normalized = normalizeFlatRow(row);

    if (!normalized) {
        return;
    }

    const existing = products.get(normalized.title) || createGroupedProduct(normalized);
    existing.variants.push({
        title: normalized.variantTitle,
        price: normalized.price,
        sku: normalized.sku
    });
    products.set(normalized.title, existing);
}

function createGroupedProduct(row: FlatImportRow): ImportProduct {
    return {
        title: row.title,
        description: row.description,
        status: row.status,
        variants: []
    };
}

function normalizeFlatRow(row: RawImportRow): FlatImportRow | null {
    const title = readField(row, TITLE_FIELDS).trim();
    const price = toMinorUnits(parsePrice(readField(row, PRICE_FIELDS)));

    if (!title || price <= 0) {
        return null;
    }

    return {
        title,
        description: readField(row, DESCRIPTION_FIELDS).trim(),
        status: normalizeStatus(readField(row, STATUS_FIELDS)),
        variantTitle: readField(row, VARIANT_FIELDS).trim() || 'Default Title',
        price,
        sku: normalizeSku(readField(row, SKU_FIELDS))
    };
}

function isStructuredImportProduct(row: RawImportRow): boolean {
    return typeof row.title === 'string' && Array.isArray(row.variants);
}

function normalizeStructuredProduct(row: RawImportRow): ImportProduct | null {
    const title = readField(row, TITLE_FIELDS).trim();
    const variants = normalizeStructuredVariants(row.variants);

    if (!title || variants.length === 0) {
        return null;
    }

    return {
        title,
        description: readField(row, DESCRIPTION_FIELDS).trim(),
        status: normalizeStatus(readField(row, STATUS_FIELDS)),
        variants
    };
}

function normalizeStructuredVariants(value: unknown): ImportVariant[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map(normalizeStructuredVariant).filter(Boolean) as ImportVariant[];
}

function normalizeStructuredVariant(value: unknown): ImportVariant | null {
    if (!isRecord(value)) {
        return null;
    }

    const price = toMinorUnits(parsePrice(readField(value, PRICE_FIELDS)));

    if (price <= 0) {
        return null;
    }

    return {
        title: readField(value, VARIANT_FIELDS).trim() || 'Default Title',
        price,
        sku: normalizeSku(readField(value, SKU_FIELDS))
    };
}

function buildStandaloneTitle(title: string, variantTitle: string): string {
    return variantTitle !== 'Default Title' ? `${title} - ${variantTitle}` : title;
}

function hasVariants(product: ImportProduct): boolean {
    return product.variants.length > 0;
}

function normalizeStatus(value: string): 'active' | 'inactive' {
    return value.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function normalizeSku(value: string): string | null {
    const normalized = value.trim();
    return normalized ? normalized : null;
}

function parsePrice(value: string): number {
    const normalized = value.trim().replace(',', '.');
    return Number.parseFloat(normalized || '0');
}

function toMinorUnits(price: number): number {
    return Number.isFinite(price) && price > 0
        ? (price < 1000 ? Math.round(price * 100) : Math.round(price))
        : 0;
}

function readField(row: RawImportRow, fields: readonly string[]): string {
    const value = fields.map(field => row[field]).find(hasDefinedValue);
    return value == null ? '' : String(value);
}

function hasDefinedValue(value: unknown): boolean {
    return value !== undefined && value !== null && String(value).trim() !== '';
}

function isRecord(value: unknown): value is RawImportRow {
    return typeof value === 'object' && value !== null;
}
