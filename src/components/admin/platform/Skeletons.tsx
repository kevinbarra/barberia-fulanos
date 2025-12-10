'use client';

export default function TenantSkeleton() {
    return (
        <div className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
                {/* Avatar Skeleton */}
                <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />

                {/* Info Skeleton */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 bg-gray-200 rounded w-32" />
                        <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-3 bg-gray-100 rounded w-20" />
                        <div className="h-3 bg-gray-100 rounded w-12" />
                    </div>
                </div>

                {/* Button Skeleton */}
                <div className="h-9 w-24 bg-gray-100 rounded-lg" />
                <div className="h-9 w-9 bg-gray-100 rounded-lg" />
            </div>
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg mb-2" />
                    <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
            ))}
        </div>
    );
}

export function ChartSkeleton() {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
            <div className="flex items-end justify-between gap-2 h-24">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className="w-full bg-gray-200 rounded-t-sm"
                            style={{ height: `${20 + Math.random() * 60}%` }}
                        />
                        <div className="h-3 bg-gray-100 rounded w-6" />
                    </div>
                ))}
            </div>
        </div>
    );
}
