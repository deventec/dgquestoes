import IconeArma from './IconeArma';

// Uma alternativa + o botão da arma que risca (elimina) a alternativa.
// estado: '' | 'sel' | 'ok' | 'no'
export default function AltRow({ letra, texto, estado = '', cortada = false, disabled = false, mostrarArma = true, onPick, onCut }) {
  return (
    <div className={`altrow${cortada ? ' cut' : ''}`}>
      <button type="button" className={`alt${estado ? ' ' + estado : ''}`} disabled={disabled || cortada}
        aria-pressed={estado === 'sel'} onClick={onPick}>
        <i>{estado === 'sel' ? '✓' : letra}</i><span className="txt">{texto}</span>
      </button>
      {mostrarArma && (
        <button type="button" className={`arma${cortada ? ' on' : ''}`} onClick={onCut} aria-pressed={cortada}
          aria-label={cortada ? `Restaurar a alternativa ${letra}` : `Eliminar a alternativa ${letra}`}
          title={cortada ? 'Restaurar alternativa' : 'Eliminar alternativa (riscar)'}>
          <IconeArma />
        </button>
      )}
    </div>
  );
}
