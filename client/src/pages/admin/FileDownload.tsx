import { useState } from 'react'
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { Card, Button, Typography, Row, Col } from 'antd'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export default function FileDownload() {
  useDocumentTitle('文件下载')
  const [downloadStatus, setDownloadStatus] = useState('')

  const handleDownload = async () => {
    setDownloadStatus('下载中...')
    try {
      const res = await fetch('/api/mock/download')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'test-data.txt'
      a.click()
      URL.revokeObjectURL(url)
      setDownloadStatus('✅ 下载完成')
    } catch {
      setDownloadStatus('❌ 下载失败')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>📥 文件下载</Typography.Title>
        <Typography.Text type="secondary">模拟文件下载 — 练习 Playwright 下载事件监听</Typography.Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card>
            <FileTextOutlined style={{ fontSize: 32, color: '#2563eb', marginBottom: 12 }} />
            <Typography.Title level={5}>文本文件下载</Typography.Title>
            <Typography.Paragraph type="secondary">下载 test-data.txt，内容为测试数据文本</Typography.Paragraph>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              data-testid="download-txt-btn"
            >
              下载文件
            </Button>
            {downloadStatus && (
              <Typography.Text style={{ display: 'block', marginTop: 12 }} data-testid="download-status">{downloadStatus}</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card>
            <FileTextOutlined style={{ fontSize: 32, color: '#16a34a', marginBottom: 12 }} />
            <Typography.Title level={5}>直接链接下载</Typography.Title>
            <Typography.Paragraph type="secondary">通过 a 标签直接触发浏览器下载</Typography.Paragraph>
            <Button
              icon={<DownloadOutlined />}
              href="/api/mock/download"
              data-testid="download-link-btn"
            >
              直接下载
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
