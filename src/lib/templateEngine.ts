import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Sample, Library, RunningInfo } from '../types';

export interface DropdownConfig {
    id: string;
    type: string;
    parent_id?: string | null;
    value: string;
}

export interface Step1Info {
    quotation_id: string;
    payment_method: string;
    firstName: string;
    lastName: string;
    email: string;
    institution: string;
    piName: string;
    phone: string;
}

interface TemplateParams {
    step1: Step1Info;
    configs: DropdownConfig[];
}

// Columns definition following UI 1:1 format.
const COLUMNS = [
    { header: 'Sample ID*', key: 'sample_id', width: 20 },
    { header: 'Container ID', key: 'container_id', width: 20 },
    { header: 'Container Type', key: 'container_type', width: 15 },
    { header: 'Well ID', key: 'well_id', width: 10 },
    { header: 'Pooling', key: 'pooling', width: 15 },
    { header: 'Pooled No.', key: 'pulled_no', width: 15 },
    { header: 'Species', key: 'species', width: 15 },
    { header: 'Sample Type', key: 'sample_type', width: 25 },
    { header: 'Conc (ng/ul)', key: 'conc', width: 15 },
    { header: 'Volume (ul)', key: 'volume', width: 15 },
    { header: 'Buffer', key: 'buffer', width: 15 },
    { header: 'UG Ready', key: 'ug_ready', width: 12 },

    { header: 'Lib ID', key: 'lib_id', width: 15 },
    { header: 'Library Type*', key: 'library_type', width: 25 },
    { header: 'Library Kit*', key: 'library_kit', width: 35 },
    { header: 'UG Barcode', key: 'ug_barcode', width: 15 },
    { header: '10X Index (Opt)', key: 'tenx_index', width: 15 },
    { header: 'i7 Seq (Opt)', key: 'i7_seq', width: 15 },
    { header: 'i5 Seq A (Opt)', key: 'i5_seq_a', width: 15 },
    { header: 'i5 Seq B (Opt)', key: 'i5_seq_b', width: 15 },

    { header: 'Wafer Type', key: 'wafer_type', width: 15 },
    { header: 'Wafer Group', key: 'wafer_group', width: 15 },
    { header: '# of Wafer', key: 'num_wafers', width: 15 },
    { header: 'Target Read (M Reads)', key: 'target_read', width: 25 },
];

const CONTAINER_TYPES = ['Tube', 'Strip', '96 well'];
const POOLING_TYPES = ['Individual', 'Pooled'];
const SAMPLE_TYPES = ['gDNA', 'cfDNA', 'Non-Converted Library', 'Converted UG Library', 'UG Library'];
const UG_READY_TYPES = ['Yes', 'No'];
const UG_BARCODES = Array.from({ length: 96 }, (_, i) => `Z${String(i + 1).padStart(4, '0')}`);
const WAFER_GROUPS = Array.from({ length: 50 }, (_, i) => `Group_${i + 1}`);

