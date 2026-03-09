import React from 'react';
import type { OrderPayload } from '../types';

interface Props {
    payload: OrderPayload;
    setPayload: React.Dispatch<React.SetStateAction<OrderPayload>>;
    onSubmit?: () => void;
    disabled?: boolean;
}

export default function Step5Comment({ payload, setPayload, onSubmit, disabled }: Props) {
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPayload(prev => ({
            ...prev,
            order: {
                ...prev.order,
                contact_info: {
                    ...prev.order.contact_info,
                    comments: e.target.value
                }
            }
        }));
    };

    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-m-20" id="step5-comment">
            <div className="bg-[#0A3D91] px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Step 5. Comments / Special Instructions (Optional)</h2>
            </div>
            <div className="p-6">
                <p className="text-sm text-slate-500 mb-4">
                    If you have any extra details, specific handling requests, or important notes regarding your samples, please leave them below.
                </p>
                <textarea
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter any additional comments or instructions here..."
                    value={payload.order.contact_info?.comments || ''}
                    onChange={handleCommentChange}
                />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end items-center z-10 sticky bottom-0">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={disabled}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
                    title={disabled ? "Please fix validation errors before submitting" : ""}
                >
                    Review & Submit
                </button>
            </div>
        </section>
    );
}
