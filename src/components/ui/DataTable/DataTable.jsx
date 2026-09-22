import { Inbox } from 'lucide-react';
import './DataTable.css';

const SKELETON_WIDTHS = ['80%', '65%', '50%', '72%', '58%', '44%'];
const defaultRowKey = (row, i) => row.id ?? row._id ?? i;

/**
 * Tabla estándar del panel.
 * columns: [{ key, label, render?(value, row), align?: 'left' | 'right' | 'center' }]
 */
export default function DataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  emptyDescription = 'Los registros aparecerán aquí cuando existan.',
  onRowClick,
  rowKey = defaultRowKey,
  footer = null,
}) {
  if (loading) {
    return (
      <div className="dtable" aria-busy="true">
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="dtable__skeleton-row">
            {columns.map((c, i) => (
              <div key={c.key} className="dtable__skeleton-cell" style={{ maxWidth: SKELETON_WIDTHS[(i + r) % SKELETON_WIDTHS.length] }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="dtable">
        <div className="dtable__empty">
          <div className="dtable__empty-icon"><Inbox size={20} /></div>
          <p className="dtable__empty-title">{emptyMessage}</p>
          {emptyDescription && <p className="dtable__empty-text">{emptyDescription}</p>}
        </div>
        {footer && <div className="dtable__footer">{footer}</div>}
      </div>
    );
  }

  return (
    <div className="dtable">
      <div className="dtable__scroll">
        <table className="dtable__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={`dtable__th ${col.align ? `dtable__th--${col.align}` : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className={`dtable__row ${onRowClick ? 'dtable__row--clickable' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`dtable__td ${col.align ? `dtable__td--${col.align}` : ''}`}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="dtable__footer">{footer}</div>}
    </div>
  );
}
