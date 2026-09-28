const normalizar = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const buscarPrecio = (catalogo, concepto) => {
  const texto = normalizar(concepto);
  if (!texto) return null;
  let mejor = null;
  let largo = 0;
  for (const item of catalogo) {
    const claves = [item.nombre, ...(Array.isArray(item.alias) ? item.alias : [])];
    for (const clave of claves) {
      const limpio = normalizar(clave);
      if (limpio && texto.includes(limpio) && limpio.length > largo) {
        mejor = item;
        largo = limpio.length;
      }
    }
  }
  return mejor;
};

module.exports = { buscarPrecio, normalizar };
