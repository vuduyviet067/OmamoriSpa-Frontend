import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BookingWizard from '../components/BookingWizard';
import useFlashMessage from '@/hooks/useFlashMessage';

function NewAppointment() {
  const navigate = useNavigate();
  const location = useLocation();
  const flash = useFlashMessage();
  const successShownRef = useRef(false);

  useEffect(() => {
    if (location.state?.booked && !successShownRef.current) {
      flash.show('Đặt lịch thành công! Lịch h�n đang ở trạng thái Chờ xác nhận.');
      successShownRef.current = true;
      // Clear location.state so refresh doesn't re-toast.
      window.history.replaceState({}, document.title, location.pathname);
    }
    // Only re-run when navigation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSuccess = () => {
    navigate('/customer/appointments', {
      state: { booked: true },
      replace: true,
    });
  };

  return (
    <div>
      {flash.message && (
        <div className="booking-alert booking-alert-success" role="status">
          {flash.message}
        </div>
      )}
      <BookingWizard mode="create" onSuccess={handleSuccess} />
    </div>
  );
}

export default NewAppointment;
