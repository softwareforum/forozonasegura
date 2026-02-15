import React from 'react';

const ExperienciaGeneralSection = ({ experiencia, onChange }) => {
  return (
    <section className="form-section">
      <h2 className="form-section-title">Experiencia General</h2>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            Confort (1-5): {experiencia.confort}
          </label>
          <input
            type="range"
            name="experiencia.confort"
            min="1"
            max="5"
            value={experiencia.confort}
            onChange={onChange}
            className="form-range"
          />
          <div className="range-labels">
            <span>1 - Muy bajo</span>
            <span>5 - Excelente</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Seguridad Percibida (1-5): {experiencia.seguridadPercibida}
          </label>
          <input
            type="range"
            name="experiencia.seguridadPercibida"
            min="1"
            max="5"
            value={experiencia.seguridadPercibida}
            onChange={onChange}
            className="form-range"
          />
          <div className="range-labels">
            <span>1 - Muy baja</span>
            <span>5 - Muy alta</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienciaGeneralSection;
