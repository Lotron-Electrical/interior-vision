import { useState } from 'react';
import type { RestyledImage } from '../types';

interface Props {
  gallery: RestyledImage[];
}

export default function RestyledGallery({ gallery }: Props) {
  const [selected, setSelected] = useState<RestyledImage | null>(null);

  if (gallery.length === 0) {
    return (
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center' }}>
        No redesigned views yet. Select a style and click "Redesign This View" to get started.
      </p>
    );
  }

  return (
    <>
      <div className="gallery">
        {gallery.map(item => (
          <div
            key={item.id}
            className="gallery__item"
            onClick={() => setSelected(item)}
          >
            <img src={item.restyledDataUrl} alt={`${item.styleName} redesign`} />
            <div className="gallery__item-info">
              <span className="gallery__item-style">{item.styleName}</span>
              <span className="gallery__item-time">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Before & After — {selected.styleName}</h2>
              <button className="btn btn--ghost btn--sm" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <div className="modal__body">
              <div className="modal__comparison">
                <div className="modal__comparison-panel">
                  <h4>Original View</h4>
                  <img src={selected.originalDataUrl} alt="Original" />
                </div>
                <div className="modal__comparison-panel">
                  <h4>{selected.styleName} Redesign</h4>
                  <img src={selected.restyledDataUrl} alt="Restyled" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
