import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/context';

// Access Denied Page Component
function AccessDeniedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-ivory)',
      padding: 'var(--space-6)',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto var(--space-6)',
          backgroundColor: 'rgba(184, 84, 80, 0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="var(--color-error)" 
            strokeWidth="1.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 'var(--text-2xl)',
          marginBottom: 'var(--space-3)',
          color: 'var(--color-charcoal)',
        }}>
          Không có quyền truy cập
        </h1>
        <p style={{
          color: 'var(--color-charcoal-muted)',
          marginBottom: 'var(--space-6)',
          lineHeight: 'var(--leading-relaxed)',
        }}>
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị viên nếu bạn cần hỗ trợ.
        </p>
        <a 
          href="/" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-5)',
            backgroundColor: 'var(--color-green-deep)',
            color: 'white',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: '500',
            textDecoration: 'none',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          Quay về trang chủ
        </a>
      </div>
    </div>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-ivory)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--color-border)',
          borderTopColor: 'var(--color-green-medium)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          color: 'var(--color-charcoal-muted)',
          fontSize: 'var(--text-sm)',
        }}>
          Đang tải...
        </p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function RouteGuard({ children, allowedRoles }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles is specified, check role authorization
  if (allowedRoles && !allowedRoles.includes(role)) {
    // User is authenticated but wrong role - show access denied
    return <AccessDeniedPage />;
  }

  // Authorized - render children
  return children;
}

export default RouteGuard;
