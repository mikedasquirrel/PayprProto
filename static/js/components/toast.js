// Toast Notification Component
class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.toasts = [];
  }

  show(message, type = 'info', duration = 3000) {
    const id = Date.now() + Math.random();
    const toast = this.createToast(id, message, type);
    
    this.container.appendChild(toast);
    this.toasts.push({ id, element: toast });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  createToast(id, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.toastId = id;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div style="display: flex; align-items: start; gap: 0.75rem;">
        <span style="font-size: 1.25rem;">${icon}</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 0.25rem;">
            ${this.getTitle(type)}
          </div>
          <div style="font-size: 0.875rem; color: var(--fog);">
            ${message}
          </div>
        </div>
        <button
          onclick="window.toastManager.dismiss(${id})"
          style="background: none; border: none; color: var(--smoke); cursor: pointer; font-size: 1.25rem; padding: 0; line-height: 1;"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    `;

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type] || icons.info;
  }

  getTitle(type) {
    const titles = {
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
    };
    return titles[type] || titles.info;
  }

  dismiss(id) {
    const toastData = this.toasts.find(t => t.id === id);
    if (!toastData) return;

    const { element } = toastData;
    
    // Animate out
    element.style.animation = 'toast-out 200ms ease-out forwards';
    
    setTimeout(() => {
      element.remove();
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 200);
  }

  dismissAll() {
    this.toasts.forEach(({ id }) => this.dismiss(id));
  }
}

// Add toast-out animation to styles
const style = document.createElement('style');
style.textContent = `
  @keyframes toast-out {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Create singleton instance
const toastManager = new ToastManager();

// Make it globally accessible
window.toastManager = toastManager;

// Export helper function
export function showToast(message, type = 'info', duration = 3000) {
  return toastManager.show(message, type, duration);
}

export default toastManager;

