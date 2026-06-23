import { NextResponse } from 'next/server';

export async function GET() {
  // Simulasi data mutasi yang terintegrasi dari berbagai platform
  const mockBankData = [
    {
      id: "TRX-001",
      timestamp: new Date().toISOString(),
      description: "Transfer Virtual Account - Stockbit (BBRI/SIDO)",
      amount: 1500000,
      source: "BCA Mobile",
      type: "DEBIT",
      category: "INVESTMENT" // AI harus tahu ini bukan pengeluaran konsumtif
    },
    {
      id: "TRX-002",
      timestamp: new Date().toISOString(),
      description: "QRIS Toko Kopi Tuku",
      amount: 28000,
      source: "GoPay",
      type: "DEBIT",
      category: "F&B"
    },
    {
      id: "TRX-003",
      timestamp: new Date().toISOString(),
      description: "Payment Gateway - Otten Coffee (Ceramic Burr Grinder)",
      amount: 450000,
      source: "Mandiri Livin",
      type: "DEBIT",
      category: "EQUIPMENT"
    },
    {
      id: "TRX-004",
      timestamp: new Date().toISOString(),
      description: "SPBU Shell - V-Power",
      amount: 40000,
      source: "OVO",
      type: "DEBIT",
      category: "TRANSPORTATION"
    },
    {
      id: "TRX-005",
      timestamp: new Date().toISOString(),
      description: "Steam Purchase",
      amount: 120000,
      source: "BCA Mobile",
      type: "DEBIT",
      category: "ENTERTAINMENT"
    },
    {
      id: "TRX-006",
      timestamp: new Date().toISOString(),
      description: "Top Up RDN - Ajaib Sekuritas",
      amount: 500000,
      source: "BCA Mobile",
      type: "DEBIT",
      category: "INVESTMENT"
    }
  ];

  return NextResponse.json({ 
    status: "success",
    data: mockBankData 
  });
}
