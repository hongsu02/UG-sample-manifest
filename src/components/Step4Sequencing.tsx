import React, { useEffect, useState } from 'react';
import type { OrderPayload, RunningInfo } from '../types';
import { Equal, X, AlertCircle } from 'lucide-react';

interface Props {
    payload: OrderPayload;
    setPayload: React.Dispatch<React.SetStateAction<OrderPayload>>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function Step4Sequencing({ payload, setPayload }: Props) {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleSync = () => syncRunningInfo();
        window.addEventListener('sync-step4', handleSync);
        return () => window.removeEventListener('sync-step4', handleSync);
    }, [payload.samples, payload.running_info]);

    // Derive unique samples.
    const syncRunningInfo = () => {
        // Collect unique sample IDs
        const uniqueSampleIds = Array.from(new Set(payload.samples.filter(s => s.sample_id).map(s => s.sample_id)));

        const newRunInfo: RunningInfo[] = [];
        uniqueSampleIds.forEach(sid => {
            // try to preserve existing
            const existing = payload.running_info.find(r => r.sample_id === sid);
            if (existing) {
                newRunInfo.push(existing);
            } else {
                newRunInfo.push({
                    id: generateId(),
                    sample_id: sid,
                    wafer_type: '',
                    wafer_group: '',
                    num_wafers: '',
                    target_read: ''
                });
            }
        });

        setPayload(prev => ({ ...prev, running_info: newRunInfo }));
    };

    const rows = payload.running_info;

    useEffect(() => {
        // Validate constraint: Same Wafer Group must have identical # of wafer values
        const groupMap = new Map<string, string>();
        let hasError = false;

        for (const row of rows) {
            if (!row.wafer_group || !row.num_wafers) continue;
            if (groupMap.has(row.wafer_group)) {
                if (groupMap.get(row.wafer_group) !== row.num_wafers) {
                    hasError = true;
                    break;
                }
            } else {
                groupMap.set(row.wafer_group, row.num_wafers);
            }
        }

        if (hasError) {
            setError(`Validation Error: Samples in a Wafer Group must have the same '# of wafer' value.`);
            if (typeof (window as any).setStep4Valid === 'function') {
                (window as any).setStep4Valid(false);
            }
        } else {
            setError(null);
            if (typeof (window as any).setStep4Valid === 'function') {
                (window as any).setStep4Valid(true);
            }
        }
    }, [rows]);

    const updateRow = (index: number, field: keyof RunningInfo, value: string) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };

        // Logic: If wafer is whole, target read is fixed at 10000
        if (field === 'wafer_type' && value === 'Whole') {
            newRows[index].target_read = '10000';
        } else if (field === 'wafer_type' && value !== 'Whole' && newRows[index].target_read === '10000') {
            newRows[index].target_read = '';
        }

        setPayload(prev => ({ ...prev, running_info: newRows }));
    };

    // Header Actions
    const copyDown = (field: keyof RunningInfo) => {
        if (rows.length <= 1) return;
        const valueToCopy = rows[0][field];
        const newRows = rows.map((row, i) => {
            if (i === 0) return row;
            const updated = { ...row, [field]: valueToCopy };
            if (field === 'wafer_type' && valueToCopy === 'Whole') updated.target_read = '10000';
            return updated;
        });
        setPayload(prev => ({ ...prev, running_info: newRows }));
    };

    const clearColumn = (field: keyof RunningInfo) => {
        if (rows.length <= 1) return;
        const newRows = rows.map((row, i) => i === 0 ? row : { ...row, [field]: '' });
        setPayload(prev => ({ ...prev, running_info: newRows }));
    };

    const HeaderCell = ({ title, field, hasCopy = true, hasClear = true, customCss = '' }: { title: string, field: keyof RunningInfo, hasCopy?: boolean, hasClear?: boolean, customCss?: string }) => (
        <th className={`px-3 py-3 text-left text-xs font-semibold whitespace-nowrap border-r border-[#082f70] ${customCss || 'bg-[#0A3D91] text-white'}`}>
            <div className="flex items-center justify-between gap-2">
                <span>{title}</span>
                <div className="flex items-center gap-1">
                    {hasCopy && (
                        <button type="button" onClick={(e) => { e.preventDefault(); copyDown(field); }} className="hover:bg-blue-700/50 p-0.5 rounded text-white" title="Copy Row 1 to All (=)">
                            <Equal size={14} />
                        </button>
                    )}
                    {hasClear && (
                        <button type="button" onClick={(e) => { e.preventDefault(); clearColumn(field); }} className="hover:bg-red-600/80 p-0.5 rounded text-white" title="Clear All Except Row 1 (x)">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        </th>
    );

    return (
        <section id="step4-sequencing" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-m-20">
            <div className="bg-[#0A3D91] px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Step 4. Sequencing Configuration</h2>
            </div>

            <div className="p-4 overflow-x-auto min-h-[200px]">
                {/* Removing error from here to place at bottom */}

                {rows.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No sequencing rows found.</p>
                        <p className="text-sm">Generate baseline rows based on unique Sample IDs first.</p>
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="w-10 bg-[#0A3D91] border-r border-[#082f70]"></th>
                                <th className="px-3 py-3 text-left text-xs font-semibold text-white bg-[#0A3D91] whitespace-nowrap border-r border-[#082f70]">Sample ID</th>
                                <HeaderCell title="Wafer Type" field="wafer_type" />
                                <HeaderCell title="Wafer Group" field="wafer_group" customCss="bg-blue-900 border-l border-blue-950 text-blue-50" />
                                <HeaderCell title="# of Wafer" field="num_wafers" customCss="bg-blue-900 text-blue-50" />
                                <HeaderCell title="Target Read (M Reads) *" field="target_read" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {rows.map((row, idx) => {
                                const isWhole = row.wafer_type === 'Whole';

                                return (
                                    <tr key={row.id || idx} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-center text-sm font-medium text-slate-500 border-x border-slate-200">
                                            {idx + 1}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-700 border-r border-slate-200 font-medium">
                                            {row.sample_id}
                                        </td>
                                        <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                            <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                                value={row.wafer_type} onChange={(e) => updateRow(idx, 'wafer_type', e.target.value)}>
                                                <option value="">Select...</option>
                                                <option value="Whole">Whole</option>
                                                <option value="Partial">Partial</option>
                                            </select>
                                        </td>
                                        <td className="px-1 py-1 border-r border-slate-200 min-w-[120px] bg-slate-100">
                                            <select className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                                value={row.wafer_group} onChange={(e) => updateRow(idx, 'wafer_group', e.target.value)}>
                                                <option value="">Select...</option>
                                                {Array.from({ length: 50 }, (_, i) => `Group_${i + 1}`).map(g => (
                                                    <option key={g} value={g}>{g}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-1 py-1 border-r border-slate-200 min-w-[120px] bg-slate-100">
                                            <input type="number" className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent"
                                                value={row.num_wafers} onChange={(e) => updateRow(idx, 'num_wafers', e.target.value)} min="1" placeholder="Quantity" />
                                        </td>
                                        <td className="px-1 py-1 border-r border-slate-200 min-w-[140px]">
                                            <input type="number" disabled={isWhole} className="w-full px-2 py-1.5 text-sm border border-transparent focus:border-blue-400 rounded bg-transparent disabled:bg-slate-200 disabled:cursor-not-allowed"
                                                value={row.target_read} onChange={(e) => updateRow(idx, 'target_read', e.target.value)} placeholder="Target Reads" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
                {error && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm flex items-start gap-2">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
                <div className="mt-4 flex justify-end">
                    <p className="text-sm italic text-slate-500">
                        * Target Read (M Reads) = # of Target Reads/cell x # of Target Cells
                    </p>
                </div>
            </div>
        </section>
    );
}
