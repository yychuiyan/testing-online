import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../middleware/auth.js'

const uploadDir = path.resolve('uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
    cb(null, name)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 }, // 100KB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 jpg/png/gif/webp/svg 格式'))
    }
  },
})

export const uploadRouter = Router()

/**
 * POST /api/upload — 上传单张图片，返回 URL
 */
uploadRouter.post('/', requireAuth, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '请选择图片文件' })
  }
  const url = `/uploads/${req.file.filename}`
  return res.json({ success: true, message: '上传成功', data: { url, filename: req.file.filename } })
})
