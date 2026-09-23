const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMBER || "549118880886").replace(/\D/g, "");

export const createWhatsAppUrl = (applicationId) => {
  const message = `Hola, inicié mi solicitud de adelanto${applicationId ? ` (${applicationId})` : ""} y quiero continuar con un asesor.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
