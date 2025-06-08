// Referencias a elementos del DOM
const form = document.getElementById('product-form');
const tableBody = document.querySelector('#invoice-table tbody');
const totalAmount = document.getElementById('total-amount');
const facturaInput = document.getElementById('factura-numero');
const checkboxIGV = document.getElementById('agregar-igv');
const tipoDoc = document.getElementById('tipo-doc');
const filtroClienteInput = document.getElementById('filtro-cliente');
const historialBody = document.querySelector('#historial-facturas tbody');
const emailInput = document.getElementById('email-destino');
const btnEnviarEmail = document.getElementById('enviar-email');

let items = [];
let total = 0;
let editIndex = -1;
let numeroFactura = parseInt(localStorage.getItem('numeroFactura') || '1001');
facturaInput.value = numeroFactura;

// Actualiza la tabla con productos agregados
function actualizarTabla() {
  tableBody.innerHTML = "";
  total = 0;

  items.forEach((item, index) => {
    const descuentoFactor = (100 - item.descuento) / 100;
    const subtotal = item.qty * item.price * descuentoFactor;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>S/. ${item.price.toFixed(2)}</td>
      <td>${item.descuento.toFixed(2)}%</td>
      <td>S/. ${subtotal.toFixed(2)}</td>
      <td>
        <button onclick="editarItem(${index})">✏️</button>
        <button onclick="eliminarItem(${index})">❌</button>
      </td>
    `;
    tableBody.appendChild(row);

    total += subtotal;
  });

  const totalConIGV = checkboxIGV.checked ? total * 1.18 : total;
  totalAmount.textContent = totalConIGV.toFixed(2);

  if (editIndex === -1) {
    form.reset();
    form.querySelector('button[type="submit"]').textContent = "Agregar";
  }
}

// Eliminar producto
function eliminarItem(index) {
  if (editIndex === index) {
    editIndex = -1;
    form.reset();
    form.querySelector('button[type="submit"]').textContent = "Agregar";
  }
  items.splice(index, 1);
  actualizarTabla();
}

// Editar producto
function editarItem(index) {
  const item = items[index];
  document.getElementById('product-name').value = item.name;
  document.getElementById('product-qty').value = item.qty;
  document.getElementById('product-price').value = item.price;
  document.getElementById('product-descuento').value = item.descuento;

  editIndex = index;
  form.querySelector('button[type="submit"]').textContent = "Guardar cambios";
}

// Validar RUC o DNI
function validarRUC(ruc) {
  const rucRegex = /^\d{11}$/;
  const dniRegex = /^\d{8}$/;
  return rucRegex.test(ruc) || dniRegex.test(ruc);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('product-name').value.trim();
  const qty = parseInt(document.getElementById('product-qty').value);
  const price = parseFloat(document.getElementById('product-price').value);
  let descuento = parseFloat(document.getElementById('product-descuento').value);
  if (isNaN(descuento)) descuento = 0;

  if (qty <= 0 || price < 0 || descuento < 0 || descuento > 100) {
    alert("Cantidad, precio y descuento deben ser valores válidos.");
    return;
  }

  if (editIndex === -1) {
    items.push({ name, qty, price, descuento });
  } else {
    items[editIndex] = { name, qty, price, descuento };
    editIndex = -1;
    form.querySelector('button[type="submit"]').textContent = "Agregar";
  }

  form.reset();
  actualizarTabla();
});

// Guardar factura en historial localStorage
function guardarFacturaEnHistorial(factura) {
  let historial = JSON.parse(localStorage.getItem('historialFacturas') || "[]");
  historial.push(factura);
  localStorage.setItem('historialFacturas', JSON.stringify(historial));
}

// Cargar historial en tabla
function cargarHistorial() {
  let historial = JSON.parse(localStorage.getItem('historialFacturas') || "[]");
  historialBody.innerHTML = '';

  const filtro = filtroClienteInput.value.toLowerCase();

  historial
    .filter(factura => factura.cliente.toLowerCase().includes(filtro))
    .forEach((factura, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${factura.numero}</td>
        <td>${factura.cliente}</td>
        <td>${factura.fecha}</td>
        <td>S/. ${factura.total.toFixed(2)}</td>
        <td><button onclick="reimprimirFactura(${index})">📄 Ver PDF</button></td>
      `;
      historialBody.appendChild(row);
    });
}

function reimprimirFactura(indice) {
  let historial = JSON.parse(localStorage.getItem('historialFacturas') || "[]");
  if (!historial[indice]) {
    alert("Factura no encontrada.");
    return;
  }
  generarPDF(historial[indice]);
}

