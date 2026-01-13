// Temporary mock repository for appeals. Kept separate so it can be swapped with a real data source later.
export type { Appeal, AppealStatus } from "./appeals.store";
export {
  listAppeals as listOfficeAppeals,
  getAppeal as getAppealById,
  createAppeal,
  updateAppealStatus,
  addAppealComment as addAppealReply,
} from "./appeals.store";
export { listAppeals as listMyAppeals } from "./appeals.store";
