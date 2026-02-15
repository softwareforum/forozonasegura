const mongoose = require('mongoose');
const Community = require('../models/Community');
require('dotenv').config();

const communities = [
  {
    name: 'Andalucía',
    slug: 'andalucia',
    cities: [
      { name: 'Sevilla', slug: 'sevilla' },
      { name: 'Málaga', slug: 'malaga' },
      { name: 'Córdoba', slug: 'cordoba' },
      { name: 'Granada', slug: 'granada' },
      { name: 'Cádiz', slug: 'cadiz' },
      { name: 'Almería', slug: 'almeria' },
      { name: 'Huelva', slug: 'huelva' },
      { name: 'Jaén', slug: 'jaen' }
    ]
  },
  {
    name: 'Cataluña',
    slug: 'cataluna',
    cities: [
      { name: 'Barcelona', slug: 'barcelona' },
      { name: 'Badalona', slug: 'badalona' },
      { name: 'Sabadell', slug: 'sabadell' },
      { name: 'Terrassa', slug: 'terrassa' },
      { name: 'Lleida', slug: 'lleida' },
      { name: 'Girona', slug: 'girona' },
      { name: 'Tarragona', slug: 'tarragona' }
    ]
  },
  {
    name: 'Comunidad de Madrid',
    slug: 'comunidad-de-madrid',
    cities: [
      { name: 'Madrid', slug: 'madrid' },
      { name: 'Móstoles', slug: 'mostoles' },
      { name: 'Alcalá de Henares', slug: 'alcala-de-henares' },
      { name: 'Fuenlabrada', slug: 'fuenlabrada' },
      { name: 'Leganés', slug: 'leganes' },
      { name: 'Getafe', slug: 'getafe' },
      { name: 'Alcorcón', slug: 'alcorcon' }
    ]
  },
  {
    name: 'Comunidad Valenciana',
    slug: 'comunidad-valenciana',
    cities: [
      { name: 'Valencia', slug: 'valencia' },
      { name: 'Alicante', slug: 'alicante' },
      { name: 'Elche', slug: 'elche' },
      { name: 'Castellón de la Plana', slug: 'castellon-de-la-plana' }
    ]
  },
  {
    name: 'País Vasco',
    slug: 'pais-vasco',
    cities: [
      { name: 'Bilbao', slug: 'bilbao' },
      { name: 'Vitoria-Gasteiz', slug: 'vitoria-gasteiz' },
      { name: 'San Sebastián', slug: 'san-sebastian' }
    ]
  },
  {
    name: 'Galicia',
    slug: 'galicia',
    cities: [
      { name: 'Lugo', slug: 'lugo' },
      { name: 'A Coruña', slug: 'a-coruna' },
      { name: 'Pontevedra', slug: 'pontevedra' },
      { name: 'Ourense', slug: 'ourense' }
    ]
  },
  {
    name: 'Castilla y León',
    slug: 'castilla-y-leon',
    cities: [
      { name: 'Valladolid', slug: 'valladolid' },
      { name: 'Burgos', slug: 'burgos' },
      { name: 'León', slug: 'leon' },
      { name: 'Salamanca', slug: 'salamanca' }
    ]
  },
  {
    name: 'Canarias',
    slug: 'canarias',
    cities: [
      { name: 'Las Palmas de Gran Canaria', slug: 'las-palmas-de-gran-canaria' },
      { name: 'Santa Cruz de Tenerife', slug: 'santa-cruz-de-tenerife' }
    ]
  },
  {
    name: 'Castilla-La Mancha',
    slug: 'castilla-la-mancha',
    cities: [
      { name: 'Toledo', slug: 'toledo' },
      { name: 'Albacete', slug: 'albacete' },
      { name: 'Ciudad Real', slug: 'ciudad-real' }
    ]
  },
  {
    name: 'Región de Murcia',
    slug: 'region-de-murcia',
    cities: [
      { name: 'Murcia', slug: 'murcia' },
      { name: 'Cartagena', slug: 'cartagena' }
    ]
  },
  {
    name: 'Aragón',
    slug: 'aragon',
    cities: [
      { name: 'Zaragoza', slug: 'zaragoza' },
      { name: 'Huesca', slug: 'huesca' },
      { name: 'Teruel', slug: 'teruel' }
    ]
  },
  {
    name: 'Extremadura',
    slug: 'extremadura',
    cities: [
      { name: 'Badajoz', slug: 'badajoz' },
      { name: 'Cáceres', slug: 'caceres' }
    ]
  },
  {
    name: 'Asturias',
    slug: 'asturias',
    cities: [
      { name: 'Oviedo', slug: 'oviedo' },
      { name: 'Gijón', slug: 'gijon' }
    ]
  },
  {
    name: 'Islas Baleares',
    slug: 'islas-baleares',
    cities: [
      { name: 'Palma', slug: 'palma' }
    ]
  },
  {
    name: 'Cantabria',
    slug: 'cantabria',
    cities: [
      { name: 'Santander', slug: 'santander' }
    ]
  },
  {
    name: 'La Rioja',
    slug: 'la-rioja',
    cities: [
      { name: 'Logroño', slug: 'logrono' }
    ]
  },
  {
    name: 'Navarra',
    slug: 'navarra',
    cities: [
      { name: 'Pamplona', slug: 'pamplona' }
    ]
  }
];

async function initCommunities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foro-vivienda', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Conectado a MongoDB');

    // Eliminar comunidades existentes (opcional, comentar si quieres mantener datos)
    // await Community.deleteMany({});

    for (const comm of communities) {
      const existing = await Community.findOne({ slug: comm.slug });
      if (!existing) {
        await Community.create(comm);
        console.log(`✅ Creada: ${comm.name}`);
      } else {
        console.log(`⏭️  Ya existe: ${comm.name}`);
      }
    }

    console.log('✅ Comunidades inicializadas correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initCommunities();

