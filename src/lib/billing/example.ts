/**
 * Example usage of billing foundation
 * This demonstrates creating periods, tariffs, accruals, payments, and allocations
 */

import {
  createPeriod,
  createFeeTariff,
  createAccrual,
  createPayment,
  allocatePayment,
  getPeriodSummary,
  getPlotBalance,
  computeDebtByPlot,
  listPeriods,
  listFeeTariffs,
  listAccruals,
  listPayments,
} from "./index";

/**
 * Example: Create a billing period and generate accruals
 */
export function exampleCreatePeriodAndAccruals() {
  // Create a period for January 2025
  const period = createPeriod({
    year: 2025,
    month: 1,
    startAt: "2025-01-01T00:00:00Z",
    endAt: "2025-01-31T23:59:59Z",
    status: "open",
  });

  // Create a membership fee tariff
  const membershipTariff = createFeeTariff({
    type: "membership_fee",
    title: "Членский взнос 2025",
    amount: 5000,
    appliesTo: "plot",
    activeFrom: "2025-01-01T00:00:00Z",
    status: "active",
  });

  // Create accruals for multiple plots
  const plotIds = ["plot-1", "plot-2", "plot-3"];
  const accruals = plotIds.map((plotId) =>
    createAccrual({
      periodId: period.id,
      plotId,
      tariffId: membershipTariff.id,
      amount: 5000,
      status: "pending",
    })
  );

  return { period, membershipTariff, accruals };
}

/**
 * Example: Create payments and allocate them
 */
export function exampleCreatePaymentsAndAllocate() {
  // First, create period and accruals
  const { period, accruals } = exampleCreatePeriodAndAccruals();

  // Create a partial payment for plot-1
  const payment1 = createPayment({
    plotId: "plot-1",
    paidAt: "2025-01-15T10:00:00Z",
    amount: 3000,
    source: "manual",
    comment: "Частичная оплата",
  });

  // Allocate payment (FIFO - will allocate to oldest unpaid accrual)
  const allocations1 = allocatePayment(payment1.id);

  // Create a full payment for plot-2
  const payment2 = createPayment({
    plotId: "plot-2",
    paidAt: "2025-01-20T14:30:00Z",
    amount: 5000,
    source: "import",
    externalId: "BANK-TXN-12345",
    comment: "Полная оплата через банк",
  });

  const allocations2 = allocatePayment(payment2.id);

  // Get period summary
  const summary = getPeriodSummary(period.id);
  // Expected: totalAccrued: 15000, totalPaid: 8000, totalDebt: 7000

  return {
    period,
    accruals,
    payment1,
    payment2,
    allocations1,
    allocations2,
    summary,
  };
}

/**
 * Example: Get plot balance with breakdown
 */
export function exampleGetPlotBalance() {
  // Setup: create period, tariff, accrual, and payment
  const period = createPeriod({
    year: 2025,
    month: 1,
    startAt: "2025-01-01T00:00:00Z",
    endAt: "2025-01-31T23:59:59Z",
  });

  const tariff = createFeeTariff({
    type: "membership_fee",
    title: "Членский взнос",
    amount: 5000,
    appliesTo: "plot",
    activeFrom: "2025-01-01T00:00:00Z",
  });

  const accrual = createAccrual({
    periodId: period.id,
    plotId: "plot-1",
    tariffId: tariff.id,
    amount: 5000,
  });

  const payment = createPayment({
    plotId: "plot-1",
    paidAt: "2025-01-15T10:00:00Z",
    amount: 3000,
    source: "manual",
  });

  allocatePayment(payment.id);

  // Get balance
  const balance = getPlotBalance("plot-1");
  // Expected: totalAccrued: 5000, totalPaid: 3000, totalDebt: 2000

  // Get balance for specific period
  const balanceForPeriod = getPlotBalance("plot-1", period.id);

  return { balance, balanceForPeriod };
}

/**
 * Example: Compute debt by plot with filters
 */
