import { useAuthStore } from '../context/authStore';

interface FetchOptions extends RequestInit {
  body?: any;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(url: string, options: FetchOptions = {}) {
  const { token } = useAuthStore.getState();
  
  const headers = new Headers(options.headers || {});
  
  // Set default JSON headers
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.body);
  }
  
  // Attach JWT if available
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const config = {
    ...options,
    headers
  };
  
  const targetUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  const response = await fetch(targetUrl, config);
  
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error
        ? `${errorData.message || errorMessage}: ${errorData.error}`
        : (errorData.message || errorMessage);
    } catch (e) {
      // Body is not JSON, ignore
    }
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return await response.json();
}
