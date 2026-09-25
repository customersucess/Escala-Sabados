import Modal from './Modal.jsx';

export default function ModalConfirmacao({
  titulo,
  texto,
  rotuloConfirmar = 'Confirmar',
  perigoso = false,
  aoConfirmar,
  aoFechar,
}) {
  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <div className="formulario">
        <p>{texto}</p>
        <footer className="formulario__rodape">
          <button type="button" className="botao botao--secundario" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={`botao ${perigoso ? 'botao--perigo' : 'botao--primario'}`}
            onClick={aoConfirmar}
            autoFocus
          >
            {rotuloConfirmar}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
