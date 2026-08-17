import Modal from './Modal';
import Button from './Button';

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'primary',
  loading = false,
}) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-charcoal-light)' }}>{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
