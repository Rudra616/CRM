import { emitToUser } from "../../realtime/socket";

/**
 * Payload for the `bulk_import_finished` Socket.IO event.
 * Emitted to the main admin's room when a background import completes or fails.
 */
export type BulkImportSocketPayload = {
  success: boolean;
  message: string;
  importId?: number;
  total: number;
  skippedValidation: number;
  submitted: number;
  inserted: number;
  updated: number;
  imported: number;
  notImported: number;
};

/**
 * Notifies the initiating admin that a bulk import job has finished.
 *
 * @param adminId Main admin user ID (target room `user:{adminId}`)
 * @param payload Import outcome summary for client toast / UI
 */
export const emitBulkImportFinished = (
  adminId: number,
  payload: BulkImportSocketPayload
): void => {
  emitToUser(adminId, "bulk_import_finished", payload);
};
