import { Code } from 'lucide-react';
import './Watermark.css';

const Watermark = () => {
  return (
    <div className="watermark-badge">
      <Code className="watermark-icon" size={14} />
      <span className="watermark-text">
        Devs:{' '}
        <a href="https://github.com/anshdhariwal" target="_blank" rel="noopener noreferrer" className="watermark-link">@anshdhariwal</a>
        {' & '}
        <a href="https://github.com/jigyasaphogat" target="_blank" rel="noopener noreferrer" className="watermark-link">@jigyasaphogat</a>
      </span>
      <svg
        className="watermark-icon"
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
      >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    </div>
  );
};

export default Watermark;
