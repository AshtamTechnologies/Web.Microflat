/**
 * myQueueEndpoints.js — Endpoint definitions for My Queue module.
 * Conforms to Section 5.4i of Frontend-API-Guide.md.
 */

export const MY_QUEUE_ENDPOINTS = {
  QUEUE: '/api/my-queue',
  SUMMARY: '/api/my-queue/summary',
  QUEUE_ITEM: (id) => `/api/my-queue/${id}`,
  DONE: (id) => `/api/my-queue/${id}/done`,
  COMPLETE: (id) => `/api/my-queue/${id}/complete`,
};

