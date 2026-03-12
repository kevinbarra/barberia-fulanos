'use client'
import { useState } from 'react'
import { Code, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DraftService } from '@/app/admin/services/import/actions'

export default function JsonInputValidator({ onValidJson }: { onValidJson: (data: DraftService[]) => void }) {
    const [jsonStr, setJsonStr] = useState('')
    const [error, setError] = useState<string | null>(null)

    const parsePrice = (priceVal: any): { value: number | null, note?: string } => {
        if (priceVal === null || priceVal === undefined) return { value: null };
        if (typeof priceVal === 'number') return { value: priceVal };

        const strVal = String(priceVal).toLowerCase();
        const extractedNum = parseFloat(strVal.replace(/[^0-9.]/g, ''));

        let note;
        if (strVal.includes('desde') || strVal.includes('a partir') || strVal.includes('+')) {
            note = "Precio sujeto a evaluación en sucursal";
        }

        return { value: isNaN(extractedNum) ? null : extractedNum, note };
    };

    const handleValidate = () => {
        try {
            if (!jsonStr.trim()) {
                setError('Pega el código JSON primero.')
                return
            }

            // Clean up: Sometimes users copy markdown blocks like ```json ... ```
            let cleanedJson = jsonStr.trim()
            if (cleanedJson.startsWith('\`\`\`json')) {
                cleanedJson = cleanedJson.replace('\`\`\`json', '')
            }
            if (cleanedJson.startsWith('\`\`\`')) {
                cleanedJson = cleanedJson.replace('\`\`\`', '')
            }
            if (cleanedJson.endsWith('\`\`\`')) {
                cleanedJson = cleanedJson.slice(0, -3)
            }
            cleanedJson = cleanedJson.trim()

            const parsed = JSON.parse(cleanedJson)

            if (!Array.isArray(parsed)) {
                setError('El JSON debe ser un arreglo que empiece con [ ]')
                return
            }

            if (parsed.length === 0) {
                setError('El arreglo está vacío.')
                return
            }

            const flattenedServices: DraftService[] = []
            let hasErrors = false

            // Flattening Logic
            for (const item of parsed) {
                // If the item uses the old flat structure, support it natively
                if (item.name && item.category && !item.base_service) {
                    const priceInfo = parsePrice(item.price);
                    flattenedServices.push({
                        name: item.name,
                        category: item.category,
                        price: priceInfo.value,
                        duration_min: item.duration_min || item.duration || 30,
                        description: item.description || '',
                        slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        metadata: priceInfo.note ? { note: priceInfo.note } : {},
                        status: priceInfo.value === null || priceInfo.value === 0 ? 'red' : ((item.duration_min || item.duration) ? 'green' : 'yellow')
                    })
                    continue;
                }

                if (!item.base_service) {
                    hasErrors = true;
                    continue;
                }

                const baseName = item.base_service;
                const baseSlug = item.slug || baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const cat = item.category || 'Varios';

                // Process Variants
                if (Array.isArray(item.variants)) {
                    item.variants.forEach((v: any) => {
                        const priceInfo = parsePrice(v.price);
                        const isDurationEstimated = !v.duration_min && !v.duration;
                        const duration = v.duration_min || v.duration || 30;

                        const srvName = v.name.toLowerCase() === 'base' || v.name === baseName
                            ? baseName
                            : `${baseName} - ${v.name}`;
                        const slugSuffix = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                        // Status logic
                        let status: DraftService['status'] = 'green';
                        if (priceInfo.value === null || priceInfo.value === 0) status = 'red';
                        else if (isDurationEstimated) status = 'yellow';

                        flattenedServices.push({
                            name: srvName,
                            category: cat,
                            price: priceInfo.value,
                            duration_min: duration,
                            description: v.description || '',
                            slug: `${baseSlug}-${slugSuffix}`.replace(/--/g, '-'),
                            metadata: priceInfo.note ? { note: priceInfo.note } : {},
                            status
                        });
                    });
                }

                // Process Add-ons (Blue Status)
                if (Array.isArray(item.suggested_addons)) {
                    item.suggested_addons.forEach((add: any) => {
                        const priceInfo = parsePrice(add.price);
                        const isDurationEstimated = !add.duration_min && !add.duration;
                        const duration = add.duration_min || add.duration || 15;
                        const slugSuffix = add.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                        let status: DraftService['status'] = 'blue';

                        flattenedServices.push({
                            name: `[Add-on] ${add.name} (${baseName})`,
                            category: cat,
                            price: priceInfo.value,
                            duration_min: duration,
                            description: add.description || 'Sugerencia de Add-on de IA',
                            slug: `${baseSlug}-addon-${slugSuffix}`.replace(/--/g, '-'),
                            metadata: { is_addon: true, parent_service: baseName, ...(priceInfo.note ? { note: priceInfo.note } : {}) },
                            status
                        });
                    });
                }
            }

            if (flattenedServices.length === 0 || hasErrors) {
                setError('No se pudieron extraer servicios válidos. Revisa el formato jerárquico.');
                return;
            }

            setError(null)
            onValidJson(flattenedServices)
        } catch (e: any) {
            setError('Error de sintaxis JSON. Asegúrate de copiar todo el arreglo [ ... ].')
        }
    }

    return (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                <span>📋</span> Paso 2: Pegar el JSON resultante
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Copia el bloque de código que generó la IA y pégalo aquí abajo:
            </p>

            <div className="relative flex-1 flex flex-col min-h-[220px]">
                <textarea
                    className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 font-mono text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all custom-scrollbar"
                    placeholder="[\n  {\n    'base_service': 'Uñas Acrílicas',\n    'variants': [\n      {'name': 'Cortas', 'price': 300}\n    ]\n  }\n]"
                    value={jsonStr}
                    onChange={e => setJsonStr(e.target.value)}
                />
                <div className="absolute top-4 right-4 text-gray-400 pointer-events-none">
                    <Code size={20} />
                </div>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 overflow-hidden">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="mt-5 flex justify-end">
                <button
                    onClick={handleValidate}
                    disabled={!jsonStr.trim()}
                    className="bg-black text-white font-bold py-3 px-6 rounded-xl text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide w-full md:w-auto"
                >
                    Procesar Datos
                </button>
            </div>
        </div>
    )
}