// Generar PDF para descargar
function generarPDF(factura = null) {
  if (!factura) {
    const cliente = document.getElementById('cliente').value.trim();
    const ruc = document.getElementById('ruc').value.trim();
    const tipoDocumento = tipoDoc.value;

    if (!cliente) {
      alert("Por favor ingresa el nombre del cliente.");
      return;
    }
    if (!validarRUC(ruc)) {
      alert("Por favor ingresa un RUC o DNI válido (11 o 8 dígitos).");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un producto.");
      return;
    }

    const fecha = new Date().toLocaleString();
    const numero = parseInt(facturaInput.value);

    factura = {
      numero,
      cliente,
      ruc,
      fecha,
      tipoDocumento,
      productos: items,
      total: parseFloat(totalAmount.textContent)
    };

    guardarFacturaEnHistorial(factura);

    numeroFactura++;
    localStorage.setItem('numeroFactura', numeroFactura.toString());
    facturaInput.value = numeroFactura;

    items = [];
    actualizarTabla();
    document.getElementById('cliente').value = '';
    document.getElementById('ruc').value = '';
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Factura ${factura.tipoDocumento} N° ${factura.numero}`, 14, 20);

  doc.setFontSize(12);
  doc.text(`Cliente: ${factura.cliente}`, 14, 30);
  doc.text(`RUC/DNI: ${factura.ruc}`, 14, 37);
  doc.text(`Fecha: ${factura.fecha}`, 14, 44);

  const bodyData = factura.productos.map(p => {
    const descuentoFactor = (100 - p.descuento) / 100;
    const subtotal = p.qty * p.price * descuentoFactor;
    return [
      p.name,
      p.qty.toString(),
      `S/. ${p.price.toFixed(2)}`,
      `${p.descuento.toFixed(2)}%`,
      `S/. ${subtotal.toFixed(2)}`
    ];
  });

  doc.autoTable({
    startY: 50,
    head: [['Producto', 'Cantidad', 'Precio', 'Descuento', 'Subtotal']],
    body: bodyData,
  });

  const finalY = doc.lastAutoTable.finalY || 60;
  doc.setFontSize(14);
  doc.text(`Total: S/. ${factura.total.toFixed(2)}`, 14, finalY + 10);

  doc.save(`Factura_${factura.numero}.pdf`);
  cargarHistorial();
}

// ----------------- NUEVO: Impresión directa -----------------
function imprimirFactura() {
  // Obtenemos datos actuales (igual validación que PDF)
  const cliente = document.getElementById('cliente').value.trim();
  const ruc = document.getElementById('ruc').value.trim();
  const tipoDocumento = tipoDoc.value;

  if (!cliente) {
    alert("Por favor ingresa el nombre del cliente.");
    return;
  }
  if (!validarRUC(ruc)) {
    alert("Por favor ingresa un RUC o DNI válido (11 o 8 dígitos).");
    return;
  }
  if (items.length === 0) {
    alert("Agrega al menos un producto.");
    return;
  }

  const fecha = new Date().toLocaleString();
  const numero = parseInt(facturaInput.value);

  // Crear una nueva ventana para impresión
  const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
  ventanaImpresion.document.write('<html><head><title>Factura para imprimir</title>');
  ventanaImpresion.document.write('<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse: collapse;} th, td {border: 1px solid #000;padding:8px;text-align:left;} h2, h3 {margin:0 0 10px;}</style>');
  ventanaImpresion.document.write('</head><body>');
  ventanaImpresion.document.write(`<h2>Factura ${tipoDocumento} N° ${numero}</h2>`);
  ventanaImpresion.document.write(`<p><strong>Cliente:</strong> ${cliente}</p>`);
  ventanaImpresion.document.write(`<p><strong>RUC/DNI:</strong> ${ruc}</p>`);
  ventanaImpresion.document.write(`<p><strong>Fecha:</strong> ${fecha}</p>`);

  ventanaImpresion.document.write('<table>');
  ventanaImpresion.document.write('<thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Subtotal</th></tr></thead><tbody>');

  items.forEach(item => {
    const descuentoFactor = (100 - item.descuento) / 100;
    const subtotal = item.qty * item.price * descuentoFactor;
    ventanaImpresion.document.write(`<tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>S/. ${item.price.toFixed(2)}</td>
      <td>${item.descuento.toFixed(2)}%</td>
      <td>S/. ${subtotal.toFixed(2)}</td>
    </tr>`);
  });

  ventanaImpresion.document.write('</tbody></table>');
  ventanaImpresion.document.write(`<h3>Total: S/. ${totalAmount.textContent}</h3>`);
  ventanaImpresion.document.write('</body></html>');

  ventanaImpresion.document.close();
  ventanaImpresion.focus();
  ventanaImpresion.print();
  ventanaImpresion.close();
}

// -----------------Enviar por Correo (simulación - solo confirma con una alerta) -----------------

// Función para crear PDF en blob para enviar
function crearPDFBlob(factura) {
  return new Promise((resolve) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Factura ${factura.tipoDocumento} N° ${factura.numero}`, 14, 20);

    doc.setFontSize(12);
    doc.text(`Cliente: ${factura.cliente}`, 14, 30);
    doc.text(`RUC/DNI: ${factura.ruc}`, 14, 37);
    doc.text(`Fecha: ${factura.fecha}`, 14, 44);

    const bodyData = factura.productos.map(p => {
      const descuentoFactor = (100 - p.descuento) / 100;
      const subtotal = p.qty * p.price * descuentoFactor;
      return [
        p.name,
        p.qty.toString(),
        `S/. ${p.price.toFixed(2)}`,
        `${p.descuento.toFixed(2)}%`,
        `S/. ${subtotal.toFixed(2)}`
      ];
    });

    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'Precio', 'Descuento', 'Subtotal']],
      body: bodyData,
    });

    const finalY = doc.lastAutoTable.finalY || 60;
    doc.setFontSize(14);
    doc.text(`Total: S/. ${factura.total.toFixed(2)}`, 14, finalY + 10);

    const pdfBlob = doc.output('blob');
    resolve(pdfBlob);
  });
}

