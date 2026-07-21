
export interface Vehicle {
  id: number;
  name: string;
  year: number;
  price: number;
  category: string;
  status: string;
  consigned: boolean;
  visits: number;
  purchasePrice?: number;
  otherExpenses?: number;
  totalExpenses?: number;
  publishedPrice?: number;
  description?: string;
  model?: string;
  brand?: string;
  mileage?: number;
  color?: string;
  transmission?: string;
  fuel?: string;
  engine?: string;
  vin?: string;
  images?: string[];
}

// Sample vehicle data
export const vehicles: Vehicle[] = [
  { 
    id: 1, 
    name: 'Toyota Corolla', 
    year: 2020, 
    price: 15900, 
    category: 'Sedán', 
    status: 'Disponible', 
    consigned: true, 
    visits: 32,
    purchasePrice: 13500,
    otherExpenses: 800,
    totalExpenses: 14300,
    publishedPrice: 15900,
    description: 'Toyota Corolla en excelente estado, un solo dueño, mantenimiento al día, perfectas condiciones tanto mecánicas como estéticas.',
    model: 'Corolla XLE',
    brand: 'Toyota',
    mileage: 45000,
    color: 'Blanco',
    transmission: 'Automática',
    fuel: 'Gasolina',
    engine: '1.8L 4 cilindros',
    vin: 'JTDEPRAE4LJ070000',
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1541443131876-44b03de101c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60'
    ]
  },
  { 
    id: 2, 
    name: 'Honda Civic', 
    year: 2019, 
    price: 14500, 
    category: 'Sedán', 
    status: 'Disponible', 
    consigned: false, 
    visits: 45,
    purchasePrice: 12000,
    otherExpenses: 600,
    totalExpenses: 12600,
    publishedPrice: 14500
  },
  { 
    id: 3, 
    name: 'Nissan Sentra', 
    year: 2021, 
    price: 17200, 
    category: 'Sedán', 
    status: 'Reservado', 
    consigned: true, 
    visits: 23,
    purchasePrice: 15000,
    otherExpenses: 750,
    totalExpenses: 15750,
    publishedPrice: 17200
  },
  { 
    id: 4, 
    name: 'Ford Explorer', 
    year: 2018, 
    price: 22800, 
    category: 'SUV', 
    status: 'Vendido', 
    consigned: false, 
    visits: 18,
    purchasePrice: 19500,
    otherExpenses: 1200,
    totalExpenses: 20700,
    publishedPrice: 22800
  },
  { 
    id: 5, 
    name: 'Chevrolet Equinox', 
    year: 2022, 
    price: 24500, 
    category: 'SUV', 
    status: 'Disponible', 
    consigned: true, 
    visits: 12,
    purchasePrice: 21000,
    otherExpenses: 1100,
    totalExpenses: 22100,
    publishedPrice: 24500
  },
  { 
    id: 6, 
    name: 'Mazda CX-5', 
    year: 2020, 
    price: 19700, 
    category: 'SUV', 
    status: 'Disponible', 
    consigned: false, 
    visits: 29,
    purchasePrice: 16800,
    otherExpenses: 950,
    totalExpenses: 17750,
    publishedPrice: 19700
  },
  { 
    id: 7, 
    name: 'Volkswagen Golf', 
    year: 2021, 
    price: 18500, 
    category: 'Hatchback', 
    status: 'Reservado', 
    consigned: true, 
    visits: 31,
    purchasePrice: 15900,
    otherExpenses: 800,
    totalExpenses: 16700,
    publishedPrice: 18500
  },
  { 
    id: 8, 
    name: 'BMW 320i', 
    year: 2019, 
    price: 27900, 
    category: 'Sedán', 
    status: 'Disponible', 
    consigned: false, 
    visits: 42,
    purchasePrice: 24000,
    otherExpenses: 1500,
    totalExpenses: 25500,
    publishedPrice: 27900
  },
  { 
    id: 9, 
    name: 'Mercedes-Benz GLC', 
    year: 2020, 
    price: 39800, 
    category: 'SUV', 
    status: 'Vendido', 
    consigned: true, 
    visits: 27,
    purchasePrice: 35000,
    otherExpenses: 2200,
    totalExpenses: 37200,
    publishedPrice: 39800
  },
  { 
    id: 10, 
    name: 'Audi A4', 
    year: 2021, 
    price: 36500, 
    category: 'Sedán', 
    status: 'Disponible', 
    consigned: false, 
    visits: 38,
    purchasePrice: 32000,
    otherExpenses: 1800,
    totalExpenses: 33800,
    publishedPrice: 36500
  },
];
