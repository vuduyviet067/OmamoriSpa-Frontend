import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Image,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import publicService from '@/services/publicService';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import './ServiceDetailPage.css';

function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await publicService.getServiceById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setService(data);
      }
    } catch (err) {
      // 404 from publicService is already converted to null; any other
      // status is a real failure and should surface to the user.
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBookNow = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="service-detail-page">
        <div className="container">
          <Link to="/services" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách dịch vụ
          </Link>
          <LoadingState message="Đang tải thông tin dịch vụ..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="service-detail-page">
        <div className="container">
          <Link to="/services" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách dịch vụ
          </Link>
          <ErrorState
            title="Không thể tải dịch vụ"
            message="Đã xảy ra lỗi khi tải thông tin dịch vụ. Vui lòng thử lại."
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="service-detail-page">
        <div className="container">
          <Link to="/services" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách dịch vụ
          </Link>
          <EmptyState
            title="Không tìm thấy dịch vụ"
            description="Dịch vụ bạn đang tìm kiếm không tồn tại."
            action={
              <Link to="/services">
                <Button variant="secondary">Xem danh sách dịch vụ</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="service-detail-page">
      <div className="container">
        <Link to="/services" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Quay lại danh sách dịch vụ
        </Link>

        <div className="service-detail-content">
          <div className="service-detail-image">
            <Image
              src={service.image}
              alt={service.name}
              type="service"
            />
          </div>

          <div className="service-detail-info">
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{service.description}</p>

            <div className="service-detail-meta">
              <div className="meta-item">
                <span className="meta-label">Thời lượng</span>
                <span className="meta-value">{formatDuration(service.duration)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Giá dịch vụ</span>
                <span className="meta-value price">{formatCurrency(service.price)}</span>
              </div>
            </div>

            {service.benefits && service.benefits.length > 0 && (
              <div className="service-benefits">
                <h3 className="benefits-title">Lợi ích</h3>
                <ul className="benefits-list">
                  {service.benefits.map((benefit, index) => (
                    <li key={index} className="benefit-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="service-detail-action">
              <Button variant="primary" size="lg" onClick={handleBookNow}>
                Đặt lịch ngay
              </Button>
              <p className="action-note">Đăng nhập để đặt lịch</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServiceDetailPage;