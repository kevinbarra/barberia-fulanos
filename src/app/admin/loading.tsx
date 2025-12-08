import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-6 pb-32 max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <Skeleton className="h-10 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-80 w-full rounded-2xl" />
                <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
        </div>
    );
}
