'use client'

import { Suspense } from 'react'
import TitleBar from '@/components/layout/TitleBar'
import Sidebar from '@/components/layout/Sidebar'
import DashboardContent from '@/components/dashboard/DashboardContent'
import ToastContainer from '@/components/ui/Toast'

export default function Home() {
  return (
    <div className="h-screen w-screen flex flex-col bg-canvas overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-canvas">
          <Suspense fallback={<LoadingPage />}>
            <DashboardContent />
          </Suspense>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2 text-fg-2">
        <div className="w-4 h-4 rounded-full border-2 border-fg-3 border-t-primary animate-spin" />
        <span className="text-sm">加载中...</span>
      </div>
    </div>
  )
}
