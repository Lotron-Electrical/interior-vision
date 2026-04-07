import type { DesignStyle } from '../types';

interface Props {
  styles: DesignStyle[];
  selectedStyle: string | null;
  onSelect: (styleId: string) => void;
}

export default function StyleSelector({ styles, selectedStyle, onSelect }: Props) {
  return (
    <div className="style-grid">
      {styles.map(style => (
        <button
          key={style.id}
          className={`style-card ${selectedStyle === style.id ? 'style-card--selected' : ''}`}
          onClick={() => onSelect(style.id)}
        >
          <div className="style-card__name">{style.name}</div>
          <div className="style-card__desc">{style.description}</div>
        </button>
      ))}
    </div>
  );
}
