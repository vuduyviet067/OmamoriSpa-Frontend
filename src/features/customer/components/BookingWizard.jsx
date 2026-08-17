import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Image,
  Input,
  Select,
  LoadingState,
  ErrorState,
} from '@/components/common';
import {
  getServices,
  getTherapists,
  getRooms,
  getAvailableTimeSlots,
  createAppointment,
  updateAppointment,
  isConflictError,
  DEFAULT_TIME_SLOTS,
} from '@/services/customerService';
import { formatCurrency, formatDuration } from '@/utils/formatters';

const STEPS = [
  { id: 1, label: 'Chọn dịch vụ' },
  { id: 2, label: 'Chọn kỹ thuật viên' },
  { id: 3, label: 'Chọn phòng & thời gian' },
  { id: 4, label: 'Xác nhận' },
];

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const formatDateVN = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const extractId = (obj) => obj?.id ?? obj?._id ?? obj?.value ?? '';

function StepIndicator({ currentStep }) {
  return (
    <ol className="booking-stepper" aria-label="Tiến trình đặt lịch">
      {STEPS.map((step, idx) => {
        const isDone = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <li
            key={step.id}
            className={`booking-stepper-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
          >
            <div className="booking-stepper-circle" aria-hidden="true">
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <span className="booking-stepper-number">{step.id}</span>
              )}
            </div>
            <span className="booking-stepper-label">{step.label}</span>
            {idx < STEPS.length - 1 && (
              <div className="booking-stepper-connector" aria-hidden="true">
                <div className="booking-stepper-line" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ServiceStep({ services, loading, error, selectedId, onSelect, onRetry }) {
  if (loading) return <LoadingState message="Đang tải danh sách dịch vụ..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return (
    <div className="booking-grid booking-grid-services">
      {services.map((service) => {
        const id = extractId(service);
        const selected = String(selectedId) === String(id);
        return (
          <button
            key={id}
            type="button"
            className={`booking-card ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(service)}
            aria-pressed={selected}
          >
            <div className="booking-card-image">
              <Image
                src={service.image || service.imageUrl}
                alt={service.name}
                type="service"
              />
            </div>
            <div className="booking-card-body">
              <div className="booking-card-title">{service.name}</div>
              <div className="booking-card-meta">
                <span>{formatDuration(service.duration || service.durationMinutes || 60)}</span>
                <span className="booking-card-price">{formatCurrency(service.price)}</span>
              </div>
              {service.description && (
                <p className="booking-card-desc">{service.description}</p>
              )}
            </div>
            {selected && (
              <span className="booking-card-check" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function TherapistStep({ therapists, loading, error, selectedId, onSelect, onRetry }) {
  if (loading) return <LoadingState message="Đang tải danh sách kỹ thuật viên..." />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!therapists || therapists.length === 0) {
    return (
      <div className="booking-empty">
        <p>Hiện chưa có kỹ thuật viên khả dụng cho dịch vụ này.</p>
      </div>
    );
  }
  return (
    <div className="booking-grid booking-grid-therapists">
      {therapists.map((t) => {
        const id = extractId(t);
        const selected = String(selectedId) === String(id);
        const name = t.name || t.fullName || 'Kỹ thuật viên';
        const specialty = t.specialty || t.specialization || t.expertise || 'Spa trị liệu';
        return (
          <button
            key={id}
            type="button"
            className={`booking-card booking-card-therapist ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(t)}
            aria-pressed={selected}
          >
            <div className="booking-card-avatar">
              <Image
                src={t.avatar || t.avatarUrl || t.image}
                alt={name}
                type="person"
              />
            </div>
            <div className="booking-card-body">
              <div className="booking-card-title">{name}</div>
              <div className="booking-card-meta booking-card-meta-single">
                <span>{specialty}</span>
              </div>
            </div>
            {selected && (
              <span className="booking-card-check" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RoomTimeStep({
  rooms,
  roomsLoading,
  roomsError,
  onRetryRooms,
  selectedRoomId,
  onSelectRoom,
  date,
  time,
  onDateChange,
  onTimeChange,
  timeSlots,
  loadingTimeSlots,
}) {
  return (
    <div className="booking-room-time">
      <div className="booking-section">
        <h3 className="booking-section-title">Chọn phòng</h3>
        {roomsLoading ? (
          <LoadingState message="�ang tải phòng..." />
        ) : roomsError ? (
          <ErrorState message={roomsError} onRetry={onRetryRooms} />
        ) : !rooms || rooms.length === 0 ? (
          <div className="booking-empty">
            <p>Chưa có phòng khả dụng cho lựa chọn này.</p>
          </div>
        ) : (
          <div className="booking-grid booking-grid-rooms">
            {rooms.map((room) => {
              const id = extractId(room);
              const selected = String(selectedRoomId) === String(id);
              const type = room.type || room.roomType || 'Phòng';
              const price = room.price ?? room.roomPrice ?? null;
              return (
                <button
                  key={id}
                  type="button"
                  className={`booking-card booking-card-room ${selected ? 'is-selected' : ''}`}
                  onClick={() => onSelectRoom(room)}
                  aria-pressed={selected}
                >
                  <div className="booking-card-icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="booking-card-body">
                    <div className="booking-card-title">{room.name || `Phòng ${id}`}</div>
                    <div className="booking-card-meta booking-card-meta-single">
                      <span>Loại: {type}</span>
                    </div>
                    {price !== null && price !== undefined && (
                      <div className="booking-card-price">{formatCurrency(price)}</div>
                    )}
                  </div>
                  {selected && (
                    <span className="booking-card-check" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="booking-section">
        <h3 className="booking-section-title">Chọn ngày & giờ</h3>
        <div className="booking-datetime">
          <Input
            type="date"
            label="Ngày"
            value={date}
            min={todayISO()}
            onChange={(e) => onDateChange(e.target.value)}
            required
          />
          <Select
            label="Khung giờ"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            disabled={!date || loadingTimeSlots}
            options={(timeSlots || DEFAULT_TIME_SLOTS).map((slot) => ({
              value: slot,
              label: loadingTimeSlots ? 'Đang tải...' : slot,
            }))}
            placeholder="Chọn khung giờ"
          />
        </div>
      </div>
    </div>
  );
}

function SummaryStep({ data, service, therapist, room }) {
  return (
    <div className="booking-summary">
      <div className="booking-summary-row">
        <span className="booking-summary-label">Dịch vụ</span>
        <span className="booking-summary-value">{service?.name || '-'}</span>
      </div>
      <div className="booking-summary-row">
        <span className="booking-summary-label">Thời lượng</span>
        <span className="booking-summary-value">
          {formatDuration(service?.duration || service?.durationMinutes || 60)}
        </span>
      </div>
      <div className="booking-summary-row">
        <span className="booking-summary-label">Kỹ thuật viên</span>
        <span className="booking-summary-value">{therapist?.name || '-'}</span>
      </div>
      <div className="booking-summary-row">
        <span className="booking-summary-label">Phòng</span>
        <span className="booking-summary-value">
          {room?.name || '-'}
          {room?.type && <small> · {room.type}</small>}
        </span>
      </div>
      <div className="booking-summary-row">
        <span className="booking-summary-label">Ngày giờ</span>
        <span className="booking-summary-value">
          {data.date ? formatDateVN(data.date) : '-'}
          {data.time && ` · ${data.time}`}
        </span>
      </div>
      <div className="booking-summary-row booking-summary-total">
        <span className="booking-summary-label">Chi phí dự kiến</span>
        <span className="booking-summary-value booking-summary-price">
          {formatCurrency(service?.price || 0)}
        </span>
      </div>
    </div>
  );
}

function BookingWizard({
  mode = 'create',
  initialAppointment = null,
  onSuccess,
}) {
  const navigate = useNavigate();
  const isEdit = mode === 'edit';

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [conflictMessage, setConflictMessage] = useState(null);

  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState(null);

  const [therapists, setTherapists] = useState([]);
  const [therapistsLoading, setTherapistsLoading] = useState(false);
  const [therapistsError, setTherapistsError] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState(null);

  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);

  const initialServiceId = initialAppointment?.service?.id
    ?? initialAppointment?.serviceId
    ?? initialAppointment?.service?.id
    ?? '';
  const initialTherapistId = initialAppointment?.therapistId
    ?? initialAppointment?.therapist?.id
    ?? '';
  const initialRoomId = initialAppointment?.roomId
    ?? initialAppointment?.room?.id
    ?? '';
  const initialDate = initialAppointment?.date
    ? (initialAppointment.date.length > 10
      ? initialAppointment.date.split('T')[0]
      : initialAppointment.date)
    : '';
  const initialTime = initialAppointment?.startTime
    ? String(initialAppointment.startTime).substring(0, 5)
    : '';

  const [selectedService, setSelectedService] = useState(null);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  const [formData, setFormData] = useState({
    serviceId: initialServiceId ? String(initialServiceId) : '',
    therapistId: initialTherapistId ? String(initialTherapistId) : '',
    roomId: initialRoomId ? String(initialRoomId) : '',
    date: initialDate,
    time: initialTime,
  });

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const list = await getServices();
      setServices(list);
      if (initialServiceId) {
        const found = list.find((s) => String(extractId(s)) === String(initialServiceId));
        if (found) setSelectedService(found);
      }
    } catch (err) {
      console.error('Error loading services:', err);
      setServicesError('Không thể tải danh sách dịch vụ. Vui lòng thử lại.');
    } finally {
      setServicesLoading(false);
    }
  }, [initialServiceId]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // When entering step 2, load therapists.
  const loadTherapists = useCallback(async () => {
    setTherapistsLoading(true);
    setTherapistsError(null);
    try {
      const list = await getTherapists({
        serviceId: formData.serviceId || undefined,
        date: formData.date || undefined,
      });
      setTherapists(list);
      if (formData.therapistId) {
        const found = list.find((t) => String(extractId(t)) === String(formData.therapistId));
        if (found) setSelectedTherapist(found);
      }
    } catch (err) {
      console.error('Error loading therapists:', err);
      setTherapistsError('Không thể tải danh sách kỹ thuật viên. Vui lòng thử lại.');
    } finally {
      setTherapistsLoading(false);
    }
  }, [formData.serviceId, formData.date, formData.therapistId]);

  useEffect(() => {
    if (step === 2) loadTherapists();
  }, [step, loadTherapists]);

  // When entering step 3, load rooms and time slots.
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const list = await getRooms({
        serviceId: formData.serviceId || undefined,
        date: formData.date || undefined,
        therapistId: formData.therapistId || undefined,
      });
      setRooms(list);
      if (formData.roomId) {
        const found = list.find((r) => String(extractId(r)) === String(formData.roomId));
        if (found) setSelectedRoom(found);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setRoomsError('Không thể tải danh sách phòng. Vui lòng thử lại.');
    } finally {
      setRoomsLoading(false);
    }
  }, [formData.serviceId, formData.date, formData.therapistId, formData.roomId]);

  const loadTimeSlots = useCallback(async () => {
    if (!formData.date) {
      setTimeSlots(DEFAULT_TIME_SLOTS);
      return;
    }
    setLoadingTimeSlots(true);
    try {
      const slots = await getAvailableTimeSlots({
        date: formData.date,
        serviceId: formData.serviceId || undefined,
        therapistId: formData.therapistId || undefined,
        roomId: formData.roomId || undefined,
      });
      setTimeSlots(slots);
    } finally {
      setLoadingTimeSlots(false);
    }
  }, [formData.date, formData.serviceId, formData.therapistId, formData.roomId]);

  useEffect(() => {
    if (step === 3) {
      loadRooms();
      loadTimeSlots();
    }
  }, [step, loadRooms, loadTimeSlots]);

  const handleSelectService = (service) => {
    setSelectedService(service);
    const id = String(extractId(service));
    setFormData((prev) => ({ ...prev, serviceId: id }));
    setConflictMessage(null);
    setGlobalError(null);
  };

  const handleSelectTherapist = (t) => {
    setSelectedTherapist(t);
    const id = String(extractId(t));
    setFormData((prev) => ({ ...prev, therapistId: id }));
    setConflictMessage(null);
    setGlobalError(null);
  };

  const handleSelectRoom = (r) => {
    setSelectedRoom(r);
    const id = String(extractId(r));
    setFormData((prev) => ({ ...prev, roomId: id }));
    setConflictMessage(null);
    setGlobalError(null);
  };

  const handleDateChange = (val) => {
    setDate(val);
    setFormData((prev) => ({ ...prev, date: val, time: '' }));
    setConflictMessage(null);
    setGlobalError(null);
    // refresh time slots whenever date changes
    setTimeout(loadTimeSlots, 0);
  };

  const handleTimeChange = (val) => {
    setTime(val);
    setFormData((prev) => ({ ...prev, time: val }));
    setConflictMessage(null);
    setGlobalError(null);
  };

  const canGoNext = useMemo(() => {
    if (step === 1) return !!formData.serviceId;
    if (step === 2) return !!formData.therapistId;
    if (step === 3) return !!formData.roomId && !!formData.date && !!formData.time;
    return true;
  }, [step, formData]);

  const handleNext = () => {
    setConflictMessage(null);
    setGlobalError(null);
    if (!canGoNext) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setConflictMessage(null);
    setGlobalError(null);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setConflictMessage(null);
    setGlobalError(null);
    const payload = {
      serviceId: formData.serviceId,
      therapistId: formData.therapistId,
      roomId: formData.roomId,
      date: formData.date,
      startTime: formData.time,
    };
    try {
      let saved;
      if (isEdit && initialAppointment?.id) {
        saved = await updateAppointment(initialAppointment.id, payload);
      } else {
        saved = await createAppointment(payload);
      }
      if (onSuccess) {
        onSuccess(saved);
      } else {
        navigate('/customer/appointments');
      }
    } catch (err) {
      console.error('Error saving appointment:', err);
      if (isConflictError(err)) {
        // Inline conflict message - keep current selections
        setConflictMessage(
          'Khung giờ hoặc kỹ thuật viên đã có lịch bận, vui lòng chọn thời gian khác.'
        );
        setStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const message = err.response?.data?.message || err.message
          || 'Không thể lưu lịch hẹn. Vui lòng thử lại.';
        setGlobalError(message);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/customer/appointments" className="back-to-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại
      </Link>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
          {isEdit ? 'Chỉnh sửa lịch hẹn' : 'Đặt lịch mới'}
        </h1>
        <p style={{ color: 'var(--color-charcoal-muted)', marginBottom: 0 }}>
          {isEdit
            ? 'Cập nhật thông tin cho lịch hẹn đang chờ xác nhận.'
            : 'Hoàn tất các bước dưới đây để đặt lịch trải nghiệm dịch vụ tại Omamori.'}
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {globalError && (
        <div className="booking-alert booking-alert-error" role="alert">
          <strong>Đã xảy ra lỗi:</strong> {globalError}
        </div>
      )}
      {conflictMessage && (
        <div className="booking-alert booking-alert-warning" role="alert">
          {conflictMessage}
        </div>
      )}

      <div className="booking-step-content">
        {step === 1 && (
          <ServiceStep
            services={services}
            loading={servicesLoading}
            error={servicesError}
            selectedId={formData.serviceId}
            onSelect={handleSelectService}
            onRetry={loadServices}
          />
        )}
        {step === 2 && (
          <TherapistStep
            therapists={therapists}
            loading={therapistsLoading}
            error={therapistsError}
            selectedId={formData.therapistId}
            onSelect={handleSelectTherapist}
            onRetry={loadTherapists}
          />
        )}
        {step === 3 && (
          <RoomTimeStep
            rooms={rooms}
            roomsLoading={roomsLoading}
            roomsError={roomsError}
            onRetryRooms={loadRooms}
            selectedRoomId={formData.roomId}
            onSelectRoom={handleSelectRoom}
            date={date}
            time={time}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            timeSlots={timeSlots}
            loadingTimeSlots={loadingTimeSlots}
          />
        )}
        {step === 4 && (
          <SummaryStep
            data={formData}
            service={selectedService}
            therapist={selectedTherapist}
            room={selectedRoom}
          />
        )}
      </div>

      <div className="booking-actions">
        {step > 1 ? (
          <Button variant="ghost" onClick={handleBack} disabled={submitting}>
            Quay lại
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/customer/appointments')} disabled={submitting}>
            Hủy
          </Button>
        )}
        {step < STEPS.length && (
          <Button onClick={handleNext} disabled={!canGoNext}>
            Tiếp tục
          </Button>
        )}
        {step === STEPS.length && (
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>
            {submitting
              ? (isEdit ? 'Đang cập nhật...' : 'Đang đặt lịch...')
              : (isEdit ? 'Xác nhận cập nhật' : 'Xác nhận đặt lịch')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
