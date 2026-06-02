'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppHome() {
  const router = useRouter()

  useEffect(() => {
    router.push('/app/vaults')
  }, [router])

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block mb-4">
          <div className="w-12 h-12 border border-[#00d9ff] flex items-center justify-center animate-spin">
            <div className="w-3 h-3 bg-[#00d9ff]" />
          </div>
        </div>
        <p className="font-mono text-sm text-[#5a5a5a]">Loading dashboard...</p>
      </div>
    </div>
  )
}
