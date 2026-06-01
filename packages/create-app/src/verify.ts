/** Hit /info on the target instance to confirm reachability and auth_mode. */
export async function verifyInstance(baseUrl: string): Promise<string> {
  const url = `${baseUrl.replace(/\/+$/, '')}/info`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { auth_mode?: string };
  if (!data.auth_mode) throw new Error('Response did not include auth_mode');
  return data.auth_mode;
}
