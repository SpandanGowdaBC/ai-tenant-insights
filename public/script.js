document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('analyze-form');
    const input = document.getElementById('feedback-input');
    const logsContainer = document.getElementById('logs-container');
    const submitBtn = document.getElementById('submit-btn');

    // We can auto-register a template tenant for frontend testing purposes,
    // or just use a dummy one if the backend requires one.
    // The current backend needs a valid tenant_id and api_key in the DB.
    // Let's first register a tenant to use for our frontend session.
    let currentTenantId = null;
    let currentApiKey = null;

    async function initializeTenant() {
        try {
            const res = await fetch('/register-tenant', {
                method: 'POST'
            });
            const data = await res.json();
            if (data.tenant_id && data.api_key) {
                currentTenantId = data.tenant_id;
                currentApiKey = data.api_key;
                console.log('Registered demo tenant for frontend session.');
            }
        } catch (e) {
            console.error('Failed to register frontend tenant:', e);
        }
    }

    initializeTenant();

    function createLogEntry(message, sentiment, priority) {
        const entry = document.createElement('div');

        let priorityClass = 'medium-priority';
        let sentimentClass = 'tag-neutral';
        let priorityTagClass = 'tag-medium';

        if (priority === 'High') {
            priorityClass = 'high-priority';
            priorityTagClass = 'tag-critical';
        } else if (priority === 'Low') {
            priorityClass = 'low-priority';
            priorityTagClass = 'tag-low';
        }

        if (sentiment === 'Negative') {
            sentimentClass = 'tag-negative';
        } else if (sentiment === 'Positive') {
            sentimentClass = 'tag-positive';
        }

        entry.className = `log-entry ${priorityClass} new-entry`;

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        entry.innerHTML = `
            <div class="log-meta">
                <span class="tenant">Live Input</span>
                <span class="time">${timeString}</span>
            </div>
            <p class="log-message">"${message}"</p>
            <div class="log-analysis">
                <span class="tag ${sentimentClass}">Sentiment: ${sentiment}</span>
                <span class="tag ${priorityTagClass}">Priority: ${priority}</span>
            </div>
        `;

        return entry;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = input.value.trim();
        if (!message) return;

        if (!currentTenantId || !currentApiKey) {
            alert("Still initializing connection. Please wait a second and try again.");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const res = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tenant_id: currentTenantId,
                    api_key: currentApiKey,
                    message: message
                })
            });

            if (!res.ok) {
                throw new Error('Analysis failed');
            }

            const data = await res.json();

            if (data.success && data.analysis) {
                const sentiment = data.analysis.sentiment || 'Neutral';
                const priority = data.analysis.priority_level || 'Medium';

                const newEntry = createLogEntry(message, sentiment, priority);

                // Add to top of the list
                logsContainer.insertBefore(newEntry, logsContainer.firstChild);

                // Clear input
                input.value = '';

                // Keep list manageable
                if (logsContainer.children.length > 5) {
                    logsContainer.removeChild(logsContainer.lastChild);
                }
            }
        } catch (error) {
            console.error('Error calling analyze API:', error);
            alert('Error calling analysis API. Check console.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Run Analysis';
        }
    });
});
