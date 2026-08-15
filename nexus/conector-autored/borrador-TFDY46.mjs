// BORRADOR LISTO — vendedor EMPRESA de la solicitud 516 (TFDY46 · Kia Soluto 2024).
// Datos: e-RUT + escritura de constitución + vigencia de poderes (15-08-2026, vía Joaquín).
// NO envía nada por sí solo: sin el argumento `--enviar` corre en seco.
//   Ver el mapeo:  node borrador-TFDY46.mjs
//   Enviar:        node borrador-TFDY46.mjs --enviar
import * as autored from './autored.mjs';

const PUBLIC_ID = '3b7994d9-b4f6-4f16-a28d-25a36447711d';   // solicitud 516
const UP = '/Users/AIagenteia/nexus/uploads';

const enviar = process.argv.includes('--enviar');

const empresa = {
  razonSocial: 'TRADE MARKETING CHILE SPA',
  rut: '76.101.539-7',
  calle: 'Pdte. Sebastián Piñera Echenique',
  numero: '6753',
  depto: '',
  escrituraPublica: true,
  fechaConstitucion: '2010-04-28',          // la escritura dice 28-abr-2010 (Joaquín dijo 25)
  notarioNombre: 'Iván Tamargo Barros',
  notarioComuna: 'Santiago',
  notarioNumero: '51',
  representantes: [{
    nombres: 'Sebastián Esteban', apellidoPaterno: 'Bahamondes', apellidoMaterno: 'Silvestri',
    rut: '12.454.495-5',                     // de la escritura de constitución
    email: 'sebastiantmkt@gmail.com', telefono: '+56998440508',
  }],
  documentos: {
    societyConstitution: `${UP}/1786809147661-Constitucion_Trade_Marketing.pdf`,
    validityOfPowers:    `${UP}/1786809147718-Vigencia_Poder_Junio_2026.pdf`,
    validityOfSociety:   `${UP}/1786809147770-Vigencia_Sociedad_Junio_2026.pdf`,
  },
};

const estado = await autored.estadoCierre(PUBLIC_ID);
if (estado.estado !== 'ENTER_SELLER_INFO') {
  console.error(`⛔ La solicitud ya no está esperando al vendedor (está en ${estado.estado}). No se envía nada.`);
  process.exit(1);
}
empresa.comuna = await autored.buscarComuna('Las Condes');

const r = await autored.ingresarVendedorEmpresaOC(PUBLIC_ID, empresa, { confirmar: enviar });
if (!enviar) {
  console.log('MODO SECO — esto es lo que se enviaría:\n');
  console.log(JSON.stringify(r.payload_que_se_enviaria, null, 1));
  console.log('\nPara enviar de verdad: node borrador-TFDY46.mjs --enviar');
} else {
  console.log('ENVIADO:', JSON.stringify(r));
  // El mandato tarda ~10-20 s en generarse; después sale el link de firma.
  await new Promise((s) => setTimeout(s, 20000));
  console.log('estado ahora:', JSON.stringify(await autored.estadoCierre(PUBLIC_ID).then((e) => ({ estado: e.estado, paso: e.titulo_paso }))));
  console.log('firma:', JSON.stringify(await autored.firmaMandato(PUBLIC_ID).catch((e) => e.message)));
}
