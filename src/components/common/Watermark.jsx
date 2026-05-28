import { FaCode, FaGithub } from 'react-icons/fa';
import './Watermark.css';

const Watermark = () => {
  return (
    <a
      href="https://github.com/anshdhariwal"
      target="_blank"
      rel="noopener noreferrer"
      className="watermark-badge"
    >
      <FaCode className="watermark-icon" />
      <span className="watermark-text">Dev @anshdhariwal</span>
      <FaGithub className="watermark-icon" />
    </a>
  );
};

export default Watermark;
