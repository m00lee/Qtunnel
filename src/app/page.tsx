'use client'

import { Suspense } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import DashboardContent from '@/components/dashboard/DashboardContent'

export default function Home() {
  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <Suspense fallback={<LoadingPage />}>
            <DashboardContent />
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-full animate-fade-in">
      <div className="text-center space-y-4">
        <div className="relative w-10 h-10 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  )
}
