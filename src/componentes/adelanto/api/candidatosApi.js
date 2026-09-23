import httpClient, { API_URIS } from "../../../api/httpClient";

export async function createCandidate(candidate, payslip) {
  try {
    const formData = new FormData();
    formData.append("data", JSON.stringify(candidate));
    if (payslip) formData.append("papeleria", payslip);

    const { data } = await httpClient.post(API_URIS.candidates.collection, formData);
    return data;
  } catch (error) {
    const detail = error.response?.data?.detail;
    throw new Error(typeof detail === "string" ? detail : "No pudimos registrar tu solicitud. Intentá nuevamente.");
  }
}
