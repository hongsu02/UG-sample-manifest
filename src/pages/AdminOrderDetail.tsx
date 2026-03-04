import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Order, Sample, Library, RunningInfo } from '../types';

export default function AdminOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [samples, setSamples] = useState<Sample[]>([]);
    const [libraries, setLibraries] = useState<Library[]>([]);
    const [runs, setRuns] = useState<RunningInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchOrderDetails(id);
        }
    }, [id]);

    const fetchOrderDetails = async (orderId: string) => {
        setLoading(true);
        try {
            // Fetch order and linked user email
            const { data: oData, error: oErr } = await supabase
                .from('orders')
                .select(`*, profiles(email, full_name, organization)`)
                .eq('id', orderId)
                .single();
            if (oErr) throw oErr;
            setOrder(oData as Order);
            setProfile((oData as any).profiles);

            // Fetch samples
            const { data: sData } = await supabase.from('samples').select('*').eq('order_id', orderId);
            if (sData) setSamples(sData.map(d => d.sample_data));

            // Fetch libraries
            const { data: lData } = await supabase.from('libraries').select('*').eq('order_id', orderId);
            if (lData) setLibraries(lData.map(d => d.lib_data));

            // Fetch run info
            const { data: rData } = await supabase.from('running_info').select('*').eq('order_id', orderId);
            if (rData) setRuns(rData.map(d => d.run_data));

        } catch (err) {
            console.error('Failed to load order:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterComplete = async () => {
        if (!order || order.status === 'Registered') return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: 'Registered' })
                .eq('id', id);

            if (error) throw error;
            setOrder({ ...order, status: 'Registered' });
            alert('Order status successfully updated to Registered.');
        } catch (err: any) {
            console.error('Failed to update order status:', err);
            alert(`Error updating status: ${err.message}`);
        }
    };

    const handleExportExcel = () => {
        // Build the mega data array matching the unified view
        const exportData = libraries.map((lib, idx) => {
            const s = samples.find(samp => samp.sample_id === lib.sample_id);
            const run = runs.find(r => r.sample_id === lib.sample_id);

            return {
                'No.': idx + 1,
                // Step 2
                'Sample ID': lib.sample_id || '',
                'Container ID': s?.container_id || '',
                'Well ID': s?.well_id || '',
                'Pulled No.': s?.pulled_no || '',
                'Sample Type': s?.sample_type || '',
                'Volume (uL)': s?.volume || '',
                'Concentration (ng/uL)': s?.conc || '',
                'UG Ready': s?.ug_ready || '',
                // Step 3
                'Lib ID': lib.lib_id || '',
                'Library Type': lib.library_type || '',
                'Library Kit': lib.library_kit || '',
                'Barcode Pooling': lib.ug_barcode || '',
                '10X Index (Opt)': lib.tenx_index || '',
                'i7 Seq (Opt)': lib.i7_seq || '',
                'i5 Seq A (Opt)': lib.i5_seq_a || '',
                'i5 Seq B (Opt)': lib.i5_seq_b || '',
                // Step 4
                'Wafer Type': run?.wafer_type || '',
                'Wafer Group': run?.wafer_group || '',
                '# of Wafers': run?.num_wafers || '',
                'Target Reads (M)': run?.target_read || ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        // Add a bit of width formatting to columns
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(12, key.length + 5) }));
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Order Details");

        const safeOrderNo = order?.order_no || 'UnknownOrder';
        XLSX.writeFile(workbook, `Psomagen_Order_${safeOrderNo}.xlsx`);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading order details...</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found.</div>;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-[#0A3D91] transition-colors" title="Back to Dashboard">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Order Details: {order.order_no || 'Pending'}</h1>
                        <p className="text-slate-500 mt-1 text-sm">Submitted by: {profile?.email || 'Unknown User'} | Quotation: {order.quotation_id}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="font-bold text-[#0A3D91] border-b pb-2 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-700">
                        <p><strong>Name:</strong> {order.contact_info?.firstName} {order.contact_info?.lastName}</p>
                        <p><strong>Email:</strong> {order.contact_info?.email}</p>
                        <p><strong>Institution:</strong> {order.contact_info?.institution}</p>
                        <p><strong>Department:</strong> {order.contact_info?.department || '-'}</p>
                        <p><strong>Phone:</strong> {order.contact_info?.phone || '-'}</p>
                        <p><strong>Shipping Country:</strong> {order.contact_info?.shippingCountry || '-'}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-[#0A3D91] border-b pb-2 mb-4">Order Status</h3>
                    <div className="space-y-2 text-sm text-slate-700">
                        <p><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-xs ml-2 ${order.status === 'Submitted' ? 'bg-green-100 text-green-700' :
                            order.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' :
                                'bg-slate-100'
                            }`}>{order.status}</span></p>
                        <p><strong>Payment Method:</strong> {order.payment_method}</p>
                        <p><strong>Last Updated:</strong> {new Date(order.updated_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-[#0A3D91]">Complete Specimen & Workflow Data</h2>
                        <span className="text-sm text-slate-500">Showing {libraries.length} library items</span>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition shadow-sm"
                    >
                        <Download size={16} /> Export to Excel
                    </button>
                </div>

                {/* Full Data Table Wrapper */}
                <div className="overflow-x-auto w-full max-h-[600px]">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-[#0A3D91] text-white sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* Step 2 Core */}
                                <th className="px-3 py-3 border-r border-[#082f70] font-semibold bg-blue-800" colSpan={8}>Sample Info (Step 2)</th>

                                {/* Step 3 Core */}
                                <th className="px-3 py-3 border-r border-[#082f70] font-semibold bg-indigo-800" colSpan={8}>Library Form (Step 3)</th>

                                {/* Step 4 Core */}
                                <th className="px-3 py-3 font-semibold bg-purple-800" colSpan={4}>Sequencing (Step 4)</th>
                            </tr>
                            <tr className="bg-slate-100 text-[#0A3D91]">
                                {/* Step 2 */}
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-bold sticky left-0 bg-slate-100 z-20 shadow-r">Sample ID</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Container ID</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Well ID</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Pooled No.</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Sample Type</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Vol (uL)</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Conc (ng/uL)</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">UG Ready</th>

                                {/* Step 3 */}
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-bold bg-slate-200">Lib ID</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Library Type</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Library Kit</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Barcode Pooling</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">10X Index</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">i7 Seq</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">i5 Seq A</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">i5 Seq B</th>

                                {/* Run */}
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Wafer Type</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Wafer Group</th>
                                <th className="px-3 py-2 border-r border-b border-slate-300 font-medium">Quantity</th>
                                <th className="px-3 py-2 border-b border-slate-300 font-medium">Target Reads</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {libraries.map((lib, idx) => {
                                const s = samples.find(samp => samp.sample_id === lib.sample_id);
                                const run = runs.find(r => r.sample_id === lib.sample_id);

                                return (
                                    <tr key={idx} className="hover:bg-blue-50/50">
                                        {/* Step 2 */}
                                        <td className="px-3 py-2 text-slate-900 font-bold border-r border-slate-200 sticky left-0 bg-white shadow-r group-hover:bg-blue-50">{lib.sample_id}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.container_id}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.well_id}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.pulled_no}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.sample_type}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.volume}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.conc}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{s?.ug_ready}</td>

                                        {/* Step 3 */}
                                        <td className="px-3 py-2 text-[#0A3D91] font-bold border-r border-slate-200 bg-slate-50 group-hover:bg-blue-100">{lib.lib_id}</td>

                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.library_type}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.library_kit}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.ug_barcode}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.tenx_index}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.i7_seq}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.i5_seq_a}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{lib.i5_seq_b}</td>

                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{run?.wafer_type}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{run?.wafer_group}</td>
                                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">{run?.num_wafers}</td>
                                        <td className="px-3 py-2 text-rose-600 font-medium">{run?.target_read}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {libraries.length === 0 && (
                        <div className="p-12 text-center text-slate-500">No submission library data available for this order.</div>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-200">
                <button
                    onClick={handleRegisterComplete}
                    disabled={order.status === 'Registered'}
                    className="px-6 py-2.5 bg-[#0A3D91] hover:bg-blue-800 text-white font-medium rounded-lg shadow-sm transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                    Register Complete
                </button>
            </div>
        </div>
    );
}
