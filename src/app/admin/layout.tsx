import BottomNav from "@/components/ui/BottomNav";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dejamos espacio abajo (pb-24) para que el menú no tape el contenido */}
            <main className="pb-24 md:pb-0">
                {children}
            </main>

            {/* Aquí se inserta la barra de navegación fija */}
            <BottomNav role="admin" />
        </div>
    );
}