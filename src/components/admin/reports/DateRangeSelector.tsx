'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
    format,
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    addMonths,
    isSameDay,
    isWithinInterval,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth
} from 'date-fns';
import { es } from 'date-fns/locale';

// Mexico City timezone offset (UTC-6)
const TIMEZONE_OFFSET = '-06:00';

// Convert local date to ISO string with timezone
function toISOWithTimezone(date: Date, isEndOfDay = false): string {
    const d = isEndOfDay ? endOfDay(date) : startOfDay(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${TIMEZONE_OFFSET}`;
}

type DateRange = {
    from: Date | null;
    to: Date | null;
};

type Preset = {
    label: string;
    getValue: () => DateRange;
};

export default function DateRangeSelector() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const [range, setRange] = useState<DateRange>({ from: null, to: null });
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activePreset, setActivePreset] = useState<string>('Hoy');
    const containerRef = useRef<HTMLDivElement>(null);

    // Presets with Mexico City timezone
    const presets: Preset[] = [
        {
            label: 'Hoy',
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(today), to: endOfDay(today) };
            }
        },
        {
            label: 'Ayer',
            getValue: () => {
                const yesterday = subDays(new Date(), 1);
                return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
            }
        },
        {
            label: 'Últimos 7 días',
            getValue: () => {
                const today = new Date();
                return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
            }
        },
        {
            label: 'Este mes',
            getValue: () => {
                const today = new Date();
                return { from: startOfMonth(today), to: endOfDay(today) };
            }
        },
        {
            label: 'Mes pasado',
            getValue: () => {
                const lastMonth = subMonths(new Date(), 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            }
        }
    ];

    // Initialize with URL params or today
    useEffect(() => {
        const startParam = searchParams.get('startDate');
        const endParam = searchParams.get('endDate');

        if (startParam && endParam) {
            setRange({
                from: new Date(startParam),
                to: new Date(endParam)
            });
            // Try to match a preset
            const matchedPreset = presets.find(p => {
                const v = p.getValue();
                return v.from && v.to &&
                    format(v.from, 'yyyy-MM-dd') === startParam &&
                    format(v.to, 'yyyy-MM-dd') === endParam;
            });
            setActivePreset(matchedPreset?.label || 'custom');
        } else {
            // Default to today
            const today = presets[0].getValue();
            setRange(today);
            setActivePreset('Hoy');
        }
    }, [searchParams]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyDateRange = (from: Date, to: Date, presetLabel?: string) => {
        // Update URL with ISO dates (timezone-aware)
        const params = new URLSearchParams({
            startDate: format(from, 'yyyy-MM-dd'),
            endDate: format(to, 'yyyy-MM-dd'),
            // Also pass full ISO for precise queries
            startISO: toISOWithTimezone(from, false),
            endISO: toISOWithTimezone(to, true)
        });

        router.push(`/admin/reports?${params.toString()}`);
        setRange({ from, to });
        setActivePreset(presetLabel || 'custom');
        setIsOpen(false);
    };

    const handlePresetClick = (preset: Preset) => {
        const { from, to } = preset.getValue();
        if (from && to) {
            applyDateRange(from, to, preset.label);
        }
    };

    const handleDayClick = (day: Date) => {
        if (!range.from || (range.from && range.to)) {
            // Start new selection
            setRange({ from: day, to: null });
        } else {
            // Complete selection
            if (day < range.from) {
                setRange({ from: day, to: range.from });
                applyDateRange(day, range.from);
            } else {
                setRange({ from: range.from, to: day });
                applyDateRange(range.from, day);
            }
        }
    };

    // Calendar rendering
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { locale: es });
    const calendarEnd = endOfWeek(monthEnd, { locale: es });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const isInRange = (day: Date) => {
        if (!range.from || !range.to) return false;
        return isWithinInterval(day, { start: range.from, end: range.to });
    };

    const isRangeStart = (day: Date) => range.from && isSameDay(day, range.from);
    const isRangeEnd = (day: Date) => range.to && isSameDay(day, range.to);

    // Display label
    const displayLabel = () => {
        if (activePreset !== 'custom' && activePreset) {
            return activePreset;
        }
        if (range.from && range.to) {
            if (isSameDay(range.from, range.to)) {
                return format(range.from, 'd MMM yyyy', { locale: es });
            }
            return `${format(range.from, 'd MMM', { locale: es })} - ${format(range.to, 'd MMM', { locale: es })}`;
        }
        return 'Seleccionar fecha';
    };

    return (
        <div className="relative w-full sm:w-auto" ref={containerRef}>
            {/* Trigger Button - Full width on mobile */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-colors"
            >
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{displayLabel()}</span>
            </button>

            {/* Dropdown - Responsive positioning */}
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Picker Container */}
                    <div
                        className="
                            fixed bottom-0 left-0 right-0 z-50
                            sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2
                            bg-white rounded-t-2xl sm:rounded-2xl border border-gray-200 shadow-xl 
                            overflow-hidden animate-in fade-in
                            sm:slide-in-from-top-2 slide-in-from-bottom-4 duration-200
                            max-h-[80vh] sm:max-h-none overflow-y-auto
                        "
                    >
                        {/* Mobile Header with Close */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sm:hidden">
                            <span className="font-semibold text-gray-900">Seleccionar Fecha</span>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Content Container */}
                        <div className="flex flex-col sm:flex-row">
                            {/* Presets - Horizontal scroll on mobile, sidebar on desktop */}
                            <div className="border-b sm:border-b-0 sm:border-r border-gray-100 p-2 bg-gray-50/50 sm:w-40">
                                <p className="hidden sm:block px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    Accesos Rápidos
                                </p>
                                <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
                                    {presets.map((preset) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => handlePresetClick(preset)}
                                            className={`
                                                flex-shrink-0 px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap
                                                ${activePreset === preset.label
                                                    ? 'bg-gray-900 text-white font-medium'
                                                    : 'text-gray-700 hover:bg-gray-100 bg-white sm:bg-transparent'
                                                }
                                            `}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Calendar */}
                            <div className="p-4 w-full sm:w-72">
                                {/* Month Navigation */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                                    </button>
                                    <span className="text-sm font-semibold text-gray-900 capitalize">
                                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                                    </span>
                                    <button
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>

                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 mb-2">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
                                        <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Days Grid */}
                                <div className="grid grid-cols-7 gap-0.5">
                                    {days.map((day, i) => {
                                        const inCurrentMonth = isSameMonth(day, currentMonth);
                                        const isSelected = isRangeStart(day) || isRangeEnd(day);
                                        const inRange = isInRange(day) && !isSelected;
                                        const isToday = isSameDay(day, new Date());

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleDayClick(day)}
                                                disabled={!inCurrentMonth}
                                                className={`
                                                    relative h-10 sm:h-9 text-sm font-medium rounded-lg transition-all
                                                    ${!inCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                                                    ${isSelected ? 'bg-gray-900 text-white hover:bg-gray-800' : ''}
                                                    ${inRange ? 'bg-gray-100 text-gray-900' : ''}
                                                    ${isToday && !isSelected ? 'ring-1 ring-gray-300' : ''}
                                                `}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Selection Info */}
                                {range.from && !range.to && (
                                    <p className="mt-3 text-xs text-gray-500 text-center">
                                        Selecciona fecha final
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
