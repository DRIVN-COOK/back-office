import { api, type AuditLog, type Paged } from '@drivn-cook/shared';

export async function listAuditLogs(params?: {
  q?: string;
  actorUserId?: string;
  entity?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}) {
  const res = await api.get<Paged<AuditLog>>('/audit-logs', { params });
  return res.data;
}
