import fs from 'fs';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

const csvContent = fs.readFileSync('Library kit info.csv', 'utf-8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const typesMap = new Map(); // name -> id
const sqlLines = [];

sqlLines.push(`-- Bulk Migration for Library Configuration`);
sqlLines.push(`-- Clears existing configuration and inserts new structured hierarchy`);
sqlLines.push(`BEGIN;`);
sqlLines.push(`DELETE FROM config_dropdowns WHERE type IN ('lib_type', 'lib_kit');`);
sqlLines.push(``);

const typeInserts = [];
const kitInserts = [];

for (const row of records) {
    let parentName = row['Libraty Type']?.trim();
    let childName = row['Library kit']?.trim();

    if (!parentName) continue;

    // Fix encoding glitches for smart quotes and ndashes
    parentName = parentName.replace(/\uFFFD/g, '-');
    if (childName) childName = childName.replace(/\uFFFD/g, '-');

    if (!typesMap.has(parentName)) {
        const parentId = crypto.randomUUID();
        typesMap.set(parentName, parentId);
        typeInserts.push(`  ('${parentId}', 'lib_type', '${parentName.replace(/'/g, "''")}', NULL)`);
    }

    if (childName) {
        const parentId = typesMap.get(parentName);
        const childId = crypto.randomUUID();
        kitInserts.push(`  ('${childId}', 'lib_kit', '${childName.replace(/'/g, "''")}', '${parentId}')`);
    }
}

if (typeInserts.length > 0) {
    sqlLines.push(`INSERT INTO config_dropdowns (id, type, value, parent_id) VALUES`);
    sqlLines.push(typeInserts.join(',\n') + ';');
    sqlLines.push(``);
}

if (kitInserts.length > 0) {
    sqlLines.push(`INSERT INTO config_dropdowns (id, type, value, parent_id) VALUES`);
    sqlLines.push(kitInserts.join(',\n') + ';');
    sqlLines.push(``);
}

sqlLines.push(`COMMIT;`);

fs.writeFileSync('db_migration.sql', sqlLines.join('\n'));
console.log('Migration SQL generated successfully: db_migration.sql');
