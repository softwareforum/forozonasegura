import React from 'react';
import { SERVICIOS_OPTIONS } from '../../constants/postFormOptions';

const ServiciosCaracteristicasSection = ({ servicios, onChange }) => {
  return (
    <section className="form-section">
      <h2 className="form-section-title">Servicios y características del espacio</h2>
      
      <div className="checkbox-grid">
        {SERVICIOS_OPTIONS.map(servicio => (
          <label key={servicio.key} className="checkbox-label">
            <input
              type="checkbox"
              name={`servicios.${servicio.key}`}
              checked={servicios[servicio.key] || false}
              onChange={onChange}
            />
            <span>{servicio.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
};

export default ServiciosCaracteristicasSection;

