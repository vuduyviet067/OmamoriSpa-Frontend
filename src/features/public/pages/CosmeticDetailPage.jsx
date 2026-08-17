import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Button,
  Image,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import publicService from '@/services/publicService';
import { formatCurrency } from '@/utils/formatters';
import './CosmeticDetailPage.css';

function CosmeticDetailPage() {
  const { id } = useParams();

  const [cosmetic, setCosmetic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await publicService.getCosmeticById(id);
      if (!data) {
        setNotFound(true);
      } else {
        setCosmetic(data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="cosmetic-detail-page">
        <div className="container">
          <Link to="/cosmetics" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách mỹ phẩm
          </Link>
          <LoadingState message="Đang tải thông tin sản phẩm..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cosmetic-detail-page">
        <div className="container">
          <Link to="/cosmetics" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách mỹ phẩm
          </Link>
          <ErrorState
            title="Không thể tải sản phẩm"
            message="Đã xảy ra lỗi khi tải thông tin sản phẩm. Vui lòng thử lại."
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  if (notFound || !cosmetic) {
    return (
      <div className="cosmetic-detail-page">
        <div className="container">
          <Link to="/cosmetics" className="back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Quay lại danh sách mỹ phẩm
          </Link>
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description="Sản phẩm bạn đang tìm kiếm không tồn tại."
            action={
              <Link to="/cosmetics">
                <Button variant="secondary">Xem danh sách mỹ phẩm</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cosmetic-detail-page">
      <div className="container">
        <Link to="/cosmetics" className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Quay lại danh sách mỹ phẩm
        </Link>

        <div className="cosmetic-detail-content">
          <div className="cosmetic-detail-image">
            <Image
              src={cosmetic.image}
              alt={cosmetic.name}
              type="cosmetic"
            />
          </div>

          <div className="cosmetic-detail-info">
            <span className="cosmetic-brand">{cosmetic.brand}</span>
            <h1 className="cosmetic-detail-title">{cosmetic.name}</h1>

            <div className="cosmetic-detail-price">
              {formatCurrency(cosmetic.price)}
            </div>

            <p className="cosmetic-detail-description">{cosmetic.description}</p>

            {cosmetic.volume && (
              <div className="cosmetic-detail-volume">
                <span className="volume-label">Dung tích:</span>
                <span className="volume-value">{cosmetic.volume}</span>
              </div>
            )}

            {cosmetic.ingredients && cosmetic.ingredients.length > 0 && (
              <div className="cosmetic-ingredients">
                <h3 className="ingredients-title">Thành phần chính</h3>
                <div className="ingredients-list">
                  {cosmetic.ingredients.map((ingredient, index) => (
                    <span key={index} className="ingredient-tag">{ingredient}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="cosmetic-detail-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span>Sản phẩm chỉ được sử dụng tại Omamori Spa. Vui lòng liên hệ để biết thêm chi tiết.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CosmeticDetailPage;