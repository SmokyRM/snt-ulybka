/**
 * Billing foundation - main entry point
 */

// Store exports
export {
  createPeriod,
  getPeriod,
  listPeriods,
  updatePeriod,
  createFeeTariff,
  getFeeTariff,
  listFeeTariffs,
  updateFeeTariff,
  createAccrual,
  getAccrual,
  listAccruals,
  updateAccrual,
  createPayment,
  getPayment,
  listPayments,
  createPaymentAllocation,
  getPaymentAllocation,
  listPaymentAllocations,
  deletePaymentAllocation,
  createPaymentImportJob,
  getPaymentImportJob,
  listPaymentImportJobs,
  updatePaymentImportJob,
  createImportRowError,
  listImportRowErrors,
  deleteImportRowErrors,
  createMessageTemplate,
  getMessageTemplate,
  listMessageTemplates,
  updateMessageTemplate,
  deleteMessageTemplate,
  createNotificationSendLog,
  getNotificationSendLog,
  listNotificationSendLogs,
} from "./store";

// Service exports
export {
  getPeriodSummary,
  getPlotBalance,
  allocatePayment,
  computeDebtByPlot,
} from "./services";

// Type exports
export type {
  Period,
  FeeTariff,
  Accrual,
  Payment,
  PaymentAllocation,
  PeriodStatus,
  FeeTariffStatus,
  AccrualStatus,
  PaymentSource,
  PeriodSummary,
  PlotBalance,
  PlotBalanceBreakdown,
  DebtByPlotResult,
  ComputeDebtByPlotFilters,
  PaymentImportJob,
  ImportRowError,
  NotificationSendLog,
  MessageTemplate,
} from "./types";