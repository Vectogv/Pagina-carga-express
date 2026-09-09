const theme = {
  bg: '#020208',
  sidebar: '#070a12',
  cards: '#0f1220',
  accent: '#6366f1',
  text: '#e2e8f0',
  muted: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  border: '#1e2238',
};

const styles = {
  wrapper: {
    backgroundColor: theme.cards,
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
  },
  scrollContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: theme.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: `1px solid ${theme.border}`,
    backgroundColor: `${"#020208"}80`,
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
  },
  td: {
    padding: '14px 20px',
    fontSize: 13,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: 'nowrap',
  },
  trOdd: {
    backgroundColor: 'transparent',
  },
  trEven: {
    backgroundColor: `${"#020208"}40`,
  },
  emptyState: {
    padding: 60,
    textAlign: 'center',
    color: theme.muted,
    fontSize: 13,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    margin: 0,
    fontSize: 15,
    fontWeight: 500,
  },
  emptySubtext: {
    margin: '8px 0 0',
    fontSize: 13,
    color: `${theme.muted}90`,
  },
  skeletonRow: {
    display: 'flex',
    gap: 14,
    padding: '14px 20px',
    borderBottom: `1px solid ${theme.border}`,
  },
  skeletonCell: {
    height: 16,
    borderRadius: 4,
    backgroundColor: `${theme.border}80`,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

const skeletonKeyframes = `
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
`;

function SkeletonRows({ columns, rows = 5 }) {
  const widths = ['90%', '75%', '60%', '80%', '70%', '55%'];

  return (
    <>
      <style>{skeletonKeyframes}</style>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} style={styles.skeletonRow}>
          {columns.map((col, colIdx) => (
            <div
              key={col.key}
              style={{
                ...styles.skeletonCell,
                width: widths[colIdx % widths.length],
                flex: 1,
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function DataTable({ columns, data, loading, emptyMessage, onRowClick }) {
  if (loading) {
    return (
      <div style={styles.wrapper}>
        <SkeletonRows columns={columns} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <p style={styles.emptyText}>{emptyMessage || 'No hay datos disponibles'}</p>
          <p style={styles.emptySubtext}>Los datos aparecerán aquí cuando estén disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.scrollContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={styles.th}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                style={
                  rowIdx % 2 === 0 ? styles.trEven : styles.trOdd
                }
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${theme.accent}10`;
                  if (onRowClick) e.currentTarget.style.cursor = 'pointer';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    rowIdx % 2 === 0 ? `${"#020208"}40` : 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={styles.td}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
