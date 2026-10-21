// Silhueta de pistola (ícone do botão "riscar alternativa"). Usa currentColor.
export default function IconeArma({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path fillRule="evenodd" d="M3 5L19.8 5L21.8 6.8L21.8 9.6L16 9.6L16 11.4L15.2 13.6L14.6 14.4L11 14.4L10 19.8L4.7 19.8L6 9.6L3 9.6Z M11.4 11L14.7 11L14.3 12.6L13.6 13.2L11.4 13.2Z" />
      <path d="M12.6 11L13.5 11L13.1 12.6L12.5 12.6Z M3.4 4.2L5 4.2L5 5L3.4 5Z M18.8 4.2L20.2 4.2L20.2 5L18.8 5Z" />
    </svg>
  );
}
