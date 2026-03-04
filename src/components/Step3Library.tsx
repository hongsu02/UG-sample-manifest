import React, { useEffect, useState } from 'react';
import type { OrderPayload, Library } from '../types';
import { ArrowDown, Equal, X } from 'lucide-react';

interface Props {
    payload: OrderPayload;
    setPayload: React.Dispatch<React.SetStateAction<OrderPayload>>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const UG_BARCODES = Array.from({ length: 96 }, (_, i) => `Z${String(i + 1).padStart(4, '0')}`);
import { supabase } from '../lib/supabase';

export default function Step3Library({ payload, setPayload }: Props) {
    const [configs, setConfigs] = useState<any[]>([]);

    useEffect(() => {
        const fetchConfigs = async () => {
            const { data } = await supabase.from('config_dropdowns').select('*');
            if (data) setConfigs(data);
        };
        fetchConfigs();
    }, []);

    const configLibTypes = configs.filter((c: any) => c.type === 'lib_type');
    // Determine the rows we should have based on samples
    useEffect(() => {
        // Event listener for auto-sync triggered from Step 2
        const handleSync = () => syncLibrariesFromSamples();
        window.addEventListener('sync-step3', handleSync);
        return () => window.removeEventListener('sync-step3', handleSync);
    }, [payload.samples]);

    const syncLibrariesFromSamples = () => {
        const newLibs: Library[] = [];
        payload.samples.forEach(sample => {
            const isPooled = sample.pooling === 'Pooled';
            const count = isPooled ? Math.max(1, parseInt(sample.pulled_no) || 1) : 1;

            for (let i = 0; i < count; i++) {
                // Try to find if we already had a library row for this to preserve data
                // For simplicity, we just generate new ones or try to match by sample_id
                newLibs.push({
                    id: generateId(),
                    sample_id: sample.sample_id || `Sample_${newLibs.length}`,
                    lib_id: '',
                    library_type: '',
                    library_kit: '',
                    ug_barcode: '',
                    tenx_index: '',
                    i7_seq: '',
                    i5_seq_a: '',
                    i5_seq_b: ''
                });
            }
        });

        setPayload(prev => ({ ...prev, libraries: newLibs }));
    };

    const rows = payload.libraries;

    const updateRow = (index: number, field: keyof Library, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };

        // Reset Library Kit when Library Type changes
        if (field === 'library_type') {
            newRows[index].library_kit = '';
        }

        setPayload(prev => ({ ...prev, libraries: newRows }));
    };

    // Header Actions
    const copyDown = (field: keyof Library) => {
        if (rows.length <= 1) return;
        const valueToCopy = rows[0][field];
        const newRows = rows.map(row => ({ ...row, [field]: valueToCopy }));
        setPayload(prev => ({ ...prev, libraries: newRows }));
    };

    const clearColumn = (field: keyof Library) => {
        if (rows.length <= 1) return;
        const newRows = rows.map((row, i) => i === 0 ? row : { ...row, [field]: '' });
        setPayload(prev => ({ ...prev, libraries: newRows }));
    };

    const incrementDown = (field: keyof Library) => {
        if (rows.length <= 1) return;
        const baseVal = String(rows[0][field]);
        const match = baseVal.match(/^(.*?)(\d+)$/);
        if (!match) { copyDown(field); return; }

        const [, prefix, numStr] = match;
        let currentNum = parseInt(numStr, 10);
        const padding = numStr.length;

        const newRows = rows.map((row, i) => {
            if (i === 0) return row;
            currentNum++;
            return { ...row, [field]: `${prefix}${String(currentNum).padStart(padding, '0')}` };
        });
        setPayload(prev => ({ ...prev, libraries: newRows }));
    };

