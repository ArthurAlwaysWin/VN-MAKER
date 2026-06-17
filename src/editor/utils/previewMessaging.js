export function getPreviewTargetOrigin() {
  if (typeof window === 'undefined') {
    return '*';
  }

  const origin = window.location?.origin;
  return origin && origin !== 'null' ? origin : '*';
}

export function getPreviewReplyOrigin(event) {
  const origin = event?.origin;
  return origin && origin !== 'null' ? origin : getPreviewTargetOrigin();
}

export function postPreviewMessage(targetWindow, message, event = null) {
  if (!targetWindow?.postMessage) {
    return false;
  }

  targetWindow.postMessage(
    message,
    event ? getPreviewReplyOrigin(event) : getPreviewTargetOrigin(),
  );
  return true;
}
