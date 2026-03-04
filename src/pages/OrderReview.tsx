import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Order, Sample, Library } from '../types';
import { Download, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import Barcode from 'react-barcode';

export default function OrderReview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [order, setOrder] = useState<Order | null>(null);
    const [samples, setSamples] = useState<Sample[]>([]);
    const [libraries, setLibraries] = useState<Library[]>([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (id && user) {
            loadFullOrder(id);
        }
    }, [id, user]);

    const loadFullOrder = async (orderId: string) => {
        try {
            setLoading(true);
            const { data: oData, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
            if (oErr) throw oErr;
            setOrder(oData as Order);

            // In a real app we would load samples from their respective tables.
            const { data: sData } = await supabase.from('samples').select('*').eq('order_id', orderId);
            if (sData) setSamples(sData.map(d => d.sample_data));

            const { data: lData } = await supabase.from('libraries').select('*').eq('order_id', orderId);
            if (lData) setLibraries(lData.map(d => d.lib_data));
        } catch (err) {
            console.error('Failed to load order:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateOrderNo = () => {
        const qid = order?.quotation_id || 'UNKNOWN';
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${qid}_${y}${m}${d}${h}${min}`;
    };

    const handleDownloadPDF = () => {
        if (generatingPdf) return;
        setGeneratingPdf(true);
        // Allow the UI to fully render the loading state before the intensive main-thread processing blocks it.
        setTimeout(() => {
            const element = document.getElementById('printable-area');
            if (!element) {
                setGeneratingPdf(false);
                return;
            }

            const orderNo = order?.order_no || generateOrderNo();
            const opt = {
                margin: 0.5,
                filename: `${orderNo}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as 'portrait' }
            };

            html2pdf().set(opt).from(element).save().then(() => {
                setGeneratingPdf(false);
            }).catch((err: Error | any) => {
                console.error('PDF generation failed', err);
                const errorMsg = err?.message || err?.toString() || 'Unknown error';
                alert(`PDF Generation Error: ${errorMsg}\n\nPlease try again or use the browser's Print feature as a backup.`);
                setGeneratingPdf(false);
            });
        }, 500);
    };

    const handleFinalSubmit = async () => {
        if (!id || !order) return;
        setSubmitting(true);
        try {
            const orderNo = generateOrderNo();
            const { error } = await supabase
                .from('orders')
                .update({
                    status: 'Submitted',
                    order_no: orderNo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            console.error('Final submit failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading order review...</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    const uniqueSamples = Array.from(new Map(samples.map(s => [s.sample_id, s])).values());

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-24">
            {/* Non-printable header */}
            <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-16 z-40">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/order/${id}`)} className="text-slate-500 hover:text-[#0A3D91]">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Review & Final Submission</h1>
                        <p className="text-slate-500 mt-1 text-sm">Please review the details below. Download PDF before final submission.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={generatingPdf || submitting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generatingPdf ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Download size={16} /> PDF Download
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleFinalSubmit}
                        disabled={!confirmed || submitting || order.status !== 'Draft'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCircle size={16} /> {submitting ? 'Submitting...' : 'Final Submit'}
                    </button>
                </div>
            </div>

            {/* Printable Area */}
            <div id="printable-area" className="bg-white p-8 sm:p-12 border border-slate-200 print:border-none print:p-0">
                <div className="flex justify-between items-end border-b-2 border-[#0A3D91] pb-6 mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-[#0A3D91]">Psomagen</h2>
                        <p className="text-slate-500 italic text-sm mt-1">Ultima Genomics Sample Manifest</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <div className="bg-white p-2 mb-2">
                            <Barcode
                                value={order.order_no || generateOrderNo()}
                                width={1.8}
                                height={40}
                                fontSize={14}
                                margin={10}
                                format="CODE128"
                                displayValue={false}
                            />
                        </div>
                        <div className="text-sm font-medium text-slate-500">Order ID</div>
                        <div className="text-xl font-bold text-slate-900">{order.order_no || generateOrderNo()}</div>
                    </div>
                </div>

                <div className="flex gap-8 mb-12 text-sm text-slate-700 w-full">
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-2 border-b pb-1">Contact Information</h3>
                        <p><strong>Name:</strong> {order.contact_info?.firstName} {order.contact_info?.lastName}</p>
                        <p><strong>Email:</strong> {order.contact_info?.email}</p>
                        <p><strong>Institution:</strong> {order.contact_info?.institution}</p>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-2 border-b pb-1">Billing Summary</h3>
                        <p><strong>Payment Method:</strong> {order.payment_method || 'N/A'}</p>
                        <p><strong>Status:</strong> {order.status}</p>
                        <p><strong>Generated on:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold text-[#0A3D91] mb-4">Sample & Library Summary</h3>
                    {/* Integrated layout table mock */}
                    <div className="border border-slate-200">
                        <table className="w-full text-sm text-left text-slate-600 print:text-[10px]">
                            <thead className="bg-[#0A3D91] text-white">
                                <tr>
                                    <th className="px-4 py-2 font-semibold border-r border-[#082f70]">Sample ID</th>
                                    <th className="px-4 py-2 font-semibold border-r border-[#082f70]">Type</th>
                                    <th className="px-4 py-2 font-semibold border-r border-[#082f70]">Lib Type</th>
                                    <th className="px-4 py-2 font-semibold">UG Ready</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueSamples.length > 0 ? uniqueSamples.map((s, i) => {
                                    const lib = libraries.find(l => l.sample_id === s.sample_id);
                                    return (
                                        <tr key={i} className={`hover:bg-slate-50 ${i !== uniqueSamples.length - 1 ? 'border-b border-slate-200' : ''}`}>
                                            <td className="px-4 py-2 font-medium text-slate-900 border-r">{s.sample_id}</td>
                                            <td className="px-4 py-2 border-r">{s.sample_type}</td>
                                            <td className="px-4 py-2 border-r">{lib?.library_type || '-'}</td>
                                            <td className="px-4 py-2">{s.ug_ready}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No samples found for this order.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {order.status === 'Draft' && !generatingPdf && (
                    <div className="mt-12 bg-amber-50 border border-amber-200 p-6 print:hidden">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            <span className="text-amber-900 font-medium text-sm">
                                I hereby confirm that all information provided in this manifest is accurate and finalized.
                                I understand that no changes can be made once submitted.
                            </span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}
