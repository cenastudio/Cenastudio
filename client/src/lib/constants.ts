import { SITE_CONFIG } from "@shared/site";

export const WHATSAPP_NUMBER = "5548998050267";

export const WHATSAPP_MESSAGE = (plan: string) =>
  `Olá! Tenho interesse no plano ${plan} do ${SITE_CONFIG.title}. Pode me enviar mais informações sobre pagamento via PIX?`;