export async function generateExcelTemplate(params: TemplateParams): Promise<void> {
    const workbook = new ExcelJS.Workbook();

    // 1. Create General Info Sheet (Hidden or purely instructional)
    const infoSheet = workbook.addWorksheet('General Info', {
        properties: { tabColor: { argb: 'FF808080' } }
    });
    infoSheet.columns = [{ width: 25 }, { width: 40 }];
    infoSheet.addRow(['STEP 1 PROJECT INFORMATION', 'Do not edit this sheet directly.']).font = { bold: true };
    infoSheet.addRow([]);

    // Map Step1 properties
    const step1Entries = Object.entries(params.step1);
    step1Entries.forEach(([key, value]) => {
        infoSheet.addRow([key, value || '']);
    });

    infoSheet.addRow([]); // Spacer
    infoSheet.addRow(['--- USER GUIDE ---']).font = { bold: true };
    const guideText = `[User Guide for Data Entry]
Please read the following instructions carefully before filling out this template to ensure successful data validation and processing.

1. Row Configuration
Create one row for every library included in your samples.
For example, if a single sample contains 3 different libraries, you must create 3 separate rows for that sample.

2. Well ID
Enter the Well ID ONLY if the container type is a Strip or Plate.
This field can be left blank for individual tubes or other container types.

3. Pooling Logic
If a sample consists of multiple pooled libraries, enter the total count of pooled libraries in the designated column for every row associated with that sample.
Ensure the number of rows created for that sample matches the total pooled library count.

4. Wafer Type & Requirements
Whole: Select this if a single sample occupies an entire wafer.
Partial: Select this if:
  - The sample shares a single wafer with other samples.
  - The sample is distributed across multiple wafers.
For Partial types, you MUST fill in the # of Wafer and Target Read columns.

5. Sequencing Capacity (Target Reads)
For samples sharing a wafer (Partial), the sum of Target Reads for all samples assigned to that specific wafer must equal exactly 10,000 M reads.`;

    const guideLines = guideText.split('\n');
    let currentRow = infoSheet.rowCount + 1;

    guideLines.forEach(line => {
        const row = infoSheet.getRow(currentRow);
        row.getCell(1).value = line;

        // Merge from A to M to give it plenty of horizontal space
        infoSheet.mergeCells(`A${currentRow}:M${currentRow}`);

        const mergedCell = row.getCell(1);
        mergedCell.alignment = { wrapText: false, horizontal: 'left', vertical: 'middle' };

        // Apply soft gray background to the guide section
        mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };

        // Slightly bold the headers in the guide
        if (line.match(/^[0-9]\.|^\[User Guide/)) {
            mergedCell.font = { bold: true, color: { argb: 'FF333333' } };
        } else {
            mergedCell.font = { color: { argb: 'FF555555' } };
        }

        currentRow++;
    });

    // Freeze panes: Keep top general info fixed while scrolling instructions
    infoSheet.views = [
        { state: 'frozen', ySplit: 11 } // Freeze above the user guide
    ];

    // Protect General Info sheet
    await infoSheet.protect('psomagen', { selectLockedCells: true });

    // 2. Create LookupData Sheet for Dependent Dropdowns
    const lookupSheet = workbook.addWorksheet('LookupData', { state: 'hidden' });

    const configLibTypes = params.configs.filter(c => c.type === 'lib_type');

    // Setup precise exact-match Matrix for OFFSET/MATCH
    configLibTypes.forEach((libType, idx) => {
        const colNumber = idx + 1;
        const kits = params.configs.filter(c => c.type === 'lib_kit' && c.parent_id === libType.id).map(c => c.value);

        // Row 1 is the exact Library Type name. Rows 2+ are the Kits.
        lookupSheet.getColumn(colNumber).values = [libType.value, ...kits];
    });

    const nextColIdx = configLibTypes.length + 1;

    // Barcodes range
    const bcColLetter = lookupSheet.getColumn(nextColIdx).letter;
    lookupSheet.getColumn(nextColIdx).values = ['UG_Barcodes', ...UG_BARCODES];
    workbook.definedNames.add(`LookupData!$${bcColLetter}$2:$${bcColLetter}$${UG_BARCODES.length + 1}`, 'UG_Barcodes');

    // Empty list reference for conditional dropdown restriction
    const emptyColLetter = lookupSheet.getColumn(nextColIdx + 1).letter;
    lookupSheet.getColumn(nextColIdx + 1).values = ['Empty'];
    workbook.definedNames.add(`LookupData!$${emptyColLetter}$2:$${emptyColLetter}$2`, 'Empty_List');

    // Wafer Groups range
    const wgColLetter = lookupSheet.getColumn(nextColIdx + 2).letter;
    lookupSheet.getColumn(nextColIdx + 2).values = ['Wafer_Groups', ...WAFER_GROUPS];
    workbook.definedNames.add(`LookupData!$${wgColLetter}$2:$${wgColLetter}$${WAFER_GROUPS.length + 1}`, 'Wafer_Groups');

    // Names of Library Types
    workbook.definedNames.add(`LookupData!$A$1:$${lookupSheet.getColumn(configLibTypes.length).letter}$1`, 'Library_Type_Row');


    // 3. Create Manifest Template Sheet
    const sheet = workbook.addWorksheet('Manifest Template', {
        properties: { tabColor: { argb: 'FF0A3D91' } }
    });

    sheet.columns = COLUMNS.map(col => ({ key: col.key, width: col.width }));

    // Super Headers (Row 1)
    sheet.getRow(1).values = Array(24).fill('');
    sheet.getCell('A1').value = 'Sample Information';
    sheet.mergeCells('A1:L1');
    sheet.getCell('M1').value = 'Library Information';
    sheet.mergeCells('M1:T1');
    sheet.getCell('U1').value = 'Sequencing Configuration';
    sheet.mergeCells('U1:X1');

    // Normal Headers (Row 2)
    sheet.getRow(2).values = COLUMNS.map(col => col.header);

    // Header styling helper
    const formatHeader = (cell: ExcelJS.Cell, bgColor: string) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        };
    };

    // Apply Super Header Styles (Darker shades)
    formatHeader(sheet.getCell('A1'), 'FF0A3D91'); // Dark Blue
    formatHeader(sheet.getCell('M1'), 'FF006400'); // Dark Green
    formatHeader(sheet.getCell('U1'), 'FF8B0000'); // Dark Red

    // Apply Sub Header Styles (Lighter shades)
    const subRow = sheet.getRow(2);
    for (let c = 1; c <= 12; c++) formatHeader(subRow.getCell(c), 'FF1E90FF'); // Dodger Blue
    for (let c = 13; c <= 20; c++) formatHeader(subRow.getCell(c), 'FF2E8B57'); // Sea Green
    for (let c = 21; c <= 24; c++) formatHeader(subRow.getCell(c), 'FFCD5C5C'); // Indian Red

    // Build the rows (Apply data validation up to 500 rows to allow users to add data freely)
    for (let i = 0; i < 500; i++) {
        const rowIndex = i + 3; // Shifted row index due to super header
        const row = sheet.getRow(rowIndex);

        // Pre-fill defaults only for the first row (Example)
        if (i === 0) {
            row.getCell('sample_id').value = 'Example_1';
            row.getCell('container_type').value = 'Tube';
            row.getCell('pooling').value = 'Individual';
            row.getCell('species').value = 'Human';
            row.getCell('sample_type').value = 'gDNA';
            row.getCell('buffer').value = '10mM Tris-HCl';
            row.getCell('ug_ready').value = 'No';
        }

        // Apply Data Validations
        row.getCell('container_type').dataValidation = {
            type: 'list', allowBlank: true, formulae: [`"${CONTAINER_TYPES.join(',')}"`]
        };
        row.getCell('pooling').dataValidation = {
            type: 'list', allowBlank: true, formulae: [`"${POOLING_TYPES.join(',')}"`]
        };
        row.getCell('sample_type').dataValidation = {
            type: 'list', allowBlank: true, formulae: [`"${SAMPLE_TYPES.join(',')}"`]
        };
        // UG Ready is just Yes/No
        row.getCell('ug_ready').dataValidation = {
            type: 'list', allowBlank: true, formulae: [`"${UG_READY_TYPES.join(',')}"`]
        };

        row.getCell('library_type').dataValidation = {
            type: 'list', allowBlank: true, formulae: ['Library_Type_Row']
        };

        // DEPENDENT DROPDOWN using OFFSET and MATCH to capture exact string headers including special characters
        const libTypeCellAddress = `$N${rowIndex}`;
        row.getCell('library_kit').dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`OFFSET(LookupData!$A$1, 1, MATCH(${libTypeCellAddress}, Library_Type_Row, 0)-1, COUNTA(OFFSET(LookupData!$A$1, 1, MATCH(${libTypeCellAddress}, Library_Type_Row, 0)-1, 100, 1)), 1)`],
            error: 'Select a valid Library Kit based on the chosen Library Type.',
            showErrorMessage: true
        };

        // UG Barcode is conditionally restricted based on UG Ready
        const ugReadyCellAddress = `$L${rowIndex}`;
        row.getCell('ug_barcode').dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`IF(${ugReadyCellAddress}="Yes", UG_Barcodes, Empty_List)`],
            error: 'UG Barcode is only allowed when UG Ready is Yes.',
            showErrorMessage: true
        };

        // Conditional Formatting: Highlight Library Kit red if type changes and kit becomes mismatched (since Excel can't auto-clear without VBA)
        sheet.addConditionalFormatting({
            ref: `O${rowIndex}:O${rowIndex}`,
            rules: [{
                type: 'expression',
                priority: 1,
                formulae: [`ISERROR(MATCH(O${rowIndex}, OFFSET(LookupData!$A$1, 1, MATCH(${libTypeCellAddress}, Library_Type_Row, 0)-1, 100, 1), 0))`],
                style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' } } }
            }]
        });

        // Step 4 Data Validations
        row.getCell('wafer_type').dataValidation = {
            type: 'list', allowBlank: true, formulae: ['"Whole,Partial"']
        };
        row.getCell('wafer_group').dataValidation = {
            type: 'list', allowBlank: true, formulae: ['Wafer_Groups']
        };
        row.getCell('num_wafers').dataValidation = {
            type: 'whole', operator: 'greaterThan', formulae: ['0'], allowBlank: true, showErrorMessage: true, error: 'Must be a positive whole number'
        };
        row.getCell('target_read').dataValidation = {
            type: 'whole', operator: 'greaterThan', formulae: ['0'], allowBlank: true, showErrorMessage: true, error: 'Must be a positive whole number'
        };
    }

    // Protect sheet structural layout (Headers locked, Data rows fully unlocked)
    sheet.getRow(1).eachCell(cell => { cell.protection = { locked: true }; });
    sheet.getRow(2).eachCell(cell => { cell.protection = { locked: true }; });

    for (let i = 3; i <= 502; i++) {
        sheet.getRow(i).eachCell({ includeEmpty: true }, (cell) => {
            cell.protection = { locked: false };
        });
    }

    await sheet.protect('psomagen', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: true,
        formatColumns: true,
        formatRows: true,
        insertRows: true,
        insertColumns: false,
        insertHyperlinks: true,
        deleteRows: true,
        deleteColumns: false,
        sort: true,
        autoFilter: true,
        objects: false,
        scenarios: false
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'UG_Sample_Manifest_Template.xlsx');
}