btnEnviarEmail.addEventListener('click', async () => {
  const emailDestino = emailInput.value.trim();
  if (!emailDestino || !emailDestino.includes('@')) {
    alert('Por favor ingresa un correo electrónico válido.');
    return;
  }

  if (items.length === 0) {
    alert("Agrega al menos un producto para enviar la factura.");
    return;
  }

  const cliente = document.getElementById('cliente').value.trim();
  const ruc = document.getElementById('ruc').value.trim();
  const tipoDocumento = tipoDoc.value;

  if (!cliente) {
    alert("Por favor ingresa el nombre del cliente.");
    return;
  }
  if (!validarRUC(ruc)) {
    alert("Por favor ingresa un RUC o DNI válido (11 o 8 dígitos).");
    return;
  }

  const fecha = new Date().toLocaleString();
  const numero = parseInt(facturaInput.value);

  const factura = {
    numero,
    cliente,
    ruc,
    fecha,
    tipoDocumento,
    productos: items,
    total: parseFloat(totalAmount.textContent)
  };

  // Crear PDF blob
  const pdfBlob = await crearPDFBlob(factura);

  // Simulación: mostrar mensaje y limpiar form (no se envía realmente)
  alert(`Factura PDF generada para enviar a ${emailDestino}.`);

  // Limpiar datos después de envío
  items = [];
  actualizarTabla();
  document.getElementById('cliente').value = '';
  document.getElementById('ruc').value = '';
  emailInput.value = '';
  numeroFactura++;
  localStorage.setItem('numeroFactura', numeroFactura.toString());
  facturaInput.value = numeroFactura;

  // Guardar en historial
  guardarFacturaEnHistorial(factura);
  cargarHistorial();
});

// Evento cambio IGV para actualizar total
checkboxIGV.addEventListener('change', actualizarTabla);

// Evento para filtro historial
filtroClienteInput.addEventListener('input', cargarHistorial);

// Botón para eliminar historial de facturas 
const btnEliminarHistorial = document.getElementById('btn-eliminar-historial');
btnEliminarHistorial.addEventListener('click', () => {
  if (confirm("¿Estás seguro de eliminar todo el historial de facturas? Esta acción no se puede deshacer.")) {
    localStorage.removeItem('historialFacturas');
    cargarHistorial(); // Actualiza la tabla después de borrar
    alert("Historial eliminado correctamente.");
  }
});


// Carga inicial
actualizarTabla();
cargarHistorial();

// Exponer funciones globales para botones dentro de tabla
window.editarItem = editarItem;
window.eliminarItem = eliminarItem;
window.reimprimirFactura = reimprimirFactura;
window.generarPDF = generarPDF;
window.imprimirFactura = imprimirFactura;
