export function createIpcSuccessResponse(data = null) {
  return { success: true, data };
}

export function createIpcCanceledResponse() {
  return { success: false, canceled: true };
}

export function createIpcFailureResponse(error = 'Operation failed') {
  return { success: false, error };
}
