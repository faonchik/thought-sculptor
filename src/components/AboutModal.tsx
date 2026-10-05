import { X, Waves, Box, Printer } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-titles">
            <span className="modal-category">ПРИНЦИП РАБОТЫ И АЛГОРИТМЫ</span>
            <h2 id="modal-title" className="modal-title">Как устроен Thought Sculptor</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Закрыть окно"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-lead">
            <strong>Thought Sculptor</strong> — это система параметрического 3D-морфогенеза,
            которая переводит акустические свойства человеческого голоса в физически точную цифровую скульптуру,
            готовую к печати на 3D-принтере.
          </p>

          <div className="algo-grid">
            <div className="algo-card">
              <div className="algo-card-header">
                <Waves size={18} className="algo-icon" />
                <h3 className="algo-title">1. Захват и анализ звука (DSP)</h3>
              </div>
              <p className="algo-text">
                Через Web Audio API сигнал опрашивается с частотой 48 кГц и окном FFT 2048 точек.
                Алгоритм автокорреляции рассчитывает основной тон ($F_0$ в диапазоне 60–500 Гц),
                а также спектральный центроид (яркость тембра) и спектральный поток (динамику мутаций).
              </p>
            </div>

            <div className="algo-card">
              <div className="algo-card-header">
                <Box size={18} className="algo-icon" />
                <h3 className="algo-title">2. Деформация 3D-сетки (Three.js)</h3>
              </div>
              <p className="algo-text">
                Базовая форма — икосаэдрическая сфера (2562 вершины, 5120 треугольных граней).
                Каждая вершина смещается вдоль нормали по закону:
                <code>P' = P + N · f(RMS, F0, Centroid, Noise(P))</code>.
                Высокий тон вытягивает вертикальные шпили, а бас расширяет опору.
              </p>
            </div>

            <div className="algo-card">
              <div className="algo-card-header">
                <Printer size={18} className="algo-icon" />
                <h3 className="algo-title">3. Экспорт в STL для 3D-печати</h3>
              </div>
              <p className="algo-text">
                Сгенерированный меш валидируется на замкнутость (manifold geometry) и экспортируется
                в стандартный формат STL. Файл напрямую открывается в слайсерах
                (Bambu Studio, PrusaSlicer, Cura) для создания материального артефакта.
              </p>
            </div>
          </div>

          <div className="modal-footer-specs">
            <div className="footer-spec-item">
              <span className="spec-name">Стек:</span>
              <span className="spec-val">React 19, TypeScript, Three.js, Web Audio API</span>
            </div>
            <div className="footer-spec-item">
              <span className="spec-name">Точность:</span>
              <span className="spec-val">FFT 2048, 60 FPS WebGL Render</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
