import React from 'react';
import { 
  ANFITRION_VICIOS_OPTIONS, 
  ANFITRION_ACOSO_OPTIONS, 
  ANFITRION_CARACTER_OPTIONS 
} from '../../constants/postFormOptions';

const ConvivenciaSection = ({ anfitrion, onChange }) => {
  return (
    <section className="form-section">
      <h2 className="form-section-title">Convivencia y anfitrión</h2>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">¿El anfitrión tiene vicios?</label>
          <select
            name="anfitrion.tieneVicios"
            className="form-select"
            value={anfitrion.tieneVicios}
            onChange={onChange}
          >
            {ANFITRION_VICIOS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">¿Ha habido acoso?</label>
          <select
            name="anfitrion.acoso"
            className="form-select"
            value={anfitrion.acoso}
            onChange={onChange}
          >
            {ANFITRION_ACOSO_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Carácter del anfitrión</label>
        <select
          name="anfitrion.caracter"
          className="form-select"
          value={anfitrion.caracter}
          onChange={onChange}
        >
          {ANFITRION_CARACTER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
};

export default ConvivenciaSection;

