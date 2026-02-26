export type JoinedProfile = {
    id: string;
    full_name: string | null;
    email?: string;
    phone?: string | null;
    no_show_count?: number;
    avatar_url?: string | null;
};

export type JoinedService = {
    name: string;
    price: number;
    duration_min?: number;
};

export type PosTicketData = {
    id: string;
    start_time: string;
    notes: string | null;
    profiles: JoinedProfile | null; // Staff
    services: JoinedService | null;
};

export type PosBookingData = {
    id: string;
    start_time: string;
    end_time: string;
    notes: string | null;
    status: string;
    customer_id: string | null;
    staff_id: string;
    service_id: string;
    guest_name: string | null;
    guest_phone: string | null;
    profiles: JoinedProfile | null; // Staff
    services: JoinedService | null;
    customer: JoinedProfile | null; // Customer
};

// Generic response wrapper if needed
export interface DbResult<T> {
    data: T | null;
    error: any;
}
