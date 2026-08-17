import { useEffect, useState, useCallback } from 'react';
import {
  PageHeader,
  Image,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import publicService from '@/services/publicService';
import './TherapistsPage.css';

function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await publicService.getTherapists();
      setTherapists(Array.isArray(list) ? list : []);
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
      <div className="therapists-page">
        <div className="container">
          <PageHeader
            title="Đội ngũ kỹ thuật viên"
            description="Đội ngũ được đào tạo chuyên nghiệp, giàu kinh nghiệm và tận tâm với nghề. Họ sẽ mang đến cho bạn trải nghiệm spa tốt nhất."
          />
          <LoadingState message="Đang tải đội ngũ kỹ thuật viên..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="therapists-page">
        <div className="container">
          <PageHeader
            title="Đội ngũ kỹ thuật viên"
            description="Đội ngũ được đào tạo chuyên nghiệp, giàu kinh nghiệm và tận tâm với nghề. Họ sẽ mang đến cho bạn trải nghiệm spa tốt nhất."
          />
          <ErrorState
            title="Không thể tải đội ngũ kỹ thuật viên"
            message="Đã xảy ra lỗi khi tải đội ngũ kỹ thuật viên. Vui lòng thử lại."
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  if (therapists.length === 0) {
    return (
      <div className="therapists-page">
        <div className="container">
          <PageHeader
            title="Đội ngũ kỹ thuật viên"
            description="Đội ngũ được đào tạo chuyên nghiệp, giàu kinh nghiệm và tận tâm với nghề. Họ sẽ mang đến cho bạn trải nghiệm spa tốt nhất."
          />
          <EmptyState
            title="Chưa có kỹ thuật viên nào"
            description="Hiện chưa có kỹ thuật viên nào được hiển thị. Vui lòng quay lại sau."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="therapists-page">
      <div className="container">
        <PageHeader
          title="Đội ngũ kỹ thuật viên"
          description="Đội ngũ được đào tạo chuyên nghiệp, giàu kinh nghiệm và tận tâm với nghề. Họ sẽ mang đến cho bạn trải nghiệm spa tốt nhất."
        />

        <div className="therapists-grid">
          {therapists.map((therapist) => (
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
                <p className="therapist-specialty">{therapist.specialty}</p>
                <p className="therapist-experience">{therapist.experience} năm kinh nghiệm</p>
                <p className="therapist-description">{therapist.description}</p>
                {therapist.certifications && therapist.certifications.length > 0 && (
                  <div className="therapist-certifications">
                    {therapist.certifications.map((cert, index) => (
                      <span key={index} className="certification-tag">{cert}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TherapistsPage;