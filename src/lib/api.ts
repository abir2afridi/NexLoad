/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
