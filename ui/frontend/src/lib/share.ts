/** Opens WhatsApp with a prepared message; the user picks the contact and presses send. */
export function whatsappUrl(message: string, phone?: string) {
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
