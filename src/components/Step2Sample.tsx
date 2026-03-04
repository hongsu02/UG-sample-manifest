import React, { useState } from 'react';
import type { OrderPayload, Sample } from '../types';
import { ArrowDown, Equal, X, Plus, Trash2, LayoutGrid, List } from 'lucide-react';

interface Props {
    payload: OrderPayload;
    setPayload: React.Dispatch<React.SetStateAction<OrderPayload>>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_ROW: Sample = {
    sample_id: '',
    container_id: '',
    container_type: 'Tube',
    pooling: 'Individual',
    species: 'Human',
    sample_type: 'gDNA',
    conc: '',
    volume: '',
    buffer: '10mM Tris-HCl',
    ug_ready: 'No',
    well_id: '',
    pulled_no: ''
};

const WELLS_COL = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
// const WELLS_ROW = Array.from({ length: 12 }, (_, i) => i + 1);

export default function Step2Sample({ payload, setPayload }: Props) {
    // Ensure we have at least one row
    const rows = payload.samples.length > 0 ? payload.samples : [{ ...INITIAL_ROW, id: generateId() }];

    const [numRowsToAdd, setNumRowsToAdd] = useState(1);

    const addRow = () => {
        const newRows = [...rows];
        for (let i = 0; i < numRowsToAdd; i++) {
            newRows.push({ ...INITIAL_ROW, id: generateId() });
        }
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const removeRow = (sampleId: string) => {
        if (rows.length === 1) return;
        // Remove all rows matching this sample_id
        const newRows = rows.filter(r => r.sample_id !== sampleId);
        if (newRows.length === 0) newRows.push({ ...INITIAL_ROW, id: generateId() });
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    // Deduplicate logic for the view
    const uniqueRowsMap = new Map<string, Sample>();
    const uniqueRowIndices = new Map<string, number[]>(); // Tracks all underlying indices for a given sample_id

    rows.forEach((row, idx) => {
        const key = row.sample_id || `empty_${idx}`;
        if (!uniqueRowsMap.has(key)) {
            uniqueRowsMap.set(key, row);
            uniqueRowIndices.set(key, [idx]);
        } else {
            uniqueRowIndices.get(key)!.push(idx);
        }
    });

    const uniqueRows = Array.from(uniqueRowsMap.entries());

    const updateUniqueRow = (sampleIdKey: string, field: keyof Sample, value: string) => {
        const indices = uniqueRowIndices.get(sampleIdKey) || [];
        if (indices.length === 0) return;

        const newRows = [...rows];
        indices.forEach(index => {
            newRows[index] = { ...newRows[index], [field]: value };

            // Auto clear conditionals
            if (field === 'container_type' && !['Strip', '96 well'].includes(value)) {
                newRows[index].well_id = '';
            }
            if (field === 'pooling' && value !== 'Pooled') {
                newRows[index].pulled_no = '';
            }
            if (field === 'sample_type') {
                if (['Converted UG Library', 'UG Library'].includes(value)) {
                    newRows[index].ug_ready = 'Yes';
                } else {
                    newRows[index].ug_ready = 'No';
                }
            }
        });

        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    // Header Actions
    const copyDown = (field: keyof Sample) => {
        if (rows.length <= 1) return;
        const valueToCopy = rows[0][field];
        const newRows = rows.map((row) => ({ ...row, [field]: valueToCopy }));
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const clearColumn = (field: keyof Sample) => {
        if (rows.length <= 1) return;
        const newRows = rows.map((row, i) => (i === 0 ? row : { ...row, [field]: '' }));
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const incrementDown = (field: keyof Sample) => {
        if (rows.length <= 1) return;
        const baseVal = rows[0][field] as string;

        // Regex to find prefix and number
        const match = baseVal.match(/^(.*?)(\d+)$/);
        if (!match) {
            // If no trailing number, fallback to standard copy down
            copyDown(field);
            return;
        }

        const [, prefix, numStr] = match;
        let currentNum = parseInt(numStr, 10);
        const padding = numStr.length; // e.g., '01' -> 2

        const newRows = rows.map((row, i) => {
            if (i === 0) return row;
            currentNum++;
            const nextNumStr = String(currentNum).padStart(padding, '0');
            return { ...row, [field]: `${prefix}${nextNumStr}` };
        });

        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const parseWell = (well: string) => {
        const match = (well || '').match(/^([A-H])(\d+)$/i);
        if (match) {
            return { cIdx: WELLS_COL.indexOf(match[1].toUpperCase()), rIdx: parseInt(match[2], 10) };
        }
        return { cIdx: 0, rIdx: 0 }; // default before first increment
    };

    const fillWellsColWise = () => {
        if (rows.length <= 1) return;
        const newRows = [...rows];
        let { cIdx, rIdx } = parseWell(newRows[0].well_id);
        if (rIdx === 0) rIdx = 1;

        for (let i = 1; i < newRows.length; i++) {
            if (!['Strip', '96 well'].includes(newRows[i].container_type)) continue;
            cIdx++;
            if (cIdx >= 8) { cIdx = 0; rIdx++; }
            if (rIdx > 12) { rIdx = 1; }
            newRows[i].well_id = `${WELLS_COL[cIdx]}${rIdx}`;
        }
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const fillWellsRowWise = () => {
        if (rows.length <= 1) return;
        const newRows = [...rows];
        let { cIdx, rIdx } = parseWell(newRows[0].well_id);
        if (rIdx === 0) rIdx = 1;

        for (let i = 1; i < newRows.length; i++) {
            if (!['Strip', '96 well'].includes(newRows[i].container_type)) continue;
            rIdx++;
            if (rIdx > 12) { rIdx = 1; cIdx++; }
            if (cIdx >= 8) { cIdx = 0; }
            newRows[i].well_id = `${WELLS_COL[cIdx]}${rIdx}`;
        }
        setPayload(prev => ({ ...prev, samples: newRows }));
    };

    const handleNext = () => {
        // Trigger auto-sync in Step 3
        window.dispatchEvent(new CustomEvent('sync-step3'));

        const step3 = document.getElementById('step3-library');
        if (step3) {
            step3.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
                const syncBtn = document.getElementById('sync-step3-btn');
                if (syncBtn) {
                    syncBtn.classList.add('ring-4', 'ring-blue-300');
                    setTimeout(() => syncBtn.classList.remove('ring-4', 'ring-blue-300'), 1500);
                }
            }, 600);
        }
    };

    // Helper Header Cell renderer
    const renderHeaderCell = (title: string, field: keyof Sample, actionType: 'increment' | 'copy' | 'all' | 'none') => (
        <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70]">
            <div className="flex items-center justify-between gap-2">
                <span>{title}</span>
                <div className="flex items-center gap-1">
                    {['increment', 'all'].includes(actionType) && (
                        <button type="button" onClick={(e) => { e.preventDefault(); incrementDown(field); }} className="hover:bg-blue-700 p-0.5 rounded text-white" title="Auto-increment (↓)">
                            <ArrowDown size={14} />
                        </button>
                    )}
                    {['copy', 'all'].includes(actionType) && (
                        <button type="button" onClick={(e) => { e.preventDefault(); copyDown(field); }} className="hover:bg-blue-700 p-0.5 rounded text-white" title="Copy Row 1 to All (=)">
                            <Equal size={14} />
                        </button>
                    )}
                    {actionType !== 'none' && (
                        <button type="button" onClick={(e) => { e.preventDefault(); clearColumn(field); }} className="hover:bg-red-600 p-0.5 rounded text-white" title="Clear All Except Row 1 (x)">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </th>
    );

    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative w-full">
            <div className="bg-[#0A3D91] px-6 py-4 flex justify-between items-center z-10 sticky left-0 shrink-0">
                <h2 className="text-lg font-semibold text-white">Step 2. Sample Information</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        min="1"
                        value={numRowsToAdd}
                        onChange={(e) => setNumRowsToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 text-sm rounded text-slate-900 bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold shadow-inner"
                        title="Number of rows to add"
                    />
                    <button type="button" onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#0A3D91] bg-white rounded hover:bg-slate-100 transition-colors shadow-sm">
                        <Plus size={16} /> Add Rows
                    </button>
                </div>
            </div>

            <div className="p-4 overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="w-10 bg-[#0A3D91] border-r border-[#082f70]"></th> {/* Row numbers */}
                            {renderHeaderCell("Sample ID", "sample_id", "increment")}
                            {renderHeaderCell("Container ID", "container_id", "all")}
                            {renderHeaderCell("Container Type", "container_type", "copy")}

                            <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70]">
                                <div className="flex items-center justify-between gap-2">
                                    <span>Well ID</span>
                                    <div className="flex gap-1">
                                        <button type="button" title="Col-wise (A1, B1...)" onClick={(e) => { e.preventDefault(); fillWellsColWise(); }} className="hover:bg-blue-700 p-0.5 rounded"><List size={14} /></button>
                                        <button type="button" title="Row-wise (A1, A2...)" onClick={(e) => { e.preventDefault(); fillWellsRowWise(); }} className="hover:bg-blue-700 p-0.5 rounded"><LayoutGrid size={14} /></button>
                                        <button type="button" title="Clear" onClick={(e) => { e.preventDefault(); clearColumn('well_id'); }} className="hover:bg-red-600 p-0.5 rounded"><X size={14} /></button>
                                    </div>
                                </div>
                            </th>

                            {renderHeaderCell("Pooling", "pooling", "copy")}
                            {renderHeaderCell("Pooled No.", "pulled_no", "copy")}
                            {renderHeaderCell("Species", "species", "copy")}
                            {renderHeaderCell("Sample Type", "sample_type", "copy")}
                            {renderHeaderCell("Conc (ng/ul)", "conc", "copy")}
                            {renderHeaderCell("Volume (ul)", "volume", "copy")}
                            {renderHeaderCell("Buffer", "buffer", "copy")}
                            {renderHeaderCell("UG Ready", "ug_ready", "copy")}
                            <th className="w-10 bg-[#0A3D91]"></th> {/* Delete */}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200">
                        {uniqueRows.map(([sampleKey, row], idx) => {
                            const requiresWell = ['Strip', '96 well'].includes(row.container_type);
                            const requiresPulledNo = row.pooling === 'Pooled';
                            const libraryCount = uniqueRowIndices.get(sampleKey)?.length || 1;
                            const stableKey = row.id || `row-${uniqueRowIndices.get(sampleKey)?.[0] ?? idx}`;

                            return (
                                <tr key={stableKey} className={idx === 0 ? "bg-amber-50" : "hover:bg-slate-50"}>
                                    <td className="px-3 py-2 text-center text-sm font-medium text-slate-500 border-x border-slate-200">
                                        <div className="flex flex-col items-center gap-1">
                                            <span>{idx === 0 ? 'R1' : idx + 1}</span>
                                            {libraryCount > 1 && (
                                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full" title={`${libraryCount} sub-libraries`}>
                                                    x{libraryCount}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                            value={row.sample_id} onChange={(e) => updateUniqueRow(sampleKey, 'sample_id', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                            value={row.container_id} onChange={(e) => updateUniqueRow(sampleKey, 'container_id', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                        <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.container_type} onChange={(e) => updateUniqueRow(sampleKey, 'container_type', e.target.value)}>
                                            <option value="Tube">Tube</option>
                                            <option value="Strip">Strip</option>
                                            <option value="96 well">96 well</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[100px]">
                                        <input type="text" disabled={!requiresWell} className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            value={row.well_id} onChange={(e) => updateUniqueRow(sampleKey, 'well_id', e.target.value)} placeholder={requiresWell ? "e.g. A1" : ""} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.pooling} onChange={(e) => updateUniqueRow(sampleKey, 'pooling', e.target.value)}>
                                            <option value="Individual">Individual</option>
                                            <option value="Pooled">Pooled</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[100px]">
                                        <input type="number" disabled={!requiresPulledNo} className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                            value={row.pulled_no} onChange={(e) => updateUniqueRow(sampleKey, 'pulled_no', e.target.value)} min="2" />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.species} onChange={(e) => updateUniqueRow(sampleKey, 'species', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.sample_type} onChange={(e) => updateUniqueRow(sampleKey, 'sample_type', e.target.value)}>
                                            <option value="gDNA">gDNA</option>
                                            <option value="cfDNA">cfDNA</option>
                                            <option value="Non-Converted Library">Non-Converted Library</option>
                                            <option value="Converted UG Library">Converted UG Library</option>
                                            <option value="UG Library">UG Library</option>
                                        </select>
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[100px]">
                                        <input type="number" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.conc} onChange={(e) => updateUniqueRow(sampleKey, 'conc', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[100px]">
                                        <input type="number" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.volume} onChange={(e) => updateUniqueRow(sampleKey, 'volume', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                        <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                            value={row.buffer} onChange={(e) => updateUniqueRow(sampleKey, 'buffer', e.target.value)} />
                                    </td>
                                    <td className="px-1 py-1 border-r border-slate-200 min-w-[100px]">
                                        <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed cursor-not-allowed"
                                            value={row.ug_ready} onChange={(e) => updateUniqueRow(sampleKey, 'ug_ready', e.target.value)} disabled>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </td>
                                    <td className="px-2 py-1 border-r border-slate-200 text-center">
                                        <button onClick={() => removeRow(sampleKey)} disabled={uniqueRows.length === 1} className="text-slate-400 hover:text-red-600 disabled:opacity-50">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sync Button & Next at the bottom of the container */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center z-10 sticky bottom-0">
                {rows.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 italic">This will automatically sync Library Info</span>
                        <button
                            type="button"
                            onClick={handleNext}
                            className="bg-[#0A3D91] hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                        >
                            Next Step
                        </button>
                    </div>
                )}
            </div>
        </section >
    );
}