export interface ValidationError {
    row: number;
    column: string;
    message: string;
}

export interface ParsedTemplateConfig {
    step1: Step1Info;
    samples: Sample[];
    libraries: Library[];
    runningInfo: RunningInfo[];
    errors: ValidationError[];
}

export async function parseAndValidateExcel(file: File, configs: DropdownConfig[]): Promise<ParsedTemplateConfig> {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    // 1. Read Step 1 Info
    const infoSheet = workbook.getWorksheet('General Info');
    const step1: Step1Info = {
        quotation_id: '', payment_method: '', firstName: '', lastName: '', email: '', institution: '', piName: '', phone: ''
    };

    if (infoSheet) {
        infoSheet.eachRow((row, rowNumber) => {
            if (rowNumber > 2) { // Skip headers
                const key = row.getCell(1).text.trim();
                const val = row.getCell(2).text.trim();
                if (key && Object.keys(step1).includes(key)) {
                    (step1 as any)[key] = val;
                }
            }
        });
    }

    const sheet = workbook.getWorksheet('Manifest Template');
    if (!sheet) {
        return { step1, samples: [], libraries: [], runningInfo: [], errors: [{ row: 0, column: 'Sheet', message: 'Missing "Manifest Template" worksheet.' }] };
    }

    const expectedHeaders = COLUMNS.map(c => c.header);
    const headerRow = sheet.getRow(2);
    let headerError = false;

    headerRow.eachCell((cell, colNumber) => {
        if (cell.text.trim() !== expectedHeaders[colNumber - 1]) headerError = true;
    });

    if (headerError) {
        return { step1, samples: [], libraries: [], runningInfo: [], errors: [{ row: 2, column: 'Headers', message: 'Headers modified.' }] };
    }

    const samples: Sample[] = [];
    const libraries: Library[] = [];
    const runningInfo: RunningInfo[] = [];
    const errors: ValidationError[] = [];

    const generateId = () => Math.random().toString(36).substr(2, 9);
    const sampleWellMap = new Map<string, string>();

    const rowCount = sheet.rowCount;
    if (rowCount < 3) return { step1, samples: [], libraries: [], runningInfo: [], errors: [{ row: 3, column: 'Data', message: 'No rows found.' }] };

    for (let i = 3; i <= rowCount; i++) {
        const row = sheet.getRow(i);
        let isEmpty = true;
        row.eachCell((cell) => { if (cell.text.trim() !== '') isEmpty = false; });
        if (isEmpty) continue;

        const getText = (colKey: string) => {
            const colIndex = COLUMNS.findIndex(c => c.key === colKey) + 1;
            const val = row.getCell(colIndex).value;
            if (val && typeof val === 'object' && 'result' in val) {
                return (val as any).result?.toString() || '';
            }
            return row.getCell(colIndex).text?.trim() || '';
        };

        const sampleId = getText('sample_id');
        const libType = getText('library_type');
        const libKit = getText('library_kit');
        const conc = getText('conc');
        const volume = getText('volume');
        const sampleType = getText('sample_type');
        const ugReady = getText('ug_ready');
        const ugBarcode = getText('ug_barcode');

        const waferType = getText('wafer_type');
        const waferGroup = getText('wafer_group');
        const numWafers = getText('num_wafers');
        const targetRead = getText('target_read');
        const wellId = getText('well_id');

        // Validations
        if (!sampleId) errors.push({ row: i, column: 'Sample ID', message: 'Mandatory field missing.' });
        if (!libType) errors.push({ row: i, column: 'Library Type', message: 'Mandatory field missing.' });

        // 1:1 Mapping Validation for Sample ID <-> Well ID
        if (sampleId) {
            if (sampleWellMap.has(sampleId)) {
                const recordedWellId = sampleWellMap.get(sampleId);
                if (recordedWellId !== wellId) {
                    errors.push({
                        row: i,
                        column: 'Well ID',
                        message: `Error: Sample ID '${sampleId}' is assigned to multiple Well IDs (${recordedWellId || 'Empty'} vs ${wellId || 'Empty'}). Please ensure each sample is assigned to a single well.`
                    });
                }
            } else {
                sampleWellMap.set(sampleId, wellId);
            }
        }

        // Strict Backend Validation: check if Kit matches Type internally
        if (libType && libKit) {
            const typeConfig = configs.find(c => c.type === 'lib_type' && c.value === libType);
            if (!typeConfig) {
                errors.push({ row: i, column: 'Library Type', message: 'Invalid Library Type.' });
            } else {
                const validKits = configs.filter(c => c.type === 'lib_kit' && c.parent_id === typeConfig.id).map(c => c.value);
                if (validKits.length > 0 && !validKits.includes(libKit)) {
                    errors.push({ row: i, column: 'Library Kit', message: `Invalid kit for type ${libType}.` });
                }
            }
        }

        // Logic check: Sample Type -> UG Ready
        if (['Converted UG Library', 'UG Library'].includes(sampleType)) {
            if (ugReady !== 'Yes') {
                errors.push({ row: i, column: 'UG Ready', message: `Must be 'Yes' when Sample Type is '${sampleType}'.` });
            }
        }

        // Logic check: UG Ready -> UG Barcode
        if (ugReady === 'Yes' && !ugBarcode) {
            errors.push({ row: i, column: 'UG Barcode', message: 'Mandatory when UG Ready is Yes.' });
        } else if (ugReady === 'No' && ugBarcode) {
            errors.push({ row: i, column: 'UG Barcode', message: 'Must be empty when UG Ready is No.' });
        }

        if (conc && isNaN(Number(conc))) errors.push({ row: i, column: 'Conc (ng/ul)', message: 'Invalid number.' });
        if (volume && isNaN(Number(volume))) errors.push({ row: i, column: 'Volume (ul)', message: 'Invalid number.' });

        if (numWafers && isNaN(Number(numWafers))) errors.push({ row: i, column: '# of Wafer', message: 'Invalid number.' });
        if (targetRead && isNaN(Number(targetRead))) errors.push({ row: i, column: 'Target Read (M Reads)', message: 'Invalid number.' });
        if (waferType === 'Whole' && targetRead && targetRead !== '10000') {
            errors.push({ row: i, column: 'Target Read (M Reads)', message: 'Must be exactly 10000 if Whole wafer.' });
        }

        samples.push({
            id: generateId(), sample_id: sampleId, container_id: getText('container_id'),
            container_type: getText('container_type') || 'Tube', pooling: getText('pooling') || 'Individual',
            species: getText('species') || 'Human', sample_type: sampleType || 'gDNA', conc, volume,
            buffer: getText('buffer') || '10mM Tris-HCl', ug_ready: ugReady || 'No', well_id: getText('well_id'),
            pulled_no: getText('pulled_no')
        });

        libraries.push({
            id: generateId(), sample_id: sampleId, lib_id: getText('lib_id'), library_type: libType,
            library_kit: libKit, ug_barcode: ugBarcode, tenx_index: getText('tenx_index'),
            i7_seq: getText('i7_seq'), i5_seq_a: getText('i5_seq_a'), i5_seq_b: getText('i5_seq_b')
        });

        // Step 4 Extraction (we capture unique lines or process them directly)
        if (waferType || waferGroup || numWafers || targetRead) {
            runningInfo.push({
                id: generateId(),
                sample_id: sampleId,
                wafer_type: waferType,
                wafer_group: waferGroup,
                num_wafers: numWafers,
                target_read: waferType === 'Whole' ? '10000' : targetRead
            });
        }
    }

    // Deduplicate running_info grouping by unique sample_ids to mirror UI behavior
    const uniqueRunningInfoMap = new Map<string, RunningInfo>();
    for (const ri of runningInfo) {
        if (!uniqueRunningInfoMap.has(ri.sample_id)) {
            uniqueRunningInfoMap.set(ri.sample_id, ri);
        }
    }

    return { step1, samples, libraries, runningInfo: Array.from(uniqueRunningInfoMap.values()), errors };
}
