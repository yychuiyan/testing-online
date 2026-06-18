import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Upload, File as FileIcon, CheckCircle, XCircle } from 'lucide-react'

interface UploadedFile {
  name: string
  size: number
  type: string
}

export default function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [singleFile, setSingleFile] = useState<UploadedFile | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSingleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSingleFile({ name: file.name, size: file.size, type: file.type })
    }
  }

  const handleMultiFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const droppedFiles = Array.from(e.dataTransfer.files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }))
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-gray-400 hover:text-gray-600 mb-6">
        <ArrowLeft size={16} className="mr-1" /> 返回首页
      </Link>

      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold mb-1">文件上传</h1>
        <p className="text-sm text-gray-500 mb-6">
          包含单文件、多文件和拖拽上传 —— 练习文件上传的自动化操作
        </p>

        {/* 单文件上传 */}
        <div className="mb-8">
          <h2 className="font-medium mb-3">📎 单文件上传</h2>
          <label className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors cursor-pointer">
            <Upload size={16} />
            选择文件
            <input
              type="file"
              onChange={handleSingleFile}
              className="hidden"
              data-testid="single-file-input"
            />
          </label>

          {singleFile && (
            <div
              className="mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
              data-testid="single-file-info"
            >
              <FileIcon size={16} className="text-green-600" />
              <span className="text-sm">{singleFile.name}</span>
              <span className="text-xs text-gray-400">{formatSize(singleFile.size)}</span>
              <CheckCircle size={16} className="text-green-500 ml-auto" />
            </div>
          )}
        </div>

        {/* 多文件上传 */}
        <div className="mb-8">
          <h2 className="font-medium mb-3">📚 多文件上传</h2>
          <label className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <Upload size={16} />
            选择多个文件
            <input
              type="file"
              multiple
              onChange={handleMultiFile}
              className="hidden"
              data-testid="multi-file-input"
            />
          </label>
        </div>

        {/* 拖拽区域 */}
        <div>
          <h2 className="font-medium mb-3">🎯 拖拽上传</h2>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
            }`}
            onDragOver={e => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDragDrop}
            data-testid="drop-zone"
          >
            <Upload size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">拖拽文件到此处上传</p>
          </div>
        </div>

        {/* 已上传文件列表 */}
        {files.length > 0 && (
          <div className="mt-6" data-testid="uploaded-files-list">
            <h3 className="font-medium text-sm text-gray-500 mb-2">
              已上传 ({files.length} 个文件)
            </h3>
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                  data-testid={`uploaded-file-${i}`}
                >
                  <FileIcon size={14} className="text-gray-400" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-red-400 hover:text-red-600"
                    data-testid={`remove-file-${i}`}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
