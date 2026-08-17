import { useState } from 'react';
import { PageHeader, Button, Input } from '@/components/common';

function AdminProfile() {
  const [formData, setFormData] = useState({
    name: 'Quản trị viên',
    email: 'admin@omamori.vn',
    phone: '0903 456 789',
  });

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div>
      <PageHeader title="Hồ sơ quản trị" description="Quản lý thông tin tài khoản quản trị" />

      <div className="card" style={{ maxWidth: '600px' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <Input label="Họ và tên" value={formData.name} onChange={handleChange('name')} />
              <Input label="Email" type="email" value={formData.email} onChange={handleChange('email')} />
              <Input label="Số điện thoại" type="tel" value={formData.phone} onChange={handleChange('phone')} />
            </div>
            <Button type="submit">Lưu thay đổi</Button>
          </form>

          <div className="divider" />

          <h4 style={{ marginBottom: 'var(--space-4)' }}>Đổi mật khẩu</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input label="Mật khẩu hiện tại" type="password" placeholder="••••••••" />
            <Input label="Mật khẩu mới" type="password" placeholder="••••••••" />
            <Input label="Xác nhận mật khẩu mới" type="password" placeholder="••••••••" />
            <Button variant="secondary">Cập nhật mật khẩu</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProfile;
