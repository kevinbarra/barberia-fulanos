'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import PromptCopier from '@/components/admin/services/import/PromptCopier'
import JsonInputValidator from '@/components/admin/services/import/JsonInputValidator'
import DraftReviewTable from '@/components/admin/services/import/DraftReviewTable'
import { DraftService, matchAndCreateCategories, bulkCreateServices } from '@/app/admin/services/import/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function ServicesImportPage() {
    const router = useRouter()
    const [draftData, setDraftData] = useState<DraftService[] | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    const handleValidJson = (data: DraftService[]) => {
        setDraftData(data)
    }

    const handleSave = async (finalData: DraftService[]) => {
        setIsSaving(true)
        const toastId = toast.loading('Procesando categorías y servicios...')

        try {
            // 1. Match and create categories
            const categoryNames = finalData.map(s => s.category)
            const catRes = await matchAndCreateCategories(categoryNames)

            if (catRes.error) {
                toast.error(catRes.error, { id: toastId })
                setIsSaving(false)
                return
            }

            const categoryMap = catRes.categoryMap || {}

            // 2. Prepare payload adding category_id
            const servicesToCreate = finalData.map(s => ({
                ...s,
                category_id: categoryMap[s.category] || null
            }))

            // 3. Bulk insert
            const insertRes = await bulkCreateServices(servicesToCreate)

            if (insertRes.error) {
                toast.error(insertRes.error, { id: toastId })
                setIsSaving(false)
                return
            }

            toast.success(`¡${finalData.length} servicios importados con éxito!`, { id: toastId })
            router.push('/admin/services')
            router.refresh()

        } catch (e: any) {
            toast.error('Error inesperado: ' + e.message, { id: toastId })
            setIsSaving(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto p-6 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin/services" className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <ChevronLeft size={24} className="text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Importación Mágica</h1>
                    <p className="text-gray-500 text-sm">Convierte fotos de menús en servicios usando IA.</p>
                </div>
            </div>

            {!draftData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch min-h-[500px]">
                    {/* Paso 1 */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
                        <PromptCopier />
                    </motion.div>

                    {/* Paso 2 */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="h-full">
                        <JsonInputValidator onValidJson={handleValidJson} />
                    </motion.div>
                </div>
            ) : (
                /* Paso 3 */
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <DraftReviewTable
                        initialData={draftData}
                        onSave={handleSave}
                        isSaving={isSaving}
                        onCancel={() => setDraftData(null)}
                    />
                </motion.div>
            )}
        </div>
    )
}
