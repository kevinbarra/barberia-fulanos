'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

export default function DateRangeSelector() {
    const router = useRouter();
    const [range, setRange] = useState('30d');

    const handleRangeChange = (newRange: string) => {
        setRange(newRange);

        const today = new Date();
        let startDate: Date;

        switch (newRange) {
            case '7d':
                startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const params = new URLSearchParams({
            startDate: startDate.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
        });

        router.push(`/admin/reports?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
                value={range}
                onChange={(e) => handleRangeChange(e.target.value)}
                className="text-sm font-medium focus:outline-none bg-transparent text-gray-700 cursor-pointer"
            >
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="90d">Últimos 90 días</option>
                <option value="1y">Último año</option>
            </select>
        </div>
    );
}
