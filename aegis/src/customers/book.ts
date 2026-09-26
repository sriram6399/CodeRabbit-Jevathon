import { getDb } from "@/ledger/db";

export type Customer = {
  id: string;
  name: string;
  email: string;
  city: string;
  income: number;
  monthlyObligations: number;
  onTimeRate: number;
  utilization: number;
  oldestAccountYears: number;
  hardInquiries: number;
  creditMix: number;
  notes: string;
};

/** The book is built around Ram. The other files exist so retrieval has to pick him out. */
export const CUSTOMERS: Customer[] = [
  {
    id: "ram-guttikonda",
    name: "Ram Guttikonda",
    email: "guttikondasriram1234@gmail.com",
    city: "San Francisco",
    income: 96000,
    monthlyObligations: 740,
    onTimeRate: 0.98,
    utilization: 0.22,
    oldestAccountYears: 9,
    hardInquiries: 1,
    creditMix: 3,
    notes:
      "Primary customer in this book. Salaried software engineer. No delinquencies in seven years. One auto loan, two cards, a student loan in good standing.",
  },
  {
    id: "rama-patel",
    name: "Rama Patel",
    email: "rama.patel@example.com",
    city: "Austin",
    income: 54000,
    monthlyObligations: 1100,
    onTimeRate: 0.86,
    utilization: 0.71,
    oldestAccountYears: 3,
    hardInquiries: 5,
    creditMix: 1,
    notes: "Thin file. Two recent card applications. High revolving balances.",
  },
  {
    id: "ramesh-iyer",
    name: "Ramesh Iyer",
    email: "ramesh.iyer@example.com",
    city: "Seattle",
    income: 128000,
    monthlyObligations: 2100,
    onTimeRate: 0.94,
    utilization: 0.41,
    oldestAccountYears: 14,
    hardInquiries: 2,
    creditMix: 4,
    notes: "Mortgage, auto loan, and three cards. One 30-day late four years ago.",
  },
  {
    id: "maya-chen",
    name: "Maya Chen",
    email: "maya.chen@example.com",
    city: "Oakland",
    income: 92000,
    monthlyObligations: 620,
    onTimeRate: 0.99,
    utilization: 0.18,
    oldestAccountYears: 8,
    hardInquiries: 0,
    creditMix: 2,
    notes: "No late payments in 24 months. Student loan is the main obligation.",
  },
  {
    id: "jordan-lee",
    name: "Jordan Lee",
    email: "jordan.lee@example.com",
    city: "Denver",
    income: 81000,
    monthlyObligations: 890,
    onTimeRate: 0.91,
    utilization: 0.36,
    oldestAccountYears: 6,
    hardInquiries: 2,
    creditMix: 2,
    notes: "Stable employment. One settled collection older than five years.",
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    email: "priya.shah@example.com",
    city: "Chicago",
    income: 41000,
    monthlyObligations: 980,
    onTimeRate: 0.8,
    utilization: 0.64,
    oldestAccountYears: 2,
    hardInquiries: 4,
    creditMix: 1,
    notes: "Stated income is modest relative to requested balances. Do not invent a higher figure.",
  },
];

export function ensureCustomers() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      city TEXT NOT NULL,
      income INTEGER NOT NULL,
      monthly_obligations INTEGER NOT NULL,
      on_time_rate REAL NOT NULL,
      utilization REAL NOT NULL,
      oldest_account_years REAL NOT NULL,
      hard_inquiries INTEGER NOT NULL,
      credit_mix INTEGER NOT NULL,
      notes TEXT NOT NULL
    );
  `);
  const upsert = db.prepare(`
    INSERT INTO customers (
      id, name, email, city, income, monthly_obligations, on_time_rate, utilization,
      oldest_account_years, hard_inquiries, credit_mix, notes
    ) VALUES (
      @id, @name, @email, @city, @income, @monthlyObligations, @onTimeRate, @utilization,
      @oldestAccountYears, @hardInquiries, @creditMix, @notes
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      city = excluded.city,
      income = excluded.income,
      monthly_obligations = excluded.monthly_obligations,
      on_time_rate = excluded.on_time_rate,
      utilization = excluded.utilization,
      oldest_account_years = excluded.oldest_account_years,
      hard_inquiries = excluded.hard_inquiries,
      credit_mix = excluded.credit_mix,
      notes = excluded.notes
  `);
  const write = db.transaction(() => {
    for (const customer of CUSTOMERS) upsert.run(customer);
  });
  write();
}

export function renderCustomer(customer: Customer) {
  return [
    `Customer ${customer.name}.`,
    `Goes by ${customer.name.split(" ")[0]}.`,
    `Email ${customer.email}. City ${customer.city}.`,
    `Annual income $${customer.income}. Monthly obligations $${customer.monthlyObligations}.`,
    `On-time payment rate ${customer.onTimeRate}. Revolving utilization ${customer.utilization}.`,
    `Oldest account ${customer.oldestAccountYears} years. Hard inquiries ${customer.hardInquiries}. Credit mix ${customer.creditMix} of 4.`,
    customer.notes,
  ].join(" ");
}
