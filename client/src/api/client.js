let cachedCsrfToken = null;

const getCsrfToken = async () => {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    const data = await res.json();
    if (data && data.data && data.data.csrfToken) {
      cachedCsrfToken = data.data.csrfToken;
    }
  } catch (err) {
    console.warn('Failed to fetch CSRF token', err);
  }
  return cachedCsrfToken;
};

export const apiFetch = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  let csrfToken = null;
  if (isMutating) {
    csrfToken = await getCsrfToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    ...options.headers,
  };

  let response = await fetch(endpoint, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  // Handle CSRF token expiration or mismatch by refreshing token once
  if (!response.ok && data?.error?.code === 'CSRF_ERROR' && isMutating) {
    cachedCsrfToken = null;
    const newToken = await getCsrfToken();
    if (newToken) {
      headers['x-csrf-token'] = newToken;
      response = await fetch(endpoint, {
        ...options,
        method,
        headers,
        credentials: 'include',
      });
      try {
        data = await response.json();
      } catch (err) {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const errorMsg = (data && data.error && data.error.message) || `Request failed with status ${response.status}`;
    const errorCode = (data && data.error && data.error.code) || 'API_ERROR';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = errorCode;
    error.data = data;
    throw error;
  }

  return data;
};
