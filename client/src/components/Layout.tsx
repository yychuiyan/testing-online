import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Outlet />
      </main>
      <footer className="text-center text-sm text-gray-400 py-6 border-t">
        Test Online — 自动化测试 & 性能测试练习平台
      </footer>
    </div>
  )
}
