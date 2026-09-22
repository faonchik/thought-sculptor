import React from 'react';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-category">ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ</span>
            <h2 id="modal-title" className="modal-title">Архитектура и алгоритмы проекта</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Закрыть модальное окно">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-lead">
            <strong>Thought Sculptor</strong> — это интерактивная исследовательская система, 
            исследующая параметрический синтез трехмерных геометрических форм на основе 
            акустического анализа речевого сигнала в реальном времени.
          </p>

          <div className="algo-section">
            <h3 className="algo-title">1. Цифровая обработка сигналов (DSP)</h3>
            <p>
              Аудиопоток захватывается через Web Audio API с отключенными фильтрами шумоподавления и АРУ для сохранения естественного динамического диапазона. Анализ осуществляется в реальном времени с частотой дискретизации 44.1/48 кГц:
            </p>
            <ul className="algo-list">
              <li>
                <strong>Основной тон ($F_0$ / Pitch):</strong> вычисляется автокорреляционным методом во временной области в диапазоне 60–500 Гц. Модулирует вертикальную вытянутость и главные гребни формы.
              </li>
              <li>
                <strong>Спектральный центроид:</strong> расчет «центра масс» спектра мощности. Определяет высокочастотную детализацию и плотность ступенчатых террас.
              </li>
              <li>
                <strong>Спектральный поток (Spectral Flux):</strong> евклидово расстояние между соседними спектральными фреймами. Управляет неоднородностью и глубиной микрорельефа.
              </li>
              <li>
                <strong>Энергия в частотных полосах:</strong> разделение на НЧ (массивность ядра), СЧ (объем тела) и ВЧ (тонкие шероховатости).
              </li>
            </ul>
          </div>

          <div className="algo-section">
            <h3 className="algo-title">2. Процедурный морфогенез (Three.js)</h3>
            <p>
              В основе 3D-модели лежит сферический каркас (субдивизия икосаэдра, 2562 вершины, 5120 полигонов). При поступлении аудиокадров алгоритм производит:
            </p>
            <ul className="algo-list">
              <li>Смещение координат вершин вдоль вектора нормали с использованием многооктавного 3D-шума Перлина (Simplex Noise).</li>
              <li>Динамический расчет деформаций: $P' = P + N \cdot f(RMS, F_0, Centroid, Noise(P))$.</li>
              <li>Асинхронный пересчет векторов нормалей граней (<code>computeVertexNormals</code>) для корректного физического освещения.</li>
            </ul>
          </div>

          <div className="algo-section">
            <h3 className="algo-title">3. Аддитивное производство и экспорт в STL</h3>
            <p>
              Сформированная модель верифицируется на замкнутость (manifold mesh) и сериализуется в бинарный или текстовый формат <strong>STL</strong> (Stereolithography). Файл готов к прямой загрузке в любой слайсер (Cura, PrusaSlicer, Bambu Studio) для физической печати на 3D-принтере.
            </p>
          </div>

          <div className="modal-footer-specs">
            <div className="footer-spec-item">
              <span className="spec-name">Стек:</span>
              <span className="spec-val">React 19, TypeScript, Three.js, Web Audio API, Vite</span>
            </div>
            <div className="footer-spec-item">
              <span className="spec-name">Точность:</span>
              <span className="spec-val">FFT 2048, 60 FPS Canvas & WebGL Render</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
