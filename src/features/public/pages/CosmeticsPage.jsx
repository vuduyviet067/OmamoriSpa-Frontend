import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PageHeader,
  Image,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@/components/common';
import publicService from '@/services/publicService';
import { formatCurrency } from '@/utils/formatters';
import './CosmeticsPage.css';

function CosmeticsPage() {
  const [cosmetics, setCosmetics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await publicService.getCosmetics();
      setCosmetics(Array.isArray(list) ? list : []);
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
      <div className="cosmetics-page">
        <div className="container">
          <PageHeader
            title="Mỹ phẩm Spa cao cấp"
            description="Sản phẩm chiết xuất từ thảo mộc tự nhiên, được nghiên cứu và phát triển riêng cho Omamori Spa."
          />
          <LoadingState message="Đang tải danh sách mỹ phẩm..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cosmetics-page">
        <div className="container">
          <PageHeader
            title="Mỹ phẩm Spa cao cấp"
            description="Sản phẩm chiết xuất từ thảo mộc tự nhiên, được nghiên cứu và phát triển riêng cho Omamori Spa."
          />
          <ErrorState
            title="Không thể tải mỹ phẩm"
            message="Đã xảy ra lỗi khi tải danh sách mỹ phẩm. Vui lòng thử lại."
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  if (cosmetics.length === 0) {
    return (
      <div className="cosmetics-page">
        <div className="container">
          <PageHeader
            title="Mỹ phẩm Spa cao cấp"
            description="Sản phẩm chiết xuất từ thảo mộc tự nhiên, được nghiên cứu và phát triển riêng cho Omamori Spa."
          />
          <EmptyState
            title="Chưa có sản phẩm nào"
            description="Hiện chưa có sản phẩm nào được hiển thị. Vui lòng quay lại sau."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cosmetics-page">
      <div className="container">
        <PageHeader
          title="Mỹ phẩm Spa cao cấp"
          description="Sản phẩm chiết xuất từ thảo mộc tự nhiên, được nghiên cứu và phát triển riêng cho Omamori Spa."
        />

        <div className="cosmetics-grid">
          {cosmetics.map((cosmetic) => (
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
                <p className="cosmetic-card-description">{cosmetic.description}</p>
                <div className="cosmetic-card-footer">
                  <span className="cosmetic-volume">{cosmetic.volume}</span>
                  <span className="cosmetic-price">{formatCurrency(cosmetic.price)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CosmeticsPage;