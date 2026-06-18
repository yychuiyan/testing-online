import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import LoginForm from './pages/automation/LoginForm'
import RegisterForm from './pages/automation/RegisterForm'
import DataTable from './pages/automation/DataTable'
import ModalDialog from './pages/automation/ModalDialog'
import FileUpload from './pages/automation/FileUpload'
import DynamicElements from './pages/automation/DynamicElements'
import DragDropDemo from './pages/automation/DragDropDemo'
import LargeList from './pages/performance/LargeList'
import ImageLoading from './pages/performance/ImageLoading'
import DomComplexity from './pages/performance/DomComplexity'
import TheoryPage from './pages/theory/TheoryPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* 自动化练习 */}
        <Route path="/automation/login" element={<LoginForm />} />
        <Route path="/automation/register" element={<RegisterForm />} />
        <Route path="/automation/table" element={<DataTable />} />
        <Route path="/automation/modal" element={<ModalDialog />} />
        <Route path="/automation/upload" element={<FileUpload />} />
        <Route path="/automation/dynamic" element={<DynamicElements />} />
        <Route path="/automation/dragdrop" element={<DragDropDemo />} />

        {/* 性能测试 */}
        <Route path="/performance/large-list" element={<LargeList />} />
        <Route path="/performance/image-loading" element={<ImageLoading />} />
        <Route path="/performance/dom-complexity" element={<DomComplexity />} />

        {/* 测试理论 */}
        <Route path="/theory" element={<TheoryPage />} />
      </Route>
    </Routes>
  )
}
