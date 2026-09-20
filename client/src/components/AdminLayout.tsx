import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  DeleteOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Button, Breadcrumb, Space, Typography, theme, Grid } from 'antd';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';
import { useModal } from '../lib/modal';
import type { Role } from '../lib/types';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: Role[];
}

const allMenus: MenuItem[] = [
  {
    key: 'dashboard',
    label: '仪表盘',
    icon: <DashboardOutlined />,
    path: '/admin/dashboard',
    roles: ['admin', 'user'],
  },
  {
    key: 'users',
    label: '用户管理',
    icon: <UserOutlined />,
    path: '/admin/users',
    roles: ['admin'],
  },
  {
    key: 'products',
    label: '商品管理',
    icon: <AppstoreOutlined />,
    path: '/admin/products',
    roles: ['admin', 'user'],
  },
  {
    key: 'cart',
    label: '购物车',
    icon: <ShoppingCartOutlined />,
    path: '/admin/cart',
    roles: ['admin', 'user'],
  },
  {
    key: 'orders',
    label: '订单管理',
    icon: <ShoppingOutlined />,
    path: '/admin/orders',
    roles: ['admin', 'user'],
  },
  {
    key: 'download',
    label: '文件下载',
    icon: <DownloadOutlined />,
    path: '/admin/download',
    roles: ['admin', 'user'],
  },
  {
    key: 'logs',
    label: '操作日志',
    icon: <FileTextOutlined />,
    path: '/admin/logs',
    roles: ['admin', 'user'],
  },
  {
    key: 'perf',
    label: '性能测试入口',
    icon: <ThunderboltOutlined />,
    path: '/admin/perf',
    roles: ['admin', 'user'],
  },
  {
    key: 'llm',
    label: '大模型控制台',
    icon: <RobotOutlined />,
    path: '/admin/llm',
    roles: ['admin', 'user'],
  },
];

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 64;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, hasRole, logout } = useAuth();
  const { success, error } = useToast();
  const { confirm } = useModal();
  const location = useLocation();
  const navigate = useNavigate();
  const { lg } = Grid.useBreakpoint();
  const { token } = theme.useToken();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const visibleMenus = allMenus.filter(m => hasRole(...m.roles));

  const handleLogout = async () => {
    const ok = await confirm('退出登录', '确定要退出登录吗？');
    if (!ok) return;
    await logout();
    success('已退出登录');
    navigate('/login');
  };

  /**
   * 一键清除：保留固定的种子数据，把新增的商品/用户/订单/购物车/日志全部清掉。
   * 放在头部账号左侧，方便任意页面触发。
   */
  const handleResetData = async () => {
    const ok = await confirm(
      '清除缓存数据',
      '将删除所有新增数据（商品 / 用户 / 订单 / 购物车 / 日志），仅保留系统初始数据，且不可恢复。确定继续吗？'
    );
    if (!ok) return;
    const res = await api.perf.reset();
    if (!res.success) {
      error(res.message || '清除失败');
      return;
    }
    success(res.message || '已清除新增数据');
    // 通知已挂载的页面（如性能测试入口）刷新统计
    window.dispatchEvent(new CustomEvent('app:data-reset'));
  };

  const getSelectedKeys = () => {
    const menu = allMenus.find(m => location.pathname.startsWith(m.path));
    return menu ? [menu.key] : ['dashboard'];
  };

  const menuItems = visibleMenus.map(m => ({
    key: m.key,
    icon: m.icon,
    label: <Link to={m.path}>{m.label}</Link>,
  }));

  const logoContent = (
    <Link
      to="/admin/dashboard"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '16px 12px' : '16px 20px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          backgroundColor: token.colorPrimary,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          flexShrink: 0,
          fontSize: 18,
        }}
      >
        A
      </div>
      {!collapsed && (
        <Typography.Text strong style={{ color: '#fff', fontSize: 15 }}>
          场景测试平台
        </Typography.Text>
      )}
    </Link>
  );

  const siderNode = (
    <Layout.Sider
      width={SIDER_WIDTH}
      collapsedWidth={SIDER_COLLAPSED_WIDTH}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      trigger={null}
      theme="dark"
      style={{
        overflow: 'hidden',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 101,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {logoContent}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          style={{ borderRight: 0, flex: 1, overflow: 'auto' }}
        />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <Button
            type="text"
            block
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              color: 'rgba(255,255,255,0.65)',
              justifyContent: collapsed ? 'center' : 'flex-start',
              display: 'flex',
              alignItems: 'center',
              height: 48,
              borderRadius: 0,
              paddingLeft: collapsed ? 0 : 24,
            }}
          >
            {!collapsed && '收起菜单'}
          </Button>
        </div>
      </div>
    </Layout.Sider>
  );

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Desktop sider */}
      {lg && siderNode}

      {/* Mobile sider */}
      {!lg && mobileOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
            onClick={() => setMobileOpen(false)}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 101 }}>
            <Layout.Sider width={SIDER_WIDTH} theme="dark" style={{ height: '100vh' }}>
              {logoContent}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                items={menuItems}
                onClick={() => setMobileOpen(false)}
                style={{ borderRight: 0 }}
              />
            </Layout.Sider>
          </div>
        </>
      )}

      {/* Main area */}
      <div
        style={{
          marginLeft: lg ? (collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH) : 0,
          transition: 'margin-left 0.2s',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 99,
            background: '#fff',
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            borderBottom: '1px solid #f0f0f0',
            gap: 12,
          }}
        >
          {!lg && (
            <Button type="text" icon={<MenuUnfoldOutlined />} onClick={() => setMobileOpen(true)} />
          )}
          <Breadcrumb
            items={[
              { title: 'Admin' },
              ...(allMenus.find(m => location.pathname.startsWith(m.path))
                ? [{ title: allMenus.find(m => location.pathname.startsWith(m.path))!.label }]
                : []),
            ]}
            style={{ flex: 1 }}
          />
          <Space>
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={handleResetData}
              danger
              style={{ fontSize: 13 }}
            >
              清除缓存数据
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserOutlined style={{ fontSize: 14, color: '#666' }} />
              </div>
              <Typography.Text style={{ fontSize: 13, color: '#666' }}>
                {user?.username}
              </Typography.Text>
            </div>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              danger
              style={{ fontSize: 13 }}
            >
              退出
            </Button>
          </Space>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
