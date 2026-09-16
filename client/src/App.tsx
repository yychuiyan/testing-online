import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './lib/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/admin/Dashboard'
import UserList from './pages/admin/UserList'
import UserForm from './pages/admin/UserForm'
import ProductList from './pages/admin/ProductList'
import ProductForm from './pages/admin/ProductForm'
import OrderList from './pages/admin/OrderList'
import FileDownload from './pages/admin/FileDownload'
import PerfTest from './pages/admin/PerfTest'
import Cart from './pages/admin/Cart'
import OrderDetail from './pages/admin/OrderDetail'
import LogList from './pages/admin/LogList'

import Forbidden from './pages/Forbidden'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      {/* 公开 */}
      <Route path="/login" element={<Login />} />
      <Route
        path="/register"
        element={<Register />}
      />
      <Route path="/403" element={<Forbidden />} />
      <Route path="/404" element={<NotFound />} />

      {/* 后台管理 */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<ProtectedRoute requiredRole="admin"><UserList /></ProtectedRoute>} />
        <Route path="users/new" element={<ProtectedRoute requiredRole="admin"><UserForm /></ProtectedRoute>} />
        <Route path="users/:id" element={<ProtectedRoute requiredRole="admin"><UserForm /></ProtectedRoute>} />
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProtectedRoute requiredRole="admin"><ProductForm /></ProtectedRoute>} />
        <Route path="products/:id" element={<ProtectedRoute requiredRole="admin"><ProductForm /></ProtectedRoute>} />
        <Route path="cart" element={<Cart />} />
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="logs" element={<LogList />} />
        <Route path="download" element={<FileDownload />} />
        <Route path="perf" element={<PerfTest />} />

      </Route>

      {/* 根路由重定向 */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
