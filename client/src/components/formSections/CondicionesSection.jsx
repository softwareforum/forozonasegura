import React from 'react';
import { CHECK_IN_OUT_OPTIONS, CLEANING_FREQUENCY_OPTIONS } from '../../constants/postFormOptions';

const CondicionesSection = ({ checkInOut, depositRequired, cleaningFrequency, onChange, onDepositChange }) => {
  return (
    <section className="form-section">
      <h2 className="form-section-title">Condiciones</h2>
      
      <div className="form-group">
        <label className="form-label">Horario de entrada y salida *</label>
        <select
          name="checkInOut"
          className="form-select"
          value={checkInOut}
          onChange={onChange}
          required
        >
          <option value="">Selecciona una opción</option>
          {CHECK_IN_OUT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">¿Se requiere depósito? *</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="depositRequired"
              value="true"
              checked={depositRequired === true}
              onChange={(e) => onDepositChange(e.target.value === 'true')}
              required
            />
            <span>Sí</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="depositRequired"
              value="false"
              checked={depositRequired === false}
              onChange={() => onDepositChange(false)}
            />
            <span>No</span>
          </label>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Frecuencia de limpieza *</label>
        <select
          name="cleaningFrequency"
          className="form-select"
          value={cleaningFrequency}
          onChange={onChange}
          required
        >
          <option value="">Selecciona una opción</option>
          {CLEANING_FREQUENCY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
};

export default CondicionesSection;

