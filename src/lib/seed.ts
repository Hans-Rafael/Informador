import { offset } from './geo';
import type { Alert, Coords } from './types';

// Datos de ejemplo del MVP, generados alrededor de la ubicación del usuario en el primer uso.
export function seedAlerts(center: Coords): Alert[] {
  const now = Date.now();
  const min = 60000;
  return [
    {
      id: 'seed-1',
      category: 'seguridad',
      title: 'Perros sueltos agresivos',
      description:
        'Hay dos perros grandes sueltos en la esquina, ladrando y persiguiendo a la gente. Mejor evitar la cuadra hasta que llegue control animal.',
      coords: offset(center, 250, -120),
      createdAt: now - 12 * min,
      author: { name: 'Mateo R.', rating: 4.6, contributions: 23 },
      validations: 5,
      reports: 0,
    },
    {
      id: 'seed-2',
      category: 'cultura',
      title: 'Feria artesanal en la plaza',
      description:
        'Este sábado de 11 a 19 h hay feria de artesanos, música en vivo y food trucks. Entrada libre.',
      coords: offset(center, -300, 200),
      createdAt: now - 3 * 60 * min,
      author: { name: 'Ana P.', rating: 4.9, contributions: 41 },
      validations: 8,
      reports: 0,
    },
    {
      id: 'seed-3',
      category: 'transito',
      title: 'Corte de calle por protesta',
      description:
        'La avenida está cortada en ambas manos. Los colectivos están desviados por la calle paralela.',
      coords: offset(center, 600, 450),
      createdAt: now - 35 * min,
      author: { name: 'Pablo G.', rating: 4.1, contributions: 9 },
      validations: 2,
      reports: 0,
    },
    {
      id: 'seed-4',
      category: 'servicios',
      title: 'Caño roto, calle inundada',
      description:
        'Se rompió un caño de agua y la vereda está inundada. Ya se avisó a la empresa de agua.',
      coords: offset(center, -150, -500),
      createdAt: now - 26 * 60 * min,
      author: { name: 'Laura M.', rating: 4.4, contributions: 15 },
      validations: 4,
      reports: 0,
    },
    {
      id: 'seed-5',
      category: 'comercio',
      title: '2x1 en la cafetería de la esquina',
      description: 'Solo por hoy, 2x1 en cafés y medialunas hasta las 18 h.',
      coords: offset(center, 80, 350),
      createdAt: now - 90 * min,
      author: { name: 'Matías L.', rating: 3.8, contributions: 6 },
      validations: 1,
      reports: 0,
    },
    {
      id: 'seed-6',
      category: 'seguridad',
      title: 'Semáforo sin funcionar',
      description: 'El semáforo del cruce está apagado. Cruzar con precaución.',
      coords: offset(center, 1800, -900),
      createdAt: now - 4 * 24 * 60 * min,
      author: { name: 'Mariana S.', rating: 4.7, contributions: 30 },
      validations: 6,
      reports: 0,
    },
  ];
}
