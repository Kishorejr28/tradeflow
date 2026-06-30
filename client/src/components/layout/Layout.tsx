import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TutorialModal from '@/components/ui/TutorialModal'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0f0f0f]">
      <Sidebar />
      {/* pt-14 on mobile gives space for the fixed hamburger button */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>
      <TutorialModal />
    </div>
  )
}
