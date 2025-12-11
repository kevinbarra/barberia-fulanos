'use client'

import { useAutoRefresh } from "@/hooks/useAutoRefresh"

export default function AutoRefreshWrapper() {
    useAutoRefresh()
    return null
}
