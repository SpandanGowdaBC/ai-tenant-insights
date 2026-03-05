document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-company-form');
    const companyInput = document.getElementById('company-name-input');
    const registerBtn = document.getElementById('register-btn');

    const analyzeForm = document.getElementById('analyze-form');
    const feedbackInput = document.getElementById('feedback-input');
    const submitBtn = document.getElementById('submit-btn');

    const logsContainer = document.getElementById('logs-container');
    const emptyState = document.getElementById('empty-state');

    const registrationCard = document.getElementById('registration-card');
    const credentialsCard = document.getElementById('tenant-credentials-card');
    const feedbackCard = document.getElementById('feedback-input-card');

    const displayCompanyName = document.getElementById('display-company-name');
    const displayTenantId = document.getElementById('display-tenant-id');
    const displayApiKey = document.getElementById('display-api-key');

    let currentTenantId = null;
    let currentApiKey = null;
    let currentCompanyName = null;

    // Handle Company Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const companyName = companyInput.value.trim();
        if (!companyName) return;

        registerBtn.disabled = true;
        registerBtn.textContent = 'Registering...';

        try {
            const res = await fetch('/register-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: companyName })
            });

            const data = await res.json();
            if (data.tenant_id && data.api_key) {
                currentTenantId = data.tenant_id;
                currentApiKey = data.api_key;
                currentCompanyName = data.company_name;

                // Update UI Display
                displayCompanyName.textContent = currentCompanyName;
                displayTenantId.textContent = currentTenantId;
                displayApiKey.textContent = currentApiKey;

                // Swap Cards
                registrationCard.style.display = 'none';
                credentialsCard.style.display = 'block';
                feedbackCard.style.display = 'block';

                // Allow analysis submits
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Failed to register company. Check console.');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Register Company';
        }
    });

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
                <span class="tenant">${currentCompanyName || 'Organization'} Feedback</span>
                <span class="time">${timeString}</span>
            </div>
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem;">Question / Feedback</div>
                <p class="log-message" style="margin-bottom: 0;">"${message}"</p>
            </div>
            <div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">AI Analysis / Answer</div>
                <div class="log-analysis">
                    <span class="tag ${sentimentClass}">Sentiment: ${sentiment}</span>
                    <span class="tag ${priorityTagClass}">Priority: ${priority}</span>
                </div>
            </div>
        `;

        return entry;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = input.value.trim();
        if (!message) return;

        if (!currentTenantId || !currentApiKey) {
            alert("Please register an organization first.");
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

                if (emptyState && emptyState.parentNode) {
                    emptyState.remove();
                }

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
