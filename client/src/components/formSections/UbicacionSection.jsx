import React from 'react';
import { PROVINCIAS } from '../../constants/postFormOptions';

const UbicacionSection = ({ provincia, onChange }) => {
  return (
    <section className="form-section">
      <h2 className="form-section-title">Ubicación</h2>
      
      <div className="form-group">
        <label className="form-label">Provincia *</label>
        <select
          name="provincia"
          className="form-select"
          value={provincia}
          onChange={onChange}
          required
        >
          <option value="">Selecciona una provincia</option>
          {PROVINCIAS.map(prov => (
            <option key={prov} value={prov}>{prov}</option>
          ))}
        </select>
      </div>
    </section>
  );
};

export default UbicacionSection;

