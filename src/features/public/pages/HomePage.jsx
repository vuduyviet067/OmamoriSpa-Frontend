import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Image, LoadingState, EmptyState } from '@/components/common';
import publicService from '@/services/publicService';
import { formatCurrency, formatDuration } from '@/utils/formatters';
import './HomePage.css';

const HERO_IMAGE = '/images/spa/source/hero.jpg';

function HomePage() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [cosmetics, setCosmetics] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const safe = async (fn) => {
      try {
        const list = await fn();
        return Array.isArray(list) ? list : [];
      } catch (err) {
        console.error('Home catalog section failed:', err);
        return [];
      }
    };

    const [svc, cos, thp] = await Promise.all([
      safe(() => publicService.getServices()),
      safe(() => publicService.getCosmetics()),
      safe(() => publicService.getTherapists()),
    ]);

    setServices(svc);
    setCosmetics(cos);
    setTherapists(thp);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBookNow = () => {
    navigate('/login');
  };

  // Short role labels per therapist — same as the mockup profile cards
  const therapistRoles = {
    1: 'Chuyên viên trị liệu',
    2: 'Chuyên viên massage',
    3: 'Chuyên viên chăm sóc da',
    4: 'Chuyên viên chăm sóc da',
  };

  const previewServices = services.slice(0, 4);
  const previewCosmetics = cosmetics.slice(0, 4);
  const previewTherapists = therapists.slice(0, 4);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-text">
            <span className="hero-eyebrow">Omamori Spa</span>
            <h1 className="hero-heading">Chăm sóc cơ thể, phục hồi sự cân bằng</h1>
            <p className="hero-description">
              Liệu pháp chuyên sâu, không gian thư giãn và chăm sóc từ tâm.
            </p>
            <div className="hero-actions">
              <Button variant="primary" size="lg" onClick={handleBookNow}>
                Đặt lịch ngay
              </Button>
              <Link to="/services" className="hero-secondary-link">
                Xem dịch vụ
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <Image
              src={HERO_IMAGE}
              alt="Không gian spa Omamori"
              type="room"
            />
          </div>
        </div>
      </section>

      {/* Dịch vụ nổi bật */}
      <section className="section services-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Dịch vụ nổi bật</h2>
            <span className="section-divider" aria-hidden="true" />
          </div>

          {loading ? (
            <LoadingState message="Đang tải dịch vụ..." />
          ) : previewServices.length === 0 ? (
            <EmptyState
              title="Chưa có dịch vụ nào"
              description="Hiện chưa có dịch vụ nào được hiển thị."
            />
          ) : (
            <div className="services-grid">
              {previewServices.map((service) => (
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
                    <div className="service-card-meta">
                      <span className="service-card-duration">
                        {formatDuration(service.duration)}
                      </span>
                      <span className="service-card-price">
                        {formatCurrency(service.price)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="section-footer">
            <Link to="/services" className="section-outline-btn">
              Xem tất cả dịch vụ
            </Link>
          </div>
        </div>
      </section>

      {/* Mỹ phẩm được yêu thích */}
      <section className="section cosmetics-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Mỹ phẩm được yêu thích</h2>
            <span className="section-divider" aria-hidden="true" />
          </div>

          {loading ? (
            <LoadingState message="Đang tải mỹ phẩm..." />
          ) : previewCosmetics.length === 0 ? (
            <EmptyState
              title="Chưa có sản phẩm nào"
              description="Hiện chưa có sản phẩm nào được hiển thị."
            />
          ) : (
            <div className="cosmetics-grid">
              {previewCosmetics.map((cosmetic) => (
                <Link key={cosmetic.id} to={`/cosmetics/${cosmetic.id}`} className="cosmetic-card">
                  <div className="cosmetic-card-image">
                    <Image
                      src={cosmetic.image}
                      alt={cosmetic.name}
                      type="cosmetic"
                    />
                  </div>
                  <div className="cosmetic-card-content">
                    <span className="cosmetic-brand">{cosmetic.brand}</span>
                    <h3 className="cosmetic-card-title">{cosmetic.name}</h3>
                    <div className="cosmetic-card-price">{formatCurrency(cosmetic.price)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="section-footer">
            <Link to="/cosmetics" className="section-outline-btn">
              Xem tất cả mỹ phẩm
            </Link>
          </div>
        </div>
      </section>

      {/* Đội ngũ kỹ thuật viên */}
      <section className="section therapists-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Đội ngũ kỹ thuật viên</h2>
            <span className="section-divider" aria-hidden="true" />
          </div>

          {loading ? (
            <LoadingState message="Đang tải đội ngũ kỹ thuật viên..." />
          ) : previewTherapists.length === 0 ? (
            <EmptyState
              title="Chưa có kỹ thuật viên"
              description="Đội ngũ kỹ thuật viên sẽ được hiển thị khi có dữ liệu."
            />
          ) : (
            <div className="therapists-grid">
              {previewTherapists.map((therapist) => (
                <div key={therapist.id} className="therapist-card">
                  <div className="therapist-card-image">
                    <Image
                      src={therapist.image}
                      alt={therapist.name}
                      type="person"
                    />
                  </div>
                  <div className="therapist-card-content">
                    <h3 className="therapist-card-title">{therapist.name}</h3>
                    <p className="therapist-specialty">
                      {therapistRoles[therapist.id] || 'Chuyên viên'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default HomePage;