    const HeaderCell = ({ title, field, actionType, hasClear }: { title: string, field: keyof Library, actionType: 'increment' | 'copy' | 'none', hasClear?: boolean }) => (
        <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70]">
            <div className="flex items-center justify-between gap-2">
                <span>{title}</span>
                <div className="flex items-center gap-1">
                    {actionType === 'increment' && (
                        <button type="button" onClick={(e) => { e.preventDefault(); incrementDown(field); }} className="hover:bg-blue-700 p-0.5 rounded text-white" title="Auto-increment (↓)">
                            <ArrowDown size={14} />
                        </button>
                    )}
                    {actionType === 'copy' && (
                        <button type="button" onClick={(e) => { e.preventDefault(); copyDown(field); }} className="hover:bg-blue-700 p-0.5 rounded text-white" title="Copy Row 1 to All (=)">
                            <Equal size={14} />
                        </button>
                    )}
                    {hasClear && (
                        <button type="button" onClick={(e) => { e.preventDefault(); clearColumn(field); }} className="hover:bg-red-600 p-0.5 rounded text-white" title="Clear All Except Row 1 (x)">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </th>
    );

    return (
        <section id="step3-library" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-m-20">
            <div className="bg-[#0A3D91] px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Step 3. Library Information</h2>
            </div>

            <div className="p-4 overflow-x-auto min-h-[200px]">
                {rows.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No library rows found.</p>
                        <p className="text-sm">Please generate rows from Step 2.</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="w-10 bg-[#0A3D91] border-r border-[#082f70]"></th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70]">Sample ID</th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70] max-w-[60px]">Lib No.</th>
                                <HeaderCell title="Lib ID" field="lib_id" actionType="increment" hasClear />
                                <HeaderCell title="Library Type" field="library_type" actionType="copy" hasClear />
                                <HeaderCell title="Library Kit" field="library_kit" actionType="copy" hasClear />
                                <HeaderCell title="UG Barcode" field="ug_barcode" actionType="increment" hasClear />
                                <HeaderCell title="10X Index (Opt)" field="tenx_index" actionType="none" />
                                <HeaderCell title="i7 Seq (Opt)" field="i7_seq" actionType="none" />
                                <HeaderCell title="i5 Seq A (Opt)" field="i5_seq_a" actionType="none" />
                                <HeaderCell title="i5 Seq B (Opt)" field="i5_seq_b" actionType="none" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {(() => {
                                const libNoCounter: Record<string, number> = {};
                                return rows.map((row, idx) => {
                                    // Determine if UG ready from the parent sample
                                    const parentSample = payload.samples.find(s => s.sample_id === row.sample_id);
                                    const isUgReady = parentSample?.ug_ready === 'Yes';

                                    const sId = row.sample_id || 'unknown';
                                    libNoCounter[sId] = (libNoCounter[sId] || 0) + 1;
                                    const libNo = libNoCounter[sId];

                                    return (
                                        <tr key={row.id || idx} className={idx === 0 ? "bg-amber-50" : "hover:bg-slate-50"}>
                                            <td className="px-3 py-2 text-center text-sm font-medium text-slate-500 border-x border-slate-200">
                                                {idx === 0 ? 'R1' : idx + 1}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-slate-700 border-r border-slate-200 font-medium">
                                                {row.sample_id}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-slate-700 border-r border-slate-200 font-medium text-center bg-slate-100">
                                                {libNo}
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                                <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                                    value={row.lib_id} onChange={(e) => updateRow(idx, 'lib_id', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                                <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                                    value={row.library_type} onChange={(e) => updateRow(idx, 'library_type', e.target.value)}>
                                                    <option value="">Select Type...</option>
                                                    {configLibTypes.map((type: any) => (
                                                        <option key={type.id} value={type.value}>{type.value}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                                <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                                    value={row.library_kit} onChange={(e) => updateRow(idx, 'library_kit', e.target.value)}
                                                    disabled={!row.library_type}>
                                                    <option value="">Select Kit...</option>
                                                    {configs.filter((c: any) =>
                                                        c.type === 'lib_kit' &&
                                                        c.parent_id === configLibTypes.find((t: any) => t.value === row.library_type)?.id
                                                    ).map((kit: any) => (
                                                        <option key={kit.id} value={kit.value}>{kit.value}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                                <select disabled={!isUgReady} className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                                                    value={row.ug_barcode} onChange={(e) => updateRow(idx, 'ug_barcode', e.target.value)}>
                                                    <option value="">Select Barcode...</option>
                                                    {UG_BARCODES.map(bc => <option key={bc} value={bc}>{bc}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                                <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                                    value={row.tenx_index || ''} onChange={(e) => updateRow(idx, 'tenx_index', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                                <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                                    value={row.i7_seq || ''} onChange={(e) => updateRow(idx, 'i7_seq', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                                <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                                    value={row.i5_seq_a || ''} onChange={(e) => updateRow(idx, 'i5_seq_a', e.target.value)} />
                                            </td>
                                            <td className="px-1 py-1 border-r border-slate-200 min-w-[120px]">
                                                <input type="text" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded bg-transparent"
                                                    value={row.i5_seq_b || ''} onChange={(e) => updateRow(idx, 'i5_seq_b', e.target.value)} />
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center z-10 sticky bottom-0">
                {rows.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('sync-step4'));
                            const step4 = document.getElementById('step4-sequencing');
                            if (step4) step4.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="bg-[#0A3D91] hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                    >
                        Next Step
                    </button>
                )}
            </div>
        </section>
    );
}
