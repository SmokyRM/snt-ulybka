import { Plot } from "@/types/snt";

const normalize = (value: string) => value.trim().toLowerCase();

const defaultPlots: Plot[] = [
  {
    id: "p1",
    plotId: "p1",
    street: "Центральная",
    number: "1",
    plotNumber: "1",
    plotCode: "A7K3D9Q2",
    cadastral: "50:00:000000:0001",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p2",
    plotId: "p2",
    street: "Центральная",
    number: "2",
    plotNumber: "2",
    plotCode: "B8L4E1W3",
    cadastral: "50:00:000000:0002",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p3",
    plotId: "p3",
    street: "Лесная",
    number: "3",
    plotNumber: "3",
    plotCode: "C9M5F2X4",
    cadastral: "50:00:000000:0003",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
  {
    id: "p4",
    plotId: "p4",
    street: "Лесная",
    number: "4",
    plotNumber: "4",
    plotCode: "D1N6G3Y5",
    cadastral: "50:00:000000:0004",
    ownerUserId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    membershipStatus: "UNKNOWN",
    isConfirmed: false,
    ownerFullName: null,
    phone: null,
    email: null,
    notes: null,
  },
];

const getDb = () => {
  const g = globalThis as typeof globalThis & { __SNT_PLOTS__?: Plot[] };
  if (!g.__SNT_PLOTS__) {
    g.__SNT_PLOTS__ = [...defaultPlots];
  }
  return g.__SNT_PLOTS__;
};

export const findPlotByNumberStreet = (plotNumber: string, street: string) => {
  const plots = getDb();
  return plots.find(
    (plot) =>
      normalize(plot.plotNumber) === normalize(plotNumber) &&
      normalize(plot.street) === normalize(street)
  );
};

export const findPlotByCode = (plotCode: string) => {
  const plots = getDb();
  return plots.find((plot) => normalize(plot.plotCode ?? "") === normalize(plotCode));
};

export const claimPlot = (plotId: string, userId: string) => {
  const plots = getDb();
  const target = plots.find((plot) => plot.plotId === plotId || plot.id === plotId);
  if (!target) return null;
  if (target.ownerUserId) {
    return null;
  }
  target.ownerUserId = userId;
  return target;
};

export const isPlotTaken = (plotId: string) => {
  const plot = getDb().find((p) => p.plotId === plotId || p.id === plotId);
  return Boolean(plot?.ownerUserId);
};

export const getPlotForUser = (userId: string) => {
  return getDb().find((plot) => plot.ownerUserId === userId) || null;
};
