/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';

const calculatePriceToEat = (netWorth: number): number => {
  const netWorthInBillions = netWorth / 1000000000;
  return Math.round(Math.sqrt(netWorthInBillions) * 100);
};

const FALLBACK_DATA = [
    {
      name: 'Elon Musk',
      netWorth: 234000000000,
      priceToEat: calculatePriceToEat(234000000000),
      image: '@elonmuskface.png'  // Using local image
    },
    {
      name: 'Jeff Bezos',
      netWorth: 180000000000,
      priceToEat: calculatePriceToEat(180000000000),
      image: '@jeffbezosface.png'  // Using local image
    },
    {
      name: 'Mark Zuckerberg',
      netWorth: 177000000000,
      priceToEat: calculatePriceToEat(177000000000),
      image: '@markzuckface.png'  // Using local image
    },
    {
      name: 'Donald Trump',
      netWorth: 2500000000,
      priceToEat: calculatePriceToEat(2500000000),
      image: '@trumpface.png'  // Using local image
    }
  ];
  

export async function GET() {
  try {
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || ''
      }
    };

    // Fetch all billionaires' data
    const [elonResponse, zuckResponse, bezosResponse, trumpResponse] = await Promise.all([
      fetch('https://forbes-billionaires-api.p.rapidapi.com/detail.php?id=elon-musk', options),
      fetch('https://forbes-billionaires-api.p.rapidapi.com/detail.php?id=mark-zuckerberg', options),
      fetch('https://forbes-billionaires-api.p.rapidapi.com/detail.php?id=jeff-bezos', options),
      fetch('https://forbes-billionaires-api.p.rapidapi.com/detail.php?id=donald-trump', options)
    ]);

    if (!elonResponse.ok && !zuckResponse.ok && !bezosResponse.ok && !trumpResponse.ok) {
      return NextResponse.json(FALLBACK_DATA);
    }

    const updatedData = [...FALLBACK_DATA];

    const updateBillionaireData = async (response: Response, nameMatch: string, defaultImage: string) => {
      if (response.ok) {
        const data = await response.json();
        const index = updatedData.findIndex(b => b.name.includes(nameMatch));
        if (index !== -1 && data.name) {
          const netWorth = data.current_worth * 1000000000; // API gives value in billions
          updatedData[index] = {
            name: data.name,
            netWorth: netWorth,
            priceToEat: calculatePriceToEat(netWorth),
            image: defaultImage
          };
        }
      }
    };

    // Update all billionaires' data in parallel
    await Promise.all([
      updateBillionaireData(elonResponse, 'Musk', '@elonmuskface.png'),
      updateBillionaireData(zuckResponse, 'Zuckerberg', '@markzuckface.png'),
      updateBillionaireData(bezosResponse, 'Bezos', '@jeffbezosface.png'),
      updateBillionaireData(trumpResponse, 'Trump', '@trumpface.png')
    ]);

    return NextResponse.json(updatedData);

  } catch (error) {
    console.error('Error in billionaires API:', error);
    return NextResponse.json(FALLBACK_DATA);
  }
}