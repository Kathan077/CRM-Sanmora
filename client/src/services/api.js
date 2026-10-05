const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Base fetch wrapper with Bearer token injection
 */
export async function apiRequest(endpoint, method = 'GET', data = null, customHeaders = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  // Get token from storage if available
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('crm_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('crm_token') ||
      sessionStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const options = {
    method,
    headers
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const executeFetch = async (targetUrl, attempt = 1) => {
    try {
      const response = await fetch(targetUrl, options);
      
      let result = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json().catch(() => ({}));
      } else {
        const text = await response.text().catch(() => '');
        result = { message: text || `Server responded with status ${response.status}` };
      }

      if (!response.ok) {
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('token');
          sessionStorage.removeItem('crm_token');
          sessionStorage.removeItem('token');
        }
        const err = new Error(result.message || `Request failed with status ${response.status}`);
        err.status = response.status;
        throw err;
      }

      return result;
    } catch (err) {
      const isNetworkErr = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('Failed to fetch');
      if (isNetworkErr && attempt < 3) {
        // Wait 400ms and retry once if server was restarting
        await new Promise(res => setTimeout(res, 400));
        return executeFetch(targetUrl, attempt + 1);
      }
      throw err;
    }
  };

  try {
    return await executeFetch(url);
  } catch (error) {
    const isFetchError = error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('Failed to fetch');
    if (isFetchError && url.includes('localhost')) {
      const fallbackUrl = url.replace('localhost', '127.0.0.1');
      try {
        return await executeFetch(fallbackUrl);
      } catch (fallbackError) {
        console.warn(`[API Warning] Request to ${endpoint} failed after fallback. Target server might be restarting.`, fallbackError.message);
        throw fallbackError;
      }
    }

    if (process.env.NODE_ENV === 'development' && !error.message?.includes('Not authorized')) {
      console.warn(`[API Warning] ${method} ${endpoint}:`, error.message);
    }
    throw error;
  }
}
