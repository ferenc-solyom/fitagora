async function loadOpenApi() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const tableWrapperEl = document.getElementById('table-wrapper');
    const tbodyEl = document.getElementById('endpoints-body');
    const infoCountEl = document.getElementById('endpoint-count');

    try {
        const response = await fetch('/q/openapi?format=json');
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ' ' + response.statusText);
        }

        const spec = await response.json();
        loadingEl.style.display = 'none';

        const paths = spec.paths || {};
        const rows = [];

        Object.entries(paths).forEach(([path, methods]) => {
            Object.entries(methods).forEach(([method, op]) => {
                const upperMethod = method.toUpperCase();
                const summary = op.summary || op.description || '';
                const tags = op.tags || [];

                rows.push({
                    method: upperMethod,
                    path,
                    summary,
                    tags
                });
            });
        });

        rows.sort((a, b) => {
            if (a.path === b.path) {
                return a.method.localeCompare(b.method);
            }
            return a.path.localeCompare(b.path);
        });

        if (rows.length === 0) {
            errorEl.style.display = 'block';
            errorEl.textContent = 'No endpoints found in OpenAPI spec.';
            return;
        }

        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.dataset.path = row.path.toLowerCase();
            tr.dataset.summary = (row.summary || '').toLowerCase();

            // Method cell
            const methodTd = document.createElement('td');
            const methodSpan = document.createElement('span');
            const knownMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
            const methodClass = knownMethods.includes(row.method) ? row.method : 'OTHER';
            methodSpan.textContent = row.method;
            methodSpan.className = 'method ' + methodClass;
            methodTd.appendChild(methodSpan);
            tr.appendChild(methodTd);

            // Path cell (clickable link)
            const pathTd = document.createElement('td');
            const link = document.createElement('a');
            link.href = row.path;
            link.textContent = row.path;
            pathTd.appendChild(link);
            tr.appendChild(pathTd);

            // Summary cell
            const summaryTd = document.createElement('td');
            summaryTd.textContent = row.summary || '';
            tr.appendChild(summaryTd);

            // Tags cell
            const tagsTd = document.createElement('td');
            const tagsWrapper = document.createElement('div');
            tagsWrapper.className = 'tags';
            row.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = tag;
                tagsWrapper.appendChild(span);
            });
            tagsTd.appendChild(tagsWrapper);
            tr.appendChild(tagsTd);

            tbodyEl.appendChild(tr);
        });

        tableWrapperEl.style.display = 'block';
        infoCountEl.textContent = rows.length + ' endpoint' + (rows.length !== 1 ? 's' : '') + ' loaded';

        setupFilter();
    } catch (err) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = 'Failed to load OpenAPI: ' + err.message;
    }
}

function setupFilter() {
    const filterInput = document.getElementById('filter');
    const tbodyEl = document.getElementById('endpoints-body');
    const infoCountEl = document.getElementById('endpoint-count');

    if (!filterInput) {
        return;
    }

    filterInput.addEventListener('input', () => {
        const q = filterInput.value.trim().toLowerCase();
        const rows = Array.from(tbodyEl.querySelectorAll('tr'));

        let visible = 0;

        rows.forEach(row => {
            const path = row.dataset.path || '';
            const summary = row.dataset.summary || '';
            const text = path + ' ' + summary;

            const match = !q || text.includes(q);

            row.style.display = match ? '' : 'none';
            if (match) {
                visible++;
            }
        });

        infoCountEl.textContent = visible + ' endpoint' + (visible !== 1 ? 's' : '') + ' shown';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadOpenApi();
});
