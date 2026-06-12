import { PrismaClient, EmissionMaterialType, CropType } from '@prisma/client';

const prisma = new PrismaClient();

const factors: any[] = [
  {
    material_type: EmissionMaterialType.FERTILIZER,
    material_name: 'Urea',
    crop_type: null,
    factor_value: 1.974,
    unit: 'kgCO2e/kg',
    description: '0.46 kgN/kg × 0.01 × (44/28) × 273 (IPCC 2006)',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.FERTILIZER,
    material_name: 'NPK 16-16-8',
    crop_type: null,
    factor_value: 0.516,
    unit: 'kgCO2e/kg',
    description: '0.16 kgN/kg × 0.01 × (44/28) × 273 (IPCC 2006)',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.FERTILIZER,
    material_name: 'Phân DAP',
    crop_type: null,
    factor_value: 0.917,
    unit: 'kgCO2e/kg',
    description: '0.18 kgN/kg × 0.01 × (44/28) × 273 (IPCC 2006)',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.FERTILIZER,
    material_name: 'Phân hữu cơ',
    crop_type: null,
    factor_value: 0.114,
    unit: 'kgCO2e/kg',
    description: 'Organic fertilizer emission factor',
    source: 'MONRE 2020',
  },
  {
    material_type: EmissionMaterialType.PESTICIDE,
    material_name: 'Thuốc BVTV (chung)',
    crop_type: null,
    factor_value: 5.100,
    unit: 'kgCO2e/lít',
    description: 'Global pesticide average emission factor',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.HARVEST,
    material_name: 'Lúa',
    crop_type: CropType.RICE,
    factor_value: 0.189,
    unit: 'kgCO2/kg',
    description: '0.45 (dry matter) × 0.42 (carbon content)',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.HARVEST,
    material_name: 'Cà phê',
    crop_type: CropType.COFFEE,
    factor_value: 0.210,
    unit: 'kgCO2/kg',
    description: 'Coffee tree carbon storage factor',
    source: 'IPCC 2006 Tier 1',
  },
  {
    material_type: EmissionMaterialType.HARVEST,
    material_name: 'Hồ tiêu',
    crop_type: CropType.PEPPER,
    factor_value: 0.198,
    unit: 'kgCO2/kg',
    description: 'Pepper vine carbon storage factor',
    source: 'IPCC 2006 Tier 1',
  },
];

async function main() {
  console.log('Seeding emission factors...');
  for (const factor of factors) {
    const existing = await prisma.emissionFactor.findFirst({
      where: {
        material_type: factor.material_type,
        material_name: factor.material_name,
        crop_type: factor.crop_type,
      },
    });

    if (existing) {
      await prisma.emissionFactor.update({
        where: { id: existing.id },
        data: {
          factor_value: factor.factor_value,
          unit: factor.unit,
          description: factor.description,
          source: factor.source,
        },
      });
    } else {
      await prisma.emissionFactor.create({
        data: factor,
      });
    }
  }
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding emission factors:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
