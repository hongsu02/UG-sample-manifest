import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { Order } from '../types';
import { Plus, FileText, CheckCircle, Clock, Trash2 } from 'lucide-react';

export default function Dashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            if (data) setOrders(data as Order[]);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const createNewOrder = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('orders')
                .insert([{ user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                navigate(`/order/${data.id}`);
            }
        } catch (error: any) {
            console.error('Error creating new order:', error);
            alert(`Failed to create order: ${error.message || JSON.stringify(error)}\nIf it's an RLS violation, you might be missing an INSERT policy on profiles or orders.`);
        }
    };

    const handleDeleteDraft = async (e: React.MouseEvent, orderId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this draft order?')) return;

        try {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
            fetchOrders();
        } catch (error: any) {
            console.error('Error deleting draft:', error);
            alert(`Failed to delete draft: ${error.message || JSON.stringify(error)}`);
        }
    };

    const drafts = orders.filter(o => o.status === 'Draft');
    const submitted = orders.filter(o => o.status !== 'Draft');

    const getStatusIcon = (status: string) => {
        if (status === 'Submitted') return <CheckCircle size={16} className="text-green-600" />;
        if (status === 'Received') return <CheckCircle size={16} className="text-[#0A3D91]" />;
        return <Clock size={16} className="text-amber-500" />;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading your orders...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
                    <p className="text-slate-500 mt-1 text-sm">Manage your sequencing manifests and track their status.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/template-workflow')}
                        className="bg-white hover:bg-slate-50 text-[#0A3D91] border border-slate-300 px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <FileText size={20} />
                        Create with Template
                    </button>
                    <button
                        onClick={createNewOrder}
                        className="bg-[#0A3D91] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={20} />
                        Create New Order
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Drafts Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <FileText size={18} className="text-slate-500" />
                            Draft Orders
                        </h2>
                        <span className="bg-slate-200 text-slate-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                            {drafts.length}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {drafts.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No draft orders found.</div>
                        ) : (
                            drafts.map((order) => (
                                <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium text-slate-900">
                                            {order.quotation_id || 'Untitled Order'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-4">
                                        Started: {new Date(order.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <button
                                            onClick={() => navigate(`/order/${order.id}`)}
                                            className="text-sm text-[#0A3D91] font-medium hover:underline"
                                        >
                                            Continue Editing &rarr;
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteDraft(e, order.id)}
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                            title="Delete Draft"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Submitted Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <CheckCircle size={18} className="text-slate-500" />
                            Submitted Orders
                        </h2>
                        <span className="bg-slate-200 text-slate-700 py-0.5 px-2.5 rounded-full text-xs font-medium">
                            {submitted.length}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {submitted.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No submitted orders yet.</div>
                        ) : (
                            submitted.map((order) => (
                                <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-medium text-slate-900">
                                            {order.order_no || order.quotation_id}
                                        </span>
                                        <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${order.status === 'Received' ? 'text-[#0A3D91] bg-blue-50' : 'text-green-700 bg-green-50'
                                            }`}>
                                            {getStatusIcon(order.status)}
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mb-4">
                                        Submitted: {new Date(order.updated_at).toLocaleDateString()}
                                    </div>
                                    <button
                                        onClick={() => navigate(`/review/${order.id}`)}
                                        className="text-sm text-[#0A3D91] font-medium hover:underline"
                                    >
                                        View Details
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
