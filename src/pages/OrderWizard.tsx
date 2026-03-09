import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';
import type { OrderPayload } from '../types';
import Step1Contact from '../components/Step1Contact';
import Step2Sample from '../components/Step2Sample';
import Step3Library from '../components/Step3Library';
import Step4Sequencing from '../components/Step4Sequencing';
import Step5Comment from '../components/Step5Comment';
import { Save, FileCheck } from 'lucide-react';

export default function OrderWizard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [step4Valid, setStep4Valid] = useState(true);

    useEffect(() => {
        (window as any).setStep4Valid = setStep4Valid;
        return () => {
            delete (window as any).setStep4Valid;
        };
    }, []);

    const [payload, setPayload] = useState<OrderPayload>({
        order: {},
        samples: [],
        libraries: [],
        running_info: []
    });

    const loadedOrderId = useRef<string | null>(null);

    useEffect(() => {
        if (id && user && loadedOrderId.current !== id) {
            loadedOrderId.current = id;
            loadOrder(id);
        }
    }, [id, user]);

    const loadOrder = async (orderId: string) => {
        try {
            setLoading(true);
            // Fetch main order
            const { data: orderData, error: orderErr } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderErr) throw orderErr;

            // We will also load samples, libraries, running_info here later.
            const { data: sData } = await supabase.from('samples').select('*').eq('order_id', orderId);
            const { data: lData } = await supabase.from('libraries').select('*').eq('order_id', orderId);
            const { data: rData } = await supabase.from('running_info').select('*').eq('order_id', orderId);

            setPayload({
                order: orderData,
                samples: sData ? sData.map(d => d.sample_data) : [],
                libraries: lData ? lData.map(d => d.lib_data) : [],
                running_info: rData ? rData.map(d => d.run_data) : []
            });
        } catch (err) {
            console.error('Failed to load order:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveDraft = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    contact_info: payload.order.contact_info,
                    payment_method: payload.order.payment_method,
                    quotation_id: payload.order.quotation_id,
                    updated_at: new Date().toISOString(),
                    status: 'Draft'
                })
                .eq('id', id);

            if (error) throw error;

            // save samples
            await supabase.from('samples').delete().eq('order_id', id);
            if (payload.samples.length > 0) {
                await supabase.from('samples').insert(
                    payload.samples.map(s => ({ order_id: id, sample_data: s }))
                );
            }

            // save libraries
            await supabase.from('libraries').delete().eq('order_id', id);
            if (payload.libraries.length > 0) {
                await supabase.from('libraries').insert(
                    payload.libraries.map(l => ({ order_id: id, lib_data: l }))
                );
            }

            // save running_info
            await supabase.from('running_info').delete().eq('order_id', id);
            if (payload.running_info.length > 0) {
                await supabase.from('running_info').insert(
                    payload.running_info.map(r => ({ order_id: id, run_data: r }))
                );
            }

        } catch (err) {
            console.error('Failed to save draft:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleReviewNavigate = async () => {
        await saveDraft();
        navigate(`/review/${id}`);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading order details...</div>;

    return (
        <div className="space-y-8 pb-24 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-16 z-40">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {id ? 'Manifest Editor' : 'New Order Manifest'}
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">Fill in the progressive steps below. Drafts are auto-saved.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={saveDraft}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                        <Save size={16} className={saving ? 'animate-pulse text-[#0A3D91]' : ''} />
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                        onClick={handleReviewNavigate}
                        disabled={!step4Valid || saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0A3D91] rounded-lg hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                        title={!step4Valid ? "Please fix validation errors in Step 4 before submitting." : ""}
                    >
                        <FileCheck size={16} />
                        Review & Submit
                    </button>
                </div>
            </div>

            <div className="space-y-12">
                <Step1Contact payload={payload} setPayload={setPayload} />
                <Step2Sample payload={payload} setPayload={setPayload} />
                <Step3Library payload={payload} setPayload={setPayload} />
                <Step4Sequencing payload={payload} setPayload={setPayload} />
                <Step5Comment payload={payload} setPayload={setPayload} onSubmit={handleReviewNavigate} disabled={!step4Valid || saving} />
            </div>
        </div>
    );
}
