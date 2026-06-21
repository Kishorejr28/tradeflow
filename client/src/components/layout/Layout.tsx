import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TutorialModal from '@/components/ui/TutorialModal'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0f0f0f]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TutorialModal />
    </div>
  )
}
