import httpClient, { API_URIS } from "../../../api/httpClient";

export async function loginAdministrator(credentials) {
  const { data } = await httpClient.post(API_URIS.auth.login, credentials);
  return data;
}

export async function getCurrentUser() {
  const { data } = await httpClient.get(API_URIS.auth.me);
  return data;
}

export async function getCandidates() {
  const { data } = await httpClient.get(API_URIS.candidates.collection);
  return Array.isArray(data) ? data : data.items || data.results || [];
}

export async function getCandidate(id) {
  const { data } = await httpClient.get(API_URIS.candidates.byId(id));
  return data;
}

export async function getCandidatePaperwork(paperworkPath) {
  const { data, headers } = await httpClient.get(paperworkPath, { responseType: "blob" });
  const disposition = headers["content-disposition"] || "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || "papeleria";

  return { blob: data, filename };
}

export async function removeCandidate(id) {
  await httpClient.delete(API_URIS.candidates.byId(id));
}
