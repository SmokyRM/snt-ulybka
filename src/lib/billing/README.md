# Billing Foundation

Billing domain models and services for SNT management system.

## Models

### Period
Represents a billing period (month/year).

- `id`: Unique identifier
- `year`: Year (e.g., 2025)
- `month`: Month (1-12)
- `startAt`: ISO date string - period start
- `endAt`: ISO date string - period end
- `status`: "open" | "closed"

### FeeTariff
Defines fee/tariff rules for charges.

- `id`: Unique identifier
- `type`: Tariff type (e.g., "membership_fee", "electricity")
- `title`: Display title
- `amount`: Amount in rubles
- `appliesTo`: "plot" | "area"
- `activeFrom`: ISO date string - when tariff becomes active
- `activeTo`: ISO date string | null - when tariff expires (null = currently active)
- `status`: "active" | "inactive"

### Accrual
Represents an accrued charge for a plot in a period.

- `id`: Unique identifier
- `periodId`: Reference to Period
- `plotId`: Reference to Plot
- `tariffId`: Reference to FeeTariff
- `amount`: Amount in rubles
- `status`: "pending" | "paid" | "partial"
- `createdAt`: ISO date string

### Payment
Represents a payment received.

- `id`: Unique identifier
- `plotId`: Reference to Plot (nullable for unallocated payments)
- `paidAt`: ISO date string - when payment was received
- `amount`: Amount in rubles
- `source`: "import" | "manual"
- `externalId`: External payment ID (e.g., from bank import)
- `rawRowHash`: Hash of raw import row for deduplication
- `comment`: Optional comment

### PaymentAllocation
Links payments to accruals (how payment was allocated).

- `id`: Unique identifier
- `paymentId`: Reference to Payment
- `accrualId`: Reference to Accrual
- `amount`: Amount allocated to this accrual

## Services

### getPeriodSummary(periodId)
Returns totals for a period:
- `totalAccrued`: Sum of all accruals
- `totalPaid`: Sum of all allocations
- `totalDebt`: Accrued - Paid

### getPlotBalance(plotId, periodId?)
Returns balance for a plot:
- `totalAccrued`: Sum of accruals for plot
- `totalPaid`: Sum of allocations for plot
- `totalDebt`: Accrued - Paid
- `breakdown`: Array of accrual details with allocated/remaining amounts

### allocatePayment(paymentId)
Allocates a payment to oldest unpaid accruals (FIFO).
- Automatically updates accrual status (pending → partial → paid)
- Returns array of created allocations

### computeDebtByPlot(filters)
Computes debt totals by plot with optional filters:
- `periodId`: Filter by specific period
- `plotId`: Filter by specific plot
- `minDebt`: Filter by minimum debt amount

Returns array with:
- `plotId`
- `totalDebt`
- `periods`: Array of period-level debt breakdown

## Usage

```typescript
import {
  createPeriod,
  createFeeTariff,
  createAccrual,
  createPayment,
  allocatePayment,
  getPeriodSummary,
  getPlotBalance,
  computeDebtByPlot,
} from "@/lib/billing";

// Create a period
const period = createPeriod({
  year: 2025,
  month: 1,
  startAt: "2025-01-01T00:00:00Z",
  endAt: "2025-01-31T23:59:59Z",
  status: "open",
});

// Create a tariff
const tariff = createFeeTariff({
  type: "membership_fee",
  title: "Членский взнос 2025",
  amount: 5000,
  appliesTo: "plot",
  activeFrom: "2025-01-01T00:00:00Z",
});

// Create an accrual
const accrual = createAccrual({
  periodId: period.id,
  plotId: "plot-1",
  tariffId: tariff.id,
  amount: 5000,
});

// Create a payment
const payment = createPayment({
  plotId: "plot-1",
  paidAt: "2025-01-15T10:00:00Z",
  amount: 3000,
  source: "manual",
});

// Allocate payment (FIFO)
const allocations = allocatePayment(payment.id);

// Get summary
const summary = getPeriodSummary(period.id);

// Get plot balance
const balance = getPlotBalance("plot-1");

// Compute debt by plot
const debts = computeDebtByPlot({ minDebt: 1000 });
```

## Storage

Uses in-memory storage via `globalThis.__SNT_BILLING_DB__` following the mockDb pattern.
All data is reset on server restart in development. Production should use persistent storage.