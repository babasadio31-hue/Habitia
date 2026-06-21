/**
 * Fetch wrapper that retries failed requests with exponential backoff.
 * Useful for handling Supabase database cold starts (waking up paused instances).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = 4,
  delayMs: number = 2000
): Promise<Response> {
  const token = localStorage.getItem('habitia_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const finalOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, finalOptions);
    
    // If it's a server error (e.g., database connection down/waking up), retry
    if (!response.ok && response.status >= 500 && retries > 0) {
      console.warn(`Request failed with status ${response.status}. Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Request to ${url} failed with network error. Retrying in ${delayMs}ms... (${retries} retries left)`, error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchWithRetry(url, options, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
}
