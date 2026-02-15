import React from 'react';
import './Help.css';

const Help = () => {
  return (
    <div className="help">
      <h1>Dudas y normas</h1>

      <div className="help-section">
        <h2>Normas de uso de la plataforma</h2>
        <div className="help-content">
          <h3>1. Finalidad de la web</h3>
          <p>
            Esta plataforma es una herramienta informativa y comunitaria destinada a compartir
            información sobre espacios de trabajo, alertar sobre condiciones abusivas y facilitar
            orientación dentro de un sector socialmente vulnerable.
          </p>
          <p>
            <strong>La web no fomenta ni promueve el trabajo sexual.</strong> Su finalidad es
            informativa, preventiva y de apoyo comunitario.
          </p>

          <h3>2. Publicaciones verificadas</h3>
          <p>
            Las publicaciones están selladas y no permiten texto libre. Esto garantiza mayor
            seguridad, menor manipulación de información y protección frente a datos personales.
          </p>

          <h3>3. Protección de la identidad</h3>
          <p>
            Está prohibido intentar identificar personas concretas, compartir datos privados o
            publicar información que permita localizar a alguien de forma directa.
          </p>
          <p>La plataforma prioriza el anonimato y la seguridad.</p>

          <h3>4. Uso responsable del sistema</h3>
          <p>
            El uso de la web implica no manipular valoraciones, no crear múltiples cuentas para
            alterar reputación y no utilizar la plataforma con fines de acoso o persecución.
          </p>
          <p>Las cuentas que incumplan estas normas podrán ser suspendidas.</p>

          <h3>5. Sistema de reportes</h3>
          <p>
            El botón Reportar es una herramienta de seguridad. Debe usarse únicamente para
            información falsa, condiciones abusivas, riesgos para la seguridad o suplantaciones.
          </p>
          <p>Los reportes se revisan de forma privada.</p>

          <h3>6. Limitación de responsabilidad</h3>
          <p>
            La plataforma no intermedia en acuerdos entre personas, no verifica la legalidad de
            los espacios publicados y no se hace responsable del uso externo de la información.
          </p>
          <p>Cada persona es responsable de sus decisiones fuera de la web.</p>
        </div>
      </div>

      <div className="help-section">
        <h2>Funcionamiento</h2>
        <div className="help-content">
          <h3>Estructura</h3>
          <p>El contenido se organiza por:</p>
          <ol>
            <li>Comunidad autónoma</li>
            <li>Ciudad</li>
            <li>Tipo de espacio</li>
          </ol>
          <p>El mapa muestra ubicaciones aproximadas, nunca direcciones exactas.</p>

          <h3>Sistema de votos</h3>
          <p>
            Las valoraciones reflejan experiencias de la comunidad. No constituyen una
            verificación oficial.
          </p>

          <h3>Reputación</h3>
          <p>La reputación sirve únicamente como indicador comunitario de participación.</p>
        </div>
      </div>

      <div className="help-section">
        <h2>Dudas frecuentes</h2>
        <div className="help-content">
          <h3>¿La web publica anuncios?</h3>
          <p>No. La información se introduce mediante formularios estructurados y sellados.</p>

          <h3>¿Puedo añadir datos personales?</h3>
          <p>No. La plataforma bloquea cualquier campo que permita identificar personas.</p>

          <h3>¿Qué hago si detecto información peligrosa?</h3>
          <p>Utiliza el botón Reportar y adjunta pruebas si es necesario.</p>

          <h3>¿La web verifica los espacios?</h3>
          <p>No. La información es colaborativa y debe interpretarse como orientativa.</p>

          <h3>¿Puedo usar la web para contactar con alguien?</h3>
          <p>No. La plataforma no incluye sistemas de contacto directo.</p>
        </div>
      </div>

      <p className="legal-note">
        Esta plataforma es un proyecto informativo y comunitario.
        No promueve ni intermedia actividades económicas ni laborales.
      </p>
    </div>
  );
};

export default Help;
