import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  Button,
  Image,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import publicService from '@/services/publicService';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import './ServicesPage.css';

function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await publicService.getServices();
      setServices(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="services-page">
        <div className="container">
          <PageHeader
            title="Dịch vụ Spa"
            description="Khám phá các liệu pháp spa cao cấp của chúng tôi, được thiết kế để mang lại sự thư giãn và cân bằng cho cơ thể."
          />
          <LoadingState message="Đang tải danh sách dịch vụ..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="services-page">
        <div className="container">
          <PageHeader
            title="Dịch vụ Spa"
            description="Khám phá các liệu pháp spa cao cấp của chúng tôi, được thiết kế để mang lại sự thư giãn và cân bằng cho cơ thể."
          />
          <ErrorState
            title="Không thể tải dịch vụ"
            message="Đã xảy ra lỗi khi tải danh sách dịch vụ. Vui lòng thử lại."
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="services-page">
        <div className="container">
          <PageHeader
            title="Dịch vụ Spa"
            description="Khám phá các liệu pháp spa cao cấp của chúng tôi, được thiết kế để mang lại sự thư giãn và cân bằng cho cơ thể."
          />
          <EmptyState
            title="Chưa có dịch vụ nào"
            description="Hiện chưa có dịch vụ nào được hiển thị. Vui lòng quay lại sau."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="services-page">
      <div className="container">
        <PageHeader
          title="Dịch vụ Spa"
          description="Khám phá các liệu pháp spa cao cấp của chúng tôi, được thiết kế để mang lại sự thư giãn và cân bằng cho cơ thể."
        />

        <div className="services-grid">
          {services.map((service) => (
            <Link key={service.id} to={`/services/${service.id}`} className="service-card">
              <div className="service-card-image">
                <Image
                  src={service.image}
                  alt={service.name}
                  type="service"
                />
              </div>
              <div className="service-card-content">
                <h3 className="service-card-title">{service.name}</h3>
                <p className="service-card-description">{service.description}</p>
                <div className="service-card-footer">
                  <div className="service-card-meta">
                    <span className="service-duration">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" strokeLinecap="round" />
                      </svg>
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                  <div className="service-card-price">{formatCurrency(service.price)}</div>
                </div>
                <div className="service-card-action">
                  <Button variant="secondary" size="sm">Xem chi tiết</Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ServicesPage;