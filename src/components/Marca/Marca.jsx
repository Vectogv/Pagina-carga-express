import './Marca.css';

/** Marca: símbolo del logo oficial (camión con alas) + nombre con el estilo del logo. */
export default function Marca({ oscura = false }) {
  return (
    <span className={`marca ${oscura ? 'marca--oscura' : ''}`}>
      <img src="/marca.png" alt="" width="93" height="30" className="marca__simbolo" />
      <span className="marca__nombre"><b>Carga Express</b><small>Delivery x GV</small></span>
    </span>
  );
}
