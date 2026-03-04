import React, { useState } from 'react';
import type { OrderPayload } from '../types';

interface Props {
    payload: OrderPayload;
    setPayload: React.Dispatch<React.SetStateAction<OrderPayload>>;
}

export default function Step1Contact({ payload, setPayload }: Props) {
    const [quotationError, setQuotationError] = useState('');

    const handleContactChange = (field: string, value: string) => {
        setPayload(prev => ({
            ...prev,
            order: {
                ...prev.order,
                contact_info: {
                    ...(prev.order.contact_info || {}),
                    [field]: value
                }
            }
        }));
    };

    const handleQuotationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();

        // update state
        setPayload(prev => ({
            ...prev,
            order: {
                ...prev.order,
                quotation_id: val
            }
        }));

        // validation
        if (val && !/^ANQ\d{8}$/.test(val)) {
            setQuotationError("Quotation No. must be 'ANQ' followed by exactly 8 digits.");
        } else {
            setQuotationError('');
        }
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPayload(prev => ({
            ...prev,
            order: {
                ...prev.order,
                payment_method: e.target.value
            }
        }));
    };

    const pInfo = payload.order.contact_info || {};

    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#0A3D91] px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Step 1. Contact & Billing Information</h2>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quotation No. *</label>
                    <p className="text-xs font-semibold text-red-600 mb-2">Enter the issued Quotation No.</p>
                    <input
                        type="text"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-[#0A3D91] focus:border-[#0A3D91] ${quotationError ? 'border-red-500 ring-red-500' : 'border-slate-300'}`}
                        placeholder="e.g. ANQ12345678"
                        value={payload.order.quotation_id || ''}
                        onChange={handleQuotationChange}
                    />
                    {quotationError && <p className="mt-1 text-sm text-red-600">{quotationError}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
                    <select
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-[#0A3D91] focus:border-[#0A3D91]"
                        value={payload.order.payment_method || ''}
                        onChange={handlePaymentChange}
                    >
                        <option value="" disabled>Select Payment Method</option>
                        <option value="Purchase Order">Purchase Order</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Prepaid Balance">Prepaid Balance</option>
                        <option value="Master Service Agreement">Master Service Agreement</option>
                    </select>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.firstName || ''} onChange={e => handleContactChange('firstName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.lastName || ''} onChange={e => handleContactChange('lastName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.email || ''} onChange={e => handleContactChange('email', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Institution</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.institution || ''} onChange={e => handleContactChange('institution', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">PI Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.piName || ''} onChange={e => handleContactChange('piName', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            value={pInfo.phone || ''} onChange={e => handleContactChange('phone', e.target.value)} />
                    </div>
                </div>
            </div>
        </section>
    );
}
