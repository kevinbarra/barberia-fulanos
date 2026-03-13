'use client'

import { useState, useEffect } from 'react'
import { getTenantSettings } from '@/app/admin/settings/actions'
import TenantForm from '@/components/admin/TenantForm'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Palette } from 'lucide-react'

export default function BrandingSettings() {
    const [tenantData, setTenantData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single()

            if (profile?.tenant_id) {
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('name, slug, logo_url')
                    .eq('id', profile.tenant_id)
                    .single()
                setTenantData(tenant)
            }
            setIsLoading(false)
        }
        load()
    }, [])

    if (isLoading) {
        return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                        <Palette size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Identidad Visual</h3>
                        <p className="text-sm text-gray-500">Configura el logo y nombre de tu negocio.</p>
                    </div>
                </div>
                
                {tenantData && (
                    <TenantForm initialData={tenantData} />
                )}
            </div>
        </div>
    )
}
