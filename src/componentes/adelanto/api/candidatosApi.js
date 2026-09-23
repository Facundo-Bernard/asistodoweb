import httpClient, { API_URIS } from "../../../api/httpClient";

export async function createCandidate(candidate) {
  try {
    const { data } = await httpClient.post(API_URIS.candidates.collection, candidate);
    return data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "No pudimos registrar tu solicitud. Intentá nuevamente.");
  }
}
