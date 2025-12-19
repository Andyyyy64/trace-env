export interface ScanOptions {
    debug?: boolean;
}

export interface ScanResult {
    usedVars: Set<string>;
    definedVars: Set<string>;
    unusedVars: string[];
    missingVars: string[];
}
