export interface ScanOptions {
    debug?: boolean;
    ignore?: string[];
}

export interface ScanResult {
    usedVars: Set<string>;
    definedVars: Set<string>;
    unusedVars: string[];
    missingVars: string[];
}
