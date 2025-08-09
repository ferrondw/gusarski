function notification(message, id) {
    let type = localStorage.getItem('notificationType') || 'toast';

    if (type === 'toast') showToast(message);
    else if (type === 'notification') showNotification(message);
}

function showToast(message) {
    let toastContainer = document.getElementById('toastContainer');
    let toast = document.createElement('div');
    toast.className = "toast";
    toast.innerText = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toastContainer.removeChild(toast), 4000);
}

function showNotification(message) {
    if (!("Notification" in window)) {
        showToast('Notifications not supported, change notification type in settings')
    } else if (Notification.permission === "granted") {
        new Notification("Gusarski", {
            body: message,
            icon: "assets/images/favicon.png"
        });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                new Notification("Gusarski", {
                    body: message,
                    icon: "assets/images/favicon.png"
                });
            }
        });
    }
}

window.notification = notification;