export function exampleComputeDebtByPlot() {
  // Setup multiple periods and accruals
  const period1 = createPeriod({
    year: 2025,
    month: 1,
    startAt: "2025-01-01T00:00:00Z",
    endAt: "2025-01-31T23:59:59Z",
  });

  const period2 = createPeriod({
    year: 2025,
    month: 2,
    startAt: "2025-02-01T00:00:00Z",
    endAt: "2025-02-28T23:59:59Z",
  });

  const tariff = createFeeTariff({
    type: "membership_fee",
    title: "Членский взнос",
    amount: 5000,
    appliesTo: "plot",
    activeFrom: "2025-01-01T00:00:00Z",
  });

  // Create accruals for plot-1 across two periods
  const accrual1_1 = createAccrual({
    periodId: period1.id,
    plotId: "plot-1",
    tariffId: tariff.id,
    amount: 5000,
  });

  const accrual1_2 = createAccrual({
    periodId: period2.id,
    plotId: "plot-1",
    tariffId: tariff.id,
    amount: 5000,
  });

  // Create accrual for plot-2
  const accrual2_1 = createAccrual({
    periodId: period1.id,
    plotId: "plot-2",
    tariffId: tariff.id,
    amount: 5000,
  });

  // Create partial payment for plot-1
  const payment = createPayment({
    plotId: "plot-1",
    paidAt: "2025-01-15T10:00:00Z",
    amount: 3000,
    source: "manual",
  });

  allocatePayment(payment.id);

  // Compute all debts
  const allDebts = computeDebtByPlot({});
  // Expected: plot-1 has debt in period1 (2000) and period2 (5000), plot-2 has debt in period1 (5000)

  // Filter by minimum debt
  const largeDebts = computeDebtByPlot({ minDebt: 5000 });
  // Expected: Only plots with debt >= 5000

  // Filter by period
  const period1Debts = computeDebtByPlot({ periodId: period1.id });
  // Expected: Only debts for period1

  // Filter by plot
  const plot1Debts = computeDebtByPlot({ plotId: "plot-1" });
  // Expected: Only debts for plot-1

  return {
    allDebts,
    largeDebts,
    period1Debts,
    plot1Debts,
  };
}

/**
 * Example: Multiple tariffs and allocation strategy
 */
export function exampleMultipleTariffs() {
  const period = createPeriod({
    year: 2025,
    month: 1,
    startAt: "2025-01-01T00:00:00Z",
    endAt: "2025-01-31T23:59:59Z",
  });

  // Create different tariff types
  const membershipTariff = createFeeTariff({
    type: "membership_fee",
    title: "Членский взнос",
    amount: 5000,
    appliesTo: "plot",
    activeFrom: "2025-01-01T00:00:00Z",
  });

  const electricityTariff = createFeeTariff({
    type: "electricity",
    title: "Электроэнергия",
    amount: 1500,
    appliesTo: "plot",
    activeFrom: "2025-01-01T00:00:00Z",
  });

  // Create accruals for plot-1
  // Note: createdAt is auto-generated. For FIFO to work correctly, create accruals in order.
  const accrual1 = createAccrual({
    periodId: period.id,
    plotId: "plot-1",
    tariffId: membershipTariff.id,
    amount: 5000,
    // Created first, so will be allocated first (FIFO)
  });

  // Small delay to ensure accrual2.createdAt > accrual1.createdAt
  const accrual2 = createAccrual({
    periodId: period.id,
    plotId: "plot-1",
    tariffId: electricityTariff.id,
    amount: 1500,
    // Created second, so will be allocated second (FIFO)
  });

  // Create a payment that covers both
  const payment = createPayment({
    plotId: "plot-1",
    paidAt: "2025-01-20T10:00:00Z",
    amount: 4000,
    source: "manual",
  });

  // Allocate - should allocate to oldest accrual first (FIFO)
  const allocations = allocatePayment(payment.id);
  // Expected: 4000 allocated to accrual1 (membership), accrual2 (electricity) remains unpaid

  const balance = getPlotBalance("plot-1");
  // Expected: totalAccrued: 6500, totalPaid: 4000, totalDebt: 2500

  return {
    period,
    membershipTariff,
    electricityTariff,
    accrual1,
    accrual2,
    payment,
    allocations,
    balance,
  };
}