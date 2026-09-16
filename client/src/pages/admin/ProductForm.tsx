import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import { Form, Input, InputNumber, Select, Button, Upload, Card, Typography, Row, Col, Spin } from 'antd'
import type { UploadFile } from 'antd'
import { api, uploadFile } from '../../lib/api'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useToast } from '../../lib/toast'
import type { Category } from '../../lib/types'

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  useDocumentTitle(isEdit ? '编辑商品' : '新增商品')

  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!id)
  const { success, error } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    api.products.categories().then(res => { if (res.success && res.data) setCategories(res.data) })
    if (id) {
      setLoading(true)
      api.products.detail(parseInt(id)).then(res => {
        if (res.success && res.data) {
          const p = res.data
          form.setFieldsValue({
            name: p.name, description: p.description,
            price: p.price, originalPrice: p.originalPrice,
            brand: p.brand, categoryId: p.categoryId, stock: p.stock,
            status: p.status, specs: JSON.stringify(p.specs),
          })
          setFileList(p.images.map((url: string, i: number) => ({
            uid: `-${i}`, name: `image-${i}`, status: 'done' as const, url,
          })))
        }
        setLoading(false)
      })
    }
  }, [id, form])

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSaving(true)
    const data = {
      ...values,
      price: Number(values.price),
      originalPrice: Number(values.originalPrice) || Number(values.price),
      stock: Number(values.stock) || 0,
      categoryId: Number(values.categoryId),
      category: categories.find(c => c.id === Number(values.categoryId))?.name || '',
      images: fileList.filter(f => f.url).map(f => f.url!),
      specs: values.specs ? JSON.parse(values.specs as string) : {},
    }

    const res = isEdit
      ? await api.products.update(parseInt(id!), data)
      : await api.products.create(data as Parameters<typeof api.products.create>[0])

    setSaving(false)
    if (res.success) {
      success(isEdit ? '商品更新成功' : '商品创建成功')
      navigate('/admin/products')
    } else {
      error(res.message || '操作失败')
    }
  }

  const handleUpload = async (options: { file: File; onSuccess: (body: { url: string }) => void; onError: (err: Error) => void }) => {
    const { file, onSuccess, onError } = options
    try {
      const data = await uploadFile(file)
      if (data.success && data.data) onSuccess(data.data)
      else onError(new Error(data.message || '上传失败'))
    } catch {
      onError(new Error('上传失败'))
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Link to="/admin/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, color: '#8c8c8c', fontSize: 13 }}>
        <ArrowLeftOutlined /> 返回商品列表
      </Link>

      <Card>
        <Typography.Title level={4} style={{ marginBottom: 24 }}>{isEdit ? '编辑商品' : '新增商品'}</Typography.Title>

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'on' }}>
          {/* 基本信息 */}
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input placeholder="请输入商品名称" size="large" />
          </Form.Item>

          <Form.Item name="description" label="商品描述">
            <Input.TextArea rows={3} placeholder="请输入商品描述" />
          </Form.Item>

          {/* 价格 / 库存 */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="price" label="价格" rules={[{ required: true, message: '请输入价格' }]}>
                <InputNumber min={0} precision={2} prefix="¥" placeholder="售价" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="originalPrice" label="原价">
                <InputNumber min={0} precision={2} prefix="¥" placeholder="划线价" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="stock" label="库存">
                <InputNumber min={0} placeholder="库存数量" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 品牌 / 分类 / 状态 */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="brand" label="品牌">
                <Input placeholder="品牌名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="categoryId" label="商品分类">
                <Select
                  placeholder="请选择分类"
                  options={categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="商品状态">
                <Select
                  options={[
                    { value: 'on', label: '上架' },
                    { value: 'off', label: '下架' },
                  ]}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 图片上传 */}
          <Form.Item label="商品图片" style={{ marginBottom: 8 }}>
            <Upload
              listType="picture-card"
              maxCount={2}
              fileList={fileList}
              onChange={({ fileList: fl }) => setFileList(fl)}
              customRequest={handleUpload as never}
              accept="image/*"
            >
              {fileList.length < 2 && <div><PlusOutlined /><div style={{ marginTop: 8 }}>上传图片</div></div>}
            </Upload>
          </Form.Item>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 12 }}>最多 2 张，支持 jpg/png/gif/webp，单张不超过 100KB</Typography.Text>

          {/* 规格参数 */}
          <Form.Item
            name="specs"
            label="规格参数（JSON 格式）"
            rules={[{
              validator: (_, value) => {
                if (!value) return Promise.resolve()
                try { JSON.parse(value); return Promise.resolve() }
                catch { return Promise.reject(new Error('JSON 格式不正确')) }
              },
            }]}
          >
            <Input.TextArea rows={3} placeholder='{"屏幕": "6.7英寸", "存储": "256GB"}' />
          </Form.Item>

          {/* 操作按钮 */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', gap: 12 }}>
            <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />} size="large">
              保存
            </Button>
            <Button onClick={() => navigate('/admin/products')} size="large">取消</Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
