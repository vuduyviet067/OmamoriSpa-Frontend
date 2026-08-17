function LoadingState({ message = 'Đang tải...' }) {
  return (
    <div className="loading-overlay">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p>{message}</p>
    </div>
  );
}

export default LoadingState;
