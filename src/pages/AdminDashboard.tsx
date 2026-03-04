import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { Download, Search, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface ConfigItem {
    id: string;
    type: string;
    value: string;
    parent_id?: string;
}

export default function AdminDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [newConfigType, setNewConfigType] = useState('lib_type');
    const [newConfigValue, setNewConfigValue] = useState('');
    const [newConfigParentId, setNewConfigParentId] = useState('');

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const { data: oData, error: oErr } = await supabase
                .from('orders')
                .select(`*, profiles(email, full_name, organization)`)
                .order('updated_at', { ascending: false });

            const { data: cData, error: cErr } = await supabase
                .from('config_dropdowns')
                .select('*');

            if (oErr) throw oErr;
            if (cErr) throw cErr;

            setOrders(oData || []);
            setConfigs(cData || []);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExportSelected = () => {
        const dataToExport = filteredOrders.map(o => ({
            OrderNo: o.order_no,
            QuotationID: o.quotation_id,
            Status: o.status,
            ClientName: `${o.contact_info?.firstName || ''} ${o.contact_info?.lastName || ''}`.trim() || (o as any).profiles?.full_name || '',
            UserEmail: (o as any).profiles?.email,
            Organization: o.contact_info?.institution || (o as any).profiles?.organization,
            PaymentMethod: o.payment_method,
            Date: new Date(o.updated_at).toLocaleDateString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
        XLSX.writeFile(workbook, "Psomagen_Orders_Export.xlsx");
    };

    const addConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConfigValue.trim()) return;

        if (newConfigType === 'lib_kit' && !newConfigParentId) {
            alert('Please select a Parent Library Type for this kit.');
            return;
        }

        try {
            const payload: any = { type: newConfigType, value: newConfigValue };
            if (newConfigType === 'lib_kit') {
                payload.parent_id = newConfigParentId;
            }

            const { error } = await supabase
                .from('config_dropdowns')
                .insert([payload]);
            if (error) throw error;
            setNewConfigValue('');
            setNewConfigParentId('');
            fetchAdminData();
        } catch (err: any) {
            console.error('Failed to add config:', err);
            alert(`Error adding config: ${err.message || 'Permission denied'}`);
        }
    };

    const deleteConfig = async (id: string) => {
        try {
            const { error } = await supabase.from('config_dropdowns').delete().eq('id', id);
            if (error) throw error;
            fetchAdminData();
        } catch (err: any) {
            console.error('Failed to delete config:', err);
            alert(`Error deleting config: ${err.message || 'Permission denied'}`);
        }
    };

    const filteredOrders = orders.filter(o =>
        (statusFilter === 'All' || o.status === statusFilter) &&
        (o.order_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.quotation_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o as any).profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <div className="p-8 text-center text-slate-500">Loading admin dashboard...</div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Admin Control Center</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage orders and system configurations.</p>
                </div>
            </div>

            <div className="space-y-8">
                <div className="space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                Order Repository
                            </h2>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-48">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:border-[#0A3D91] focus:ring-1 focus:ring-[#0A3D91]"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">All Status</option>
                                    <option value="Draft">Draft</option>
                                    <option value="Submitted">Submitted</option>
                                    <option value="Registered">Registered</option>
                                    <option value="Received">Received</option>
                                </select>
                                <button
                                    onClick={handleExportSelected}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0A3D91] border border-[#0A3D91] rounded hover:bg-blue-50 transition-colors"
                                >
                                    <Download size={16} /> Export
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="bg-[#0A3D91] text-white">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Order No</th>
                                        <th className="px-4 py-3 font-semibold">Quotation</th>
                                        <th className="px-4 py-3 font-semibold">Client Name</th>
                                        <th className="px-4 py-3 font-semibold">Client Email</th>
                                        <th className="px-4 py-3 font-semibold">Status</th>
                                        <th className="px-4 py-3 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-[#0A3D91] border-r">
                                                <Link to={`/admin/order/${order.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                                    {order.order_no || 'Pending...'}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">{order.quotation_id}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {`${order.contact_info?.firstName || ''} ${order.contact_info?.lastName || ''}`.trim() || (order as any).profiles?.full_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">{(order as any).profiles?.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${order.status === 'Submitted' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' :
                                                        order.status === 'Received' ? 'bg-blue-100 text-[#0A3D91]' :
                                                            'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{new Date(order.updated_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No orders match your criteria.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                <Edit3 size={18} className="text-slate-500" />
                                Configuration Manager
                            </h2>
                        </div>
                        <div className="p-6">
                            <form onSubmit={addConfig} className="mb-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Config Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                        value={newConfigType}
                                        onChange={(e) => setNewConfigType(e.target.value)}
                                    >
                                        <option value="lib_type">Library Type</option>
                                        <option value="lib_kit">Library Kit</option>
                                    </select>
                                </div>
                                {newConfigType === 'lib_kit' && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Parent Library Type</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                            value={newConfigParentId}
                                            onChange={(e) => setNewConfigParentId(e.target.value)}
                                            required
                                        >
                                            <option value="">Select a Library Type...</option>
                                            {configs.filter(c => c.type === 'lib_type').map(c => (
                                                <option key={c.id} value={c.id}>{c.value}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Value</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                        value={newConfigValue}
                                        onChange={(e) => setNewConfigValue(e.target.value)}
                                    />
                                </div>
                                <button type="submit" className="w-full bg-[#0A3D91] hover:bg-blue-800 text-white px-4 py-2 rounded-md text-sm font-medium">
                                    Add Configuration
                                </button>
                            </form>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-700 border-b pb-1">Current Entries</h3>
                                <ul className="space-y-2 text-sm max-h-[300px] overflow-y-auto pr-2">
                                    {configs.filter(c => c.type === newConfigType).map(c => (
                                        <li key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{c.value}</span>
                                                <span className="text-xs text-slate-500">
                                                    {c.type === 'lib_type'
                                                        ? 'Library Type'
                                                        : `Library Kit (Parent: ${configs.find(p => p.id === c.parent_id)?.value || 'Unknown'})`}
                                                </span>
                                            </div>
                                            <button onClick={() => deleteConfig(c.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                                                Delete
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
