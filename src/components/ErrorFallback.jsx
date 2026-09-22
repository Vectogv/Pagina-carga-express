export default function ErrorFallback() {
  return (
  <div style={{ height: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>Algo salió mal</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Ocurrió un error inesperado. Ya fue reportado al equipo.</p>
      <button type="button" className="btn btn--primary btn--md" onClick={() => window.location.reload()}>Recargar</button>
    </div>
  </div>
  );
}
