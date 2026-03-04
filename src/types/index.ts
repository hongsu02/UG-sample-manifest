export type UserRole = 'user' | 'admin';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    organization: string | null;
    role: UserRole;
    created_at: string;
}

export type OrderStatus = 'Draft' | 'Submitted' | 'Registered' | 'Received';

export interface Order {
    id: string;
    user_id: string;
    order_no: string | null;
    quotation_id: string | null;
    status: OrderStatus;
    contact_info: any;
    payment_method: string | null;
    created_at: string;
    updated_at: string;
}

export interface Sample {
    id?: string;
    sample_id: string; // From UI grid
    container_id: string;
    container_type: string;
    pooling: string;
    species: string;
    sample_type: string;
    conc: string;
    volume: string;
    buffer: string;
    ug_ready: string;
    well_id: string;
    pulled_no: string;
}

export interface Library {
    id?: string;
    sample_id: string; // ties to Sample row
    lib_id: string;
    library_type: string;
    library_kit: string;
    ug_barcode: string;
    tenx_index?: string;
    i7_seq?: string;
    i5_seq_a?: string;
    i5_seq_b?: string;
}

export interface RunningInfo {
    id?: string;
    sample_id: string;
    wafer_type: string;
    wafer_group: string;
    num_wafers: string;
    target_read: string;
}

// Used for complex Draft saving
export interface OrderPayload {
    order: Partial<Order>;
    samples: Sample[];
    libraries: Library[];
    running_info: RunningInfo[];
}
