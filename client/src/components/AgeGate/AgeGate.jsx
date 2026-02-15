import React, { useState } from "react";
import "./AgeGate.css";

export default function AgeGate({ onAccept }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleContinue = () => {
    if (!confirmed) return;
    localStorage.setItem("age_gate_ok", "1");
    onAccept();
  };

  return (
    <div className="agegate-overlay">
      <div className="agegate-card">
        <h2>Contenido para mayores de 18</h2>

        <p>
          Este sitio está destinado a personas mayores de 18 años. Si eres menor,
          no debes continuar.
        </p>

        <p className="agegate-muted">
          Control parental recomendado: configura restricciones en tu dispositivo/navegador
          para impedir el acceso a menores.
        </p>

        <label className="agegate-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Confirmo que tengo 18 años o más
        </label>

        <button
          className="agegate-btn"
          onClick={handleContinue}
          disabled={!confirmed}
        >
          Entrar
        </button>

        <a className="agegate-exit" href="https://www.google.com">
          Salir
        </a>
      </div>
    </div>
  );
}
