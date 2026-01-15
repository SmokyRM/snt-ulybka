export type FinanceRow = {
  plotNumber: string;
  ownerName?: string;
  accrued: number;
  paid: number;
  balance: number;
  updatedAt: string;
};

const seedFinance: FinanceRow[] = [
  { plotNumber: "Берёзовая, 12", ownerName: "Анна Петрова", accrued: 5200, paid: 3000, balance: -2200, updatedAt: "2024-03-01T10:00:00.000Z" },
  { plotNumber: "Луговая, 7", ownerName: "Сергей К.", accrued: 4100, paid: 4100, balance: 0, updatedAt: "2024-03-02T09:30:00.000Z" },
  { plotNumber: "Сиреневая, 3", ownerName: "Марина Л.", accrued: 3500, paid: 5000, balance: 1500, updatedAt: "2024-03-03T11:15:00.000Z" },
  { plotNumber: "Лесная, 21", ownerName: "Иван Н.", accrued: 6000, paid: 2000, balance: -4000, updatedAt: "2024-03-04T12:45:00.000Z" },
  { plotNumber: "Речная, 5", ownerName: "Иван П.", accrued: 3800, paid: 3800, balance: 0, updatedAt: "2024-03-05T08:20:00.000Z" },
  { plotNumber: "Солнечная, 14", ownerName: "Елена С.", accrued: 4500, paid: 2000, balance: -2500, updatedAt: "2024-03-06T15:05:00.000Z" },
  { plotNumber: "Кленовая, 2", ownerName: "Алексей Т.", accrued: 3000, paid: 3200, balance: 200, updatedAt: "2024-03-06T16:10:00.000Z" },
  { plotNumber: "Дачная, 18", ownerName: "Ольга Р.", accrued: 5200, paid: 5200, balance: 0, updatedAt: "2024-03-07T09:55:00.000Z" },
  { plotNumber: "Полевая, 9", ownerName: "Николай В.", accrued: 2700, paid: 1000, balance: -1700, updatedAt: "2024-03-07T14:10:00.000Z" },
  { plotNumber: "Яблоневая, 6", ownerName: "Светлана Б.", accrued: 4800, paid: 5000, balance: 200, updatedAt: "2024-03-08T10:40:00.000Z" },
  { plotNumber: "Сосновая, 15", ownerName: "Владимир Д.", accrued: 5200, paid: 5200, balance: 0, updatedAt: "2024-03-08T12:00:00.000Z" },
  { plotNumber: "Липовая, 4", ownerName: "Ирина К.", accrued: 3100, paid: 1500, balance: -1600, updatedAt: "2024-03-09T09:30:00.000Z" },
  { plotNumber: "Ореховая, 20", ownerName: "Дмитрий Ф.", accrued: 4600, paid: 4600, balance: 0, updatedAt: "2024-03-09T13:15:00.000Z" },
  { plotNumber: "Ромашковая, 11", ownerName: "Екатерина М.", accrued: 3900, paid: 1000, balance: -2900, updatedAt: "2024-03-10T11:50:00.000Z" },
  { plotNumber: "Ландышевая, 8", ownerName: "Татьяна Ч.", accrued: 2500, paid: 2500, balance: 0, updatedAt: "2024-03-10T16:25:00.000Z" },
];

type ListParams = {
  q?: string;
  debtorsOnly?: boolean;
};

export function listFinance(params: ListParams = {}): FinanceRow[] {
  const query = params.q?.trim().toLowerCase();
  return seedFinance
    .filter((row) => {
      if (params.debtorsOnly && row.balance >= 0) return false;
      if (query) {
        const haystack = `${row.plotNumber} ${row.ownerName ?? ""}`.toLowerCase();
        return haystack.includes(query);
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
