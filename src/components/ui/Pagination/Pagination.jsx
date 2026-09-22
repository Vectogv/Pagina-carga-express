import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button/Button';
import './Pagination.css';

export default function Pagination({ page, totalPages, total, onChange }) {
  const pages = Math.max(1, totalPages || 1);
  return (
    <div className="pagination">
      <span className="pagination__info">
        {typeof total === 'number' ? `${total.toLocaleString('es-CO')} registros` : ''}
      </span>
      <div className="pagination__controls">
        <Button variant="ghost" size="icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">
          <ChevronLeft size={16} />
        </Button>
        <span className="pagination__page">{page} / {pages}</span>
        <Button variant="ghost" size="icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Página siguiente">
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
