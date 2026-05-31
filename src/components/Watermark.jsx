import { FaCode, FaGithub } from 'react-icons/fa';
import './Watermark.css';

const Watermark = () => {
  return (
    <div className="watermark-badge">
      <FaCode className="watermark-icon" />
      <span className="watermark-text">
        Devs:{' '}
        <a href="https://github.com/anshdhariwal" target="_blank" rel="noopener noreferrer" className="watermark-link">@anshdhariwal</a>
        {' & '}
        <a href="https://github.com/jigyasaphogat" target="_blank" rel="noopener noreferrer" className="watermark-link">@jigyasaphogat</a>
      </span>
      <FaGithub className="watermark-icon" />
    </div>
  );
};

export default Watermark;
