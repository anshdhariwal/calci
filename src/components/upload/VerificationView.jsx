import { FaArrowLeft, FaInfoCircle, FaSearchPlus, FaSearchMinus, FaUndo } from 'react-icons/fa';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import ManualEntry from '../../pages/ManualEntry';
import './VerificationView.css';
// Let's reuse components from ManualEntry or copy logic.
// For now, let's just make it a wrapper that looks like the mockup.

const VerificationView = ({ imageUrl, extractedData, onBack, onSgpaChange }) => {
  return (
    <div className="verify-shell glass">
      <div className="verify-grid">
      
      {/* Image Viewer Section */}
      <div className="verify-left">
        <div className="verify-panel">
          <div className="verify-panel-header">
            <h4 className="verify-panel-title">Original Screenshot</h4>
            <div className="verify-panel-actions">
              <button className="btn outline small" onClick={onBack} title="Retake" aria-label="Retake">
                <FaArrowLeft />
              </button>
            </div>
          </div>

          <div className="verify-image-frame">
            <TransformWrapper initialScale={1} initialPositionX={0} initialPositionY={0}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="zoom-controls">
                    <button className="icon-btn zoom" onClick={() => zoomIn()} aria-label="Zoom in"><FaSearchPlus /></button>
                    <button className="icon-btn zoom" onClick={() => zoomOut()} aria-label="Zoom out"><FaSearchMinus /></button>
                    <button className="icon-btn zoom" onClick={() => resetTransform()} aria-label="Reset zoom"><FaUndo /></button>
                  </div>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                    <img
                      src={imageUrl}
                      alt="Uploaded Result"
                      className="verify-image"
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      </div>

      {/* Right Column: Editable Table */}
      <div className="verify-right">
        <div className="verify-banner">
          <strong>Detected {extractedData.length} Subjects</strong>. Please verify the checkbox for each correct row.
        </div>
        <div className="verify-right-scroll hide-scrollbar">
          <ManualEntry
            initialData={extractedData}
            isVerificationMode={true}
            onSgpaChange={onSgpaChange}
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export default VerificationView;
