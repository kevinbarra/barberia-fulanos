export default function PlatformLoading() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-zinc-950 text-zinc-100">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/60 pb-6">
                <div>
                    <div className="h-10 w-64 bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="h-4 w-40 bg-zinc-800 rounded-lg animate-pulse mt-2" />
                </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 h-36 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-8 w-36 bg-zinc-800 rounded animate-pulse" />
                        </div>
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 h-36 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                        </div>
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse" />
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 h-36 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                            <div className="h-8 w-20 bg-zinc-800 rounded animate-pulse" />
                        </div>
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl animate-pulse" />
                    </div>
                    <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
                </div>
            </div>

            {/* Chart Skeleton */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 h-[340px] flex flex-col justify-between">
                <div className="space-y-2">
                    <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                    <div className="h-3.5 w-80 bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="w-full h-56 bg-zinc-900/60 rounded-xl animate-pulse border border-zinc-800/40" />
            </div>
        </div>
    );
}
