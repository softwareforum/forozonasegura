const axios = require("axios");
const { getIp, addLowScoreStrike } = require('./securityMonitor');

module.exports = function verifyRecaptcha(actionExpected) {
  return async (req, res, next) => {
    try {
      const token = req.body.recaptchaToken;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Falta el token de reCAPTCHA."
        });
      }

      const secret = process.env.RECAPTCHA_SECRET;
      const threshold = Number(process.env.RECAPTCHA_THRESHOLD || 0.5);

      const params = new URLSearchParams();
      params.append("secret", secret);
      params.append("response", token);

      // Opcional: si quieres validar IP (a veces da problemas en dev)
      // params.append("remoteip", req.ip);

      const r = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const data = r.data;

      if (!data.success) {
        return res.status(403).json({
          success: false,
          message: "reCAPTCHA inválido.",
          recaptcha: data
        });
      }

      // v3 trae score y action
      if (typeof data.score === "number" && data.score < threshold) {
        const ip = getIp(req);
  addLowScoreStrike(ip, { score: data.score, action: data.action });

  return res.status(403).json({
    success: false,
    message: "reCAPTCHA score demasiado bajo.",
    score: data.score
  });
  
      }

      if (actionExpected && data.action && data.action !== actionExpected) {
        return res.status(403).json({
          success: false,
          message: "Acción de reCAPTCHA no coincide."
        });
      }

      req.recaptcha = { score: data.score, action: data.action };
      next();
    } catch (err) {
      console.error("reCAPTCHA error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Error verificando reCAPTCHA."
      });
    }
  };
};
