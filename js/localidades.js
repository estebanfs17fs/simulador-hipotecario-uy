/**
 * Departamentos de Uruguay y sus localidades (en Montevideo, los barrios).
 * Lista de referencia para filtrar la búsqueda; no pretende ser exhaustiva.
 * La usan el navegador (script tag) y el backend (require).
 */
const DEPARTAMENTOS = {
  'Artigas': ['Artigas', 'Bella Unión', 'Tomás Gomensoro', 'Baltasar Brum'],
  'Canelones': [
    'Canelones', 'Ciudad de la Costa', 'Las Piedras', 'Pando', 'La Paz', 'Progreso', 'Santa Lucía',
    'Barros Blancos', 'Colonia Nicolich', 'Paso Carrasco', 'Atlántida', 'Parque del Plata', 'La Floresta',
    'Salinas', 'Pinamar', 'Neptunia', 'Solymar', 'Lagomar', 'El Pinar', 'Shangrilá', 'San José de Carrasco',
    'Lomas de Carrasco', 'Carrasco Norte', 'La Tahona', 'Toledo', 'Suárez', 'Sauce', 'Tala', 'San Ramón',
    'Santa Rosa', 'Empalme Olmos', 'Joaquín Suárez',
  ],
  'Cerro Largo': ['Melo', 'Río Branco', 'Fraile Muerto', 'Isidoro Noblía'],
  'Colonia': [
    'Colonia del Sacramento', 'Carmelo', 'Juan Lacaze', 'Nueva Helvecia', 'Rosario', 'Nueva Palmira',
    'Tarariras', 'Ombúes de Lavalle', 'Colonia Valdense', 'Florencio Sánchez',
  ],
  'Durazno': ['Durazno', 'Sarandí del Yí', 'Villa del Carmen', 'La Paloma'],
  'Flores': ['Trinidad', 'Ismael Cortinas'],
  'Florida': ['Florida', 'Sarandí Grande', 'Casupá', 'Fray Marcos', '25 de Mayo'],
  'Lavalleja': ['Minas', 'José Pedro Varela', 'Solís de Mataojo', 'José Batlle y Ordóñez', 'Mariscala'],
  'Maldonado': [
    'Maldonado', 'Punta del Este', 'San Carlos', 'Piriápolis', 'Pan de Azúcar', 'La Barra', 'Manantiales',
    'José Ignacio', 'Punta Ballena', 'Pinares', 'Cerro San Antonio', 'Solanas', 'Aiguá', 'Balneario Buenos Aires',
  ],
  'Montevideo': [
    'Aguada', 'Aires Puros', 'Atahualpa', 'Barrio Sur', 'Belvedere', 'Brazo Oriental', 'Buceo', 'Capurro',
    'Carrasco', 'Carrasco Norte', 'Casabó', 'Casavalle', 'Centro', 'Cerrito', 'Cerro', 'Ciudad Vieja',
    'Colón', 'Cordón', 'Flor de Maroñas', 'Goes', 'Jacinto Vera', 'Jardines del Hipódromo', 'La Blanqueada',
    'La Comercial', 'La Figurita', 'La Teja', 'Larrañaga', 'Las Acacias', 'Lezica', 'Malvín', 'Malvín Norte',
    'Manga', 'Maroñas', 'Mercado Modelo', 'Nuevo París', 'Palermo', 'Parque Batlle', 'Parque Rodó',
    'Paso de la Arena', 'Paso Molino', 'Peñarol', 'Piedras Blancas', 'Pocitos', 'Prado', 'Punta Carretas',
    'Punta Gorda', 'Punta de Rieles', 'Reducto', 'Sayago', 'Tres Cruces', 'Unión', 'Villa Biarritz',
    'Villa Dolores', 'Villa Española', 'Villa Muñoz',
  ],
  'Paysandú': ['Paysandú', 'Guichón', 'Quebracho', 'Nuevo Paysandú'],
  'Río Negro': ['Fray Bentos', 'Young', 'Nuevo Berlín', 'San Javier'],
  'Rivera': ['Rivera', 'Tranqueras', 'Vichadero', 'Minas de Corrales'],
  'Rocha': [
    'Rocha', 'Chuy', 'Castillos', 'Lascano', 'La Paloma', 'La Pedrera', 'Punta del Diablo', 'Aguas Dulces',
    'Barra de Valizas', 'Cabo Polonio',
  ],
  'Salto': ['Salto', 'Constitución', 'Belén', 'Termas del Daymán'],
  'San José': ['San José de Mayo', 'Ciudad del Plata', 'Libertad', 'Ecilda Paullier', 'Rodríguez', 'Playa Pascual'],
  'Soriano': ['Mercedes', 'Dolores', 'Cardona', 'Palmitas', 'José Enrique Rodó'],
  'Tacuarembó': ['Tacuarembó', 'Paso de los Toros', 'San Gregorio de Polanco', 'Ansina'],
  'Treinta y Tres': ['Treinta y Tres', 'Vergara', 'Santa Clara de Olimar', 'Cerro Chato'],
};

/** "Treinta y Tres" → "treinta-y-tres", "Maroñas" → "maronas". */
function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEPARTAMENTOS, slugify };
}
