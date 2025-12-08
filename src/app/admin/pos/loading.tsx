import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden p-6">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Left Col */}
                <div className="space-y-6">
                    <Skeleton className="h-16 w-full rounded-xl bg-white" />
                    <Skeleton className="h-[400px] w-full rounded-xl bg-white" />
                </div>
                {/* Right Col */}
                <div className="space-y-6">
                    <Skeleton className="h-full w-full rounded-xl bg-white" />
                </div>
            </div>
        </div>
    );
}
