import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import { generateExcelTemplate, parseAndValidateExcel, type ParsedTemplateConfig, type Step1Info } from '../lib/templateEngine';
import { FileSpreadsheet, Download, Upload, AlertCircle, ArrowLeft } from 'lucide-react';

export default function TemplateWorkflow() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // Template Form State
    const [step1Info, setStep1Info] = useState<Step1Info>({
        quotation_id: '', payment_method: '', firstName: '', lastName: '', email: '', institution: '', piName: '', phone: ''
    });

    // DB Configs for Parser
    const [configs, setConfigs] = useState<any[]>([]);

    // Upload State
    const [uploadErrors, setUploadErrors] = useState<any[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [quotationError, setQuotationError] = useState('');

    useEffect(() => {
        const fetchConfigs = async () => {
            const { data } = await supabase.from('config_dropdowns').select('*');
            if (data) setConfigs(data);
        };
        fetchConfigs();
    }, []);

    const handleStep1Change = (field: keyof Step1Info, value: string) => {
        const val = field === 'quotation_id' ? value.toUpperCase() : value;
        setStep1Info(prev => ({ ...prev, [field]: val }));

        if (field === 'quotation_id') {
            if (val && !/^ANQ\d+$/.test(val)) {
                setQuotationError("Quotation ID must start with 'ANQ' followed by digits.");
            } else {
                setQuotationError('');
            }
        }
    };

    const handleGenerate = async () => {
        if (!step1Info.quotation_id || quotationError) {
            alert('Please enter a valid Quotation ID starting with ANQ.');
            return;
        }
        if (!step1Info.payment_method) {
            alert('Please select a Payment Method.');
            return;
        }
        await generateExcelTemplate({
            step1: step1Info,
            configs
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsParsing(true);
        setUploadErrors([]);

        try {
            const result = await parseAndValidateExcel(file, configs);
            if (result.errors.length > 0) {
                setUploadErrors(result.errors);
            } else {
                await finalizeUpload(result);
            }
        } catch (error) {
            console.error(error);
            setUploadErrors([{ row: 0, column: 'File', message: 'Failed to read the file. Please ensure it is a valid Excel spreadsheet.' }]);
        } finally {
            setIsParsing(false);
            e.target.value = ''; // Reset
        }
    };

    const finalizeUpload = async (data: ParsedTemplateConfig) => {
        try {
            // 1. Create Order with pre-filled Step 1
            const { data: newOrder, error: orderErr } = await supabase
                .from('orders')
                .insert([{
                    user_id: user!.id,
                    status: 'Draft',
                    quotation_id: data.step1.quotation_id,
                    payment_method: data.step1.payment_method,
                    contact_info: {
                        firstName: data.step1.firstName,
                        lastName: data.step1.lastName,
                        email: data.step1.email,
                        institution: data.step1.institution,
                        piName: data.step1.piName,
                        phone: data.step1.phone
                    }
                }])
                .select()
                .single();

            if (orderErr) throw orderErr;

            // 2. Attach Order ID
            const samplesToInsert = data.samples.map(s => ({ order_id: newOrder.id, sample_data: s }));
            const librariesToInsert = data.libraries.map(l => ({ order_id: newOrder.id, lib_data: l }));
            const runningInfoToInsert = data.runningInfo.map(r => ({ order_id: newOrder.id, run_data: r }));

            if (samplesToInsert.length > 0) {
                const { error: sErr } = await supabase.from('samples').insert(samplesToInsert);
                if (sErr) throw sErr;
            }

            if (librariesToInsert.length > 0) {
                const { error: lErr } = await supabase.from('libraries').insert(librariesToInsert);
                if (lErr) throw lErr;
            }

            if (runningInfoToInsert.length > 0) {
                const { error: rErr } = await supabase.from('running_info').insert(runningInfoToInsert);
                if (rErr) throw rErr;
            }

            navigate(`/order/${newOrder.id}`);

        } catch (error: any) {
            console.error('Error saving template data:', error);
            alert(`Failed to process template data: ${error.message}`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                        <FileSpreadsheet className="text-[#0A3D91]" />
                        Create Order via Template
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Download a customized Excel template, fill it offline, and upload it back.</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Side: Step A - Generate Form */}
                <div className="space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-[#0A3D91] px-6 py-4">
                            <h2 className="text-lg font-semibold text-white">Step A: Generate Custom Template</h2>
                            <p className="text-blue-100 text-sm mt-0.5">Define project properties to bake deeply into the template.</p>
                        </div>
                        <div className="p-6 space-y-6">

                            <div className="grid md:grid-cols-2 gap-4 border-b border-slate-100 pb-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quotation ID *</label>
                                    <input type="text" className={`w-full px-3 py-2 border rounded-lg ${quotationError ? 'border-red-500 ring-red-500' : 'border-slate-300'}`} placeholder="ANQ12345" value={step1Info.quotation_id} onChange={e => handleStep1Change('quotation_id', e.target.value)} />
                                    {quotationError && <p className="mt-1 text-xs text-red-600">{quotationError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2" value={step1Info.payment_method} onChange={e => handleStep1Change('payment_method', e.target.value)}>
                                        <option value="" disabled>Select...</option>
                                        <option value="Purchase Order">Purchase Order</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Prepaid Balance">Prepaid Balance</option>
                                        <option value="Master Service Agreement">Master Service Agreement</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase">First Name</label><input type="text" className="w-full mt-1 border-b border-slate-300 py-1 bg-transparent focus:outline-none focus:border-[#0A3D91]" value={step1Info.firstName} onChange={e => handleStep1Change('firstName', e.target.value)} /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase">Last Name</label><input type="text" className="w-full mt-1 border-b border-slate-300 py-1 bg-transparent focus:outline-none focus:border-[#0A3D91]" value={step1Info.lastName} onChange={e => handleStep1Change('lastName', e.target.value)} /></div>
                                <div className="col-span-2"><label className="block text-xs font-semibold text-slate-500 uppercase">Email</label><input type="email" className="w-full mt-1 border-b border-slate-300 py-1 bg-transparent focus:outline-none focus:border-[#0A3D91]" value={step1Info.email} onChange={e => handleStep1Change('email', e.target.value)} /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase">Institution</label><input type="text" className="w-full mt-1 border-b border-slate-300 py-1 bg-transparent focus:outline-none focus:border-[#0A3D91]" value={step1Info.institution} onChange={e => handleStep1Change('institution', e.target.value)} /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase">PI Name</label><input type="text" className="w-full mt-1 border-b border-slate-300 py-1 bg-transparent focus:outline-none focus:border-[#0A3D91]" value={step1Info.piName} onChange={e => handleStep1Change('piName', e.target.value)} /></div>
                            </div>

                            <button onClick={handleGenerate} className="w-full flex justify-center items-center gap-2 bg-[#0A3D91] hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm mt-4">
                                <Download size={20} /> Download Pre-configured Template
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Side: Step B - Upload Form & Guide */}
                <div className="space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                        <div className="bg-emerald-700 px-6 py-4">
                            <h2 className="text-lg font-semibold text-white">Step B: Upload Completed Template</h2>
                            <p className="text-emerald-100 text-sm mt-0.5">The system will validate inputs securely against order configurations.</p>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-center">
                            <div className="border-2 border-dashed border-emerald-300 rounded-xl p-12 text-center hover:border-emerald-600 transition-colors bg-emerald-50 relative">
                                <input
                                    type="file" accept=".xlsx" onChange={handleFileUpload} disabled={isParsing}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                                />
                                <div className="flex flex-col items-center gap-4">
                                    <Upload className={`w-12 h-12 ${isParsing ? 'text-emerald-600 animate-bounce' : 'text-emerald-400'}`} />
                                    <div className="text-slate-700 font-bold text-lg">
                                        {isParsing ? 'Validating spreadsheet logic...' : 'Click or Drag & Drop Excel File Here'}
                                    </div>
                                    <div className="text-sm text-slate-500">Only structural template matched .xlsx files allowed.</div>
                                </div>
                            </div>

                            {uploadErrors.length > 0 && (
                                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 max-h-[300px] flex flex-col">
                                    <h4 className="text-red-800 font-bold mb-3 flex items-center gap-2 sticky top-0 bg-red-50">
                                        <AlertCircle size={18} /> Excel Validation Failed ({uploadErrors.length} errors)
                                    </h4>
                                    <div className="overflow-y-auto pr-2 space-y-2 flex-1">
                                        {uploadErrors.map((err, idx) => (
                                            <div key={idx} className="text-sm flex gap-3 p-2 bg-white rounded border border-red-100">
                                                <span className="font-mono text-red-600 font-bold shrink-0">Row {err.row}</span>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-800">{err.column}</span>
                                                    <span className="text-slate-600 text-xs">{err.message}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-6 border-t border-slate-200">
                            <h3 className="font-semibold text-slate-800 mb-2">Notice on Template Protections:</h3>
                            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                                <li>Headers are strictly required. Do not change, delete, or rearrange columns.</li>
                                <li>"Library Kit" dropdown choices change dynamically based on the selected "Library Type" in the same row.</li>
                                <li>"UG Barcode" is only mandatory (and accepted) if "UG Ready" equals "Yes".</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
