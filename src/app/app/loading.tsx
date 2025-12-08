import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-32 relative overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto flex flex-col min-h-[90vh]">

                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="w-12 h-12 rounded-full" />
                </div>

                {/* Next Appointment Skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-4 w-40 mb-3" />
                    <Skeleton className="h-48 w-full rounded-3xl" />
                </div>

                {/* Loyalty Skeleton */}
                <div className="mb-8">
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>

                {/* History Skeletons */}
                <div className="flex-1 mt-8">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                        <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                </div>

            </div>
        </div>
    );
}
