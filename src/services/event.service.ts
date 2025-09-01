import { api, type Event, type EventRegistration, type Paged } from '@drivn-cook/shared';

export async function listEvents(params?: { franchiseeId?: string; q?: string; page?: number; pageSize?: number; isPublic?: boolean }) {
  const res = await api.get<Paged<Event>>('/events', { params });
  return res.data;
}

export async function getEvent(id: string) {
  const res = await api.get<Event>(`/events/${id}`);
  return res.data;
}

export async function createEvent(payload: Partial<Event>) {
  const res = await api.post<Event>('/events', payload);
  return res.data;
}

export async function updateEvent(id: string, payload: Partial<Event>) {
  const res = await api.put<Event>(`/events/${id}`, payload);
  return res.data;
}

export async function deleteEvent(id: string) {
  await api.delete(`/events/${id}`);
}

/** Registrations */
export async function listEventRegistrations(eventId: string) {
  const res = await api.get<Paged<EventRegistration>>('/event-registrations', { params: { eventId, page: 1, pageSize: 100 } });
  return res.data;
}

export async function registerToEvent(payload: { eventId: string; customerId: string }) {
  const res = await api.post<EventRegistration>('/event-registrations', payload);
  return res.data;
}

export async function updateEventRegistration(id: string, payload: Partial<EventRegistration>) {
  const res = await api.put<EventRegistration>(`/event-registrations/${id}`, payload);
  return res.data;
}

export async function cancelEventRegistration(id: string) {
  await api.delete(`/event-registrations/${id}`);
}
