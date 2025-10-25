import { render } from 'solid-js/web';
import { createSignal, createResource, onMount, Show, For } from 'solid-js';
import { Alert, Spinner } from 'solid-bootstrap';

const BASE_URL = '/private/server/exocore/web';

const fetchTemplates = async () => {
    const res = await fetch(`${BASE_URL}/templates`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
};

const checkProjectStatus = async () => {
    try {
        const res = await fetch(`${BASE_URL}/project/status`, { method: 'POST' });
        const json = await res.json();
        if (json.exists) window.location.href = `${BASE_URL}/public/dashboard`;
    } catch (err) {
        console.error('Error checking project status:', err);
    }
};

function App() {
    const [templates] = createResource(fetchTemplates);
    const [step, setStep] = createSignal(1); // 1 for source, 2 for project name
    const [projectName, setProjectName] = createSignal('');
    const [selectedTemplateId, setSelectedTemplateId] = createSignal('');
    const [selectedTemplateGitUrl, setSelectedTemplateGitUrl] = createSignal('');
    const [customGitUrl, setCustomGitUrl] = createSignal('');
    const [projectSourceType, setProjectSourceType] = createSignal('template');

    const [status, setStatus] = createSignal('');
    const [loading, setLoading] = createSignal(false);

    onMount(() => {
        checkProjectStatus();
        document.body.style = `
            margin: 0;
            font-family: 'Inter', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
            overflow-x: hidden;
        `;
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    });

    const inputStyle = {
        background: '#2a2a2a',
        color: '#fff',
        border: '1px solid #444',
        padding: '0.8rem 1rem',
        'border-radius': '8px',
        width: '100%',
        'font-family': 'inherit',
        'font-size': '1rem',
        'box-shadow': 'inset 0 1px 3px rgba(0,0,0,0.3)',
        'transition': 'border-color 0.2s ease, box-shadow 0.2s ease',
    };

    const inputFocusStyle = {
        'border-color': '#007bff',
        'box-shadow': '0 0 0 3px rgba(0, 123, 255, 0.25)',
    };

    const buttonPrimaryColor = '#007bff';
    const buttonHoverColor = '#0056b3';
    const buttonSecondaryColor = '#555';
    const buttonSecondaryHoverColor = '#777';

    const customRadioContainerStyle = {
        'display': 'flex',
        'align-items': 'center',
        'cursor': 'pointer',
        'user-select': 'none',
        'margin-right': '1.5rem',
    };

    const hiddenRadioInputStyle = {
        'position': 'absolute',
        'opacity': '0',
        'width': '0',
        'height': '0',
    };

    const customRadioIndicatorStyle = {
        'display': 'inline-block',
        'width': '20px',
        'height': '20px',
        'border': '2px solid #666',
        'border-radius': '50%',
        'margin-right': '0.8rem',
        'position': 'relative',
        'transition': 'all 0.2s ease-in-out',
        'flex-shrink': 0,
    };

    const customRadioIndicatorCheckedStyle = {
        'border-color': buttonPrimaryColor,
        'background-color': buttonPrimaryColor,
        'box-shadow': `0 0 0 4px rgba(0, 123, 255, 0.3)`,
    };

    const customRadioInnerDotStyle = {
        'position': 'absolute',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'width': '10px',
        'height': '10px',
        'border-radius': '50%',
        'background': '#fff',
        'opacity': '0',
        'transition': 'opacity 0.2s ease-in-out',
    };

    const customRadioInnerDotCheckedStyle = {
        'opacity': '1',
    };

    const templateCardStyle = (isSelected) => ({
        padding: '1.2rem',
        border: `1px solid ${isSelected ? buttonPrimaryColor : '#333'}`,
        'border-radius': '10px',
        cursor: 'pointer',
        background: isSelected ? '#2a2a3a' : '#1f1f1f',
        'transition': 'all 0.2s ease-in-out',
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'flex-start',
        'gap': '0.8rem',
        '&:hover': {
            background: '#252525',
            'border-color': isSelected ? buttonPrimaryColor : '#666'
        },
        'box-shadow': isSelected ? `0 0 10px rgba(0, 123, 255, 0.4)` : 'none'
    });

    const templateImageStyle = {
        'width': '70px',
        'height': '70px',
        'object-fit': 'contain',
        'border-radius': '8px',
        'background': '#3a3a3a',
        'padding': '5px',
    };

    const templateDescriptionStyle = {
        'font-size': '0.9rem',
        'color': '#bbb',
        'line-height': '1.4'
    };

    const isNextDisabledStep1 = () => {
        if (projectSourceType() === 'template' && !selectedTemplateId()) return true;
        if (projectSourceType() === 'gitUrl' && !customGitUrl().trim()) return true;
        return false;
    };

    const isCreateDisabledStep2 = () => {
        return loading() || !projectName().trim();
    };


    const handleProceedToNameStep = () => {
        if (isNextDisabledStep1()) return;
        setStep(2);
    };

    const handleBackToSourceStep = () => {
        setStep(1);
        setStatus('');
    };

    const handleCreateProject = async () => {
        setLoading(true);
        setStatus('');

        const finalName = projectName().trim();
        if (!finalName) {
            setStatus('Project name cannot be empty');
            setLoading(false);
            return;
        }

        let gitToUse = '';
        if (projectSourceType() === 'template') {
            const chosenTemplate = templates()?.find(t => t.id === selectedTemplateId());
            if (chosenTemplate) {
                gitToUse = chosenTemplate.git;
            } else {
                setStatus('Error: Selected template not found.');
                setLoading(false);
                return;
            }
        } else { // 'gitUrl'
            gitToUse = customGitUrl().trim();
            if (!gitToUse) {
                setStatus('Git URL cannot be empty.');
                setLoading(false);
                return;
            }
        }

        try {
            const payload = {
                name: finalName,
                gitUrl: gitToUse,
            };
            const res = await fetch(`${BASE_URL}/project`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const text = await res.text();
            if (res.ok) {
                setStatus(`Success: ${text}`);
                setTimeout(() => window.location.href = `${BASE_URL}/public/dashboard`, 1500);
            } else {
                setStatus(`Failed: ${text || 'Unknown error'}`);
            }
        } catch (err) {
            setStatus(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div style={{ display: 'flex', 'justify-content': 'center', 'align-items': 'center', 'min-height': '100vh', padding: '2vh 1vw' }}>
            <div style={{
                width: '100%',
                'max-width': '600px',
                background: '#1a1a1a',
                padding: '2.5rem',
                'border-radius': '16px',
                'box-shadow': '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                'border': '1px solid rgba(255,255,255,0.08)'
            }}>
                <h2 style={{
                    'text-align': 'center',
                    'margin-bottom': '2.5rem',
                    'font-size': '2rem',
                    'color': '#fff',
                    'text-shadow': '0 0 8px rgba(255,255,255,0.1)'
                }}>✨ Create New Project ✨</h2>

                <Show when={step() === 1}>
                    <h3 style={{ 'margin-bottom': '1.5rem', 'font-size': '1.5rem', 'color': '#fff' }}>Choose Project Source</h3>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ 'display': 'flex', 'gap': '1.5rem' }}>
                            <label style={customRadioContainerStyle}>
                                <input
                                    type="radio"
                                    name="projectSource"
                                    checked={projectSourceType() === 'template'}
                                    onChange={() => setProjectSourceType('template')}
                                    style={hiddenRadioInputStyle}
                                />
                                <span style={{
                                    ...customRadioIndicatorStyle,
                                    ...(projectSourceType() === 'template' && customRadioIndicatorCheckedStyle)
                                }}>
                                    <div style={{
                                        ...customRadioInnerDotStyle,
                                        ...(projectSourceType() === 'template' && customRadioInnerDotCheckedStyle)
                                    }}></div>
                                </span>
                                Template
                            </label>
                            <label style={customRadioContainerStyle}>
                                <input
                                    type="radio"
                                    name="projectSource"
                                    checked={projectSourceType() === 'gitUrl'}
                                    onChange={() => setProjectSourceType('gitUrl')}
                                    style={hiddenRadioInputStyle}
                                />
                                <span style={{
                                    ...customRadioIndicatorStyle,
                                    ...(projectSourceType() === 'gitUrl' && customRadioIndicatorCheckedStyle)
                                }}>
                                    <div style={{
                                        ...customRadioInnerDotStyle,
                                        ...(projectSourceType() === 'gitUrl' && customRadioInnerDotCheckedStyle)
                                    }}></div>
                                </span>
                                Git URL
                            </label>
                        </div>
                    </div>

                    <Show when={projectSourceType() === 'template'}>
                        <label style={{ 'display': 'block', 'margin-bottom': '1rem', 'font-weight': '500', 'color': '#ccc' }}>Select a Template</label>
                        <div style={{
                            'max-height': '400px',
                            'overflow-y': 'auto',
                            'padding-right': '10px',
                            'margin-bottom': '2rem',
                            'display': 'grid',
                            'grid-template-columns': 'repeat(auto-fill, minmax(200px, 1fr))',
                            'gap': '1rem',
                        }}>
                            <Show when={templates.loading}>
                                <p style={{ 'color': '#aaa', 'text-align': 'center', 'grid-column': '1 / -1' }}>Loading templates...</p>
                            </Show>
                            <Show when={templates.error}>
                                <p style={{ 'color': '#f8d7da', 'text-align': 'center', 'grid-column': '1 / -1' }}>Error loading templates: {templates.error.message}</p>
                            </Show>
                            <For each={templates()}>{tpl => (
                                <div
                                    style={templateCardStyle(selectedTemplateId() === tpl.id)}
                                    onClick={() => {
                                        setSelectedTemplateId(tpl.id);
                                        setSelectedTemplateGitUrl(tpl.git);
                                    }}
                                >
                                    <img src={tpl.image} alt={tpl.name} style={templateImageStyle} />
                                    <h4 style={{ 'margin': '0', 'color': '#fff', 'font-size': '1.1rem' }}>{tpl.name}</h4>
                                    <p style={templateDescriptionStyle}>{tpl.describe}</p>
                                </div>
                            )}</For>
                            <Show when={!templates.loading && !templates.error && templates()?.length === 0}>
                                <p style={{ 'color': '#aaa', 'text-align': 'center', 'grid-column': '1 / -1' }}>No templates available.</p>
                            </Show>
                        </div>
                    </Show>

                    <Show when={projectSourceType() === 'gitUrl'}>
                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ 'display': 'block', 'margin-bottom': '0.8rem', 'font-weight': '500', 'color': '#ccc' }}>Git Repository URL</label>
                            <input
                                type="text"
                                placeholder="https://github.com/user/repo.git"
                                value={customGitUrl()}
                                onInput={e => setCustomGitUrl(e.currentTarget.value)}
                                style={{ ...inputStyle, ...(customGitUrl() && inputFocusStyle) }}
                                onFocus={e => e.currentTarget.style.borderColor = inputFocusStyle['border-color']}
                                onBlur={e => e.currentTarget.style.borderColor = inputStyle.border.split(' ')[2]}
                                disabled={loading()}
                            />
                        </div>
                    </Show>

                    <div style={{ 'display': 'flex', 'justify-content': 'flex-end', 'gap': '0.8rem' }}>
                        <button
                            onClick={() => { /* Implement close/cancel logic, e.g., redirect or reset form */ alert("Close/Cancel action not yet implemented."); }}
                            style={{
                                padding: '0.7rem 1.4rem',
                                background: buttonSecondaryColor,
                                color: 'white',
                                border: 'none',
                                'border-radius': '8px',
                                'font-size': '1rem',
                                cursor: 'pointer',
                                'transition': 'background 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = buttonSecondaryHoverColor}
                            onMouseLeave={(e) => e.currentTarget.style.background = buttonSecondaryColor}
                        >
                            Close
                        </button>
                        <button
                            onClick={handleProceedToNameStep}
                            disabled={isNextDisabledStep1()}
                            style={{
                                padding: '0.7rem 1.4rem',
                                background: !isNextDisabledStep1() ? buttonPrimaryColor : buttonSecondaryColor,
                                color: 'white',
                                border: 'none',
                                'border-radius': '8px',
                                'font-size': '1rem',
                                cursor: !isNextDisabledStep1() ? 'pointer' : 'not-allowed',
                                opacity: !isNextDisabledStep1() ? 1 : 0.6,
                                'transition': 'background 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = !isNextDisabledStep1() ? buttonHoverColor : buttonSecondaryColor}
                            onMouseLeave={(e) => e.currentTarget.style.background = !isNextDisabledStep1() ? buttonPrimaryColor : buttonSecondaryColor}
                        >
                            Next &raquo;
                        </button>
                    </div>
                </Show>

                <Show when={step() === 2}>
                    <h3 style={{ 'margin-bottom': '1.5rem', 'font-size': '1.5rem', 'color': '#fff' }}>Name Your Project</h3>

                    <div style={{ marginBottom: '3rem' }}>
                        <label style={{ 'display': 'block', 'margin-bottom': '0.8rem', 'font-weight': '500', 'color': '#ccc' }}>Project Name</label>
                        <input
                            type="text"
                            placeholder="e.g. my-awesome-app"
                            value={projectName()}
                            onInput={e => setProjectName(e.currentTarget.value)}
                            style={{ ...inputStyle, ...(projectName() && inputFocusStyle) }}
                            onFocus={e => e.currentTarget.style.borderColor = inputFocusStyle['border-color']}
                            onBlur={e => e.currentTarget.style.borderColor = inputStyle.border.split(' ')[2]}
                            disabled={loading()}
                        />
                    </div>

                    <div style={{ 'display': 'flex', 'justify-content': 'space-between', 'align-items': 'center', 'gap': '0.8rem' }}>
                        <button
                            onClick={handleBackToSourceStep}
                            style={{
                                padding: '0.7rem 1.4rem',
                                background: buttonSecondaryColor,
                                color: 'white',
                                border: 'none',
                                'border-radius': '8px',
                                'font-size': '1rem',
                                cursor: 'pointer',
                                'transition': 'background 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = buttonSecondaryHoverColor}
                            onMouseLeave={(e) => e.currentTarget.style.background = buttonSecondaryColor}
                        >
                            &laquo; Back
                        </button>
                        <button
                            onClick={handleCreateProject}
                            disabled={isCreateDisabledStep2()}
                            style={{
                                padding: '1rem',
                                background: buttonPrimaryColor,
                                color: 'white',
                                border: 'none',
                                'border-radius': '10px',
                                'font-size': '1.1rem',
                                'font-weight': '700',
                                cursor: isCreateDisabledStep2() ? 'not-allowed' : 'pointer',
                                opacity: isCreateDisabledStep2() ? 0.6 : 1,
                                'box-shadow': `0 4px 15px rgba(0, 123, 255, 0.4)`,
                                'transition': 'background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease',
                                '&:hover': {
                                    background: buttonHoverColor,
                                    transform: isCreateDisabledStep2() ? 'none' : 'translateY(-2px)',
                                    'box-shadow': isCreateDisabledStep2() ? `0 4px 15px rgba(0, 123, 255, 0.4)` : `0 6px 20px rgba(0, 123, 255, 0.6)`
                                },
                                '&:active': {
                                    transform: isCreateDisabledStep2() ? 'none' : 'translateY(0)',
                                    'box-shadow': isCreateDisabledStep2() ? `0 2px 10px rgba(0, 123, 255, 0.3)` : `0 2px 10px rgba(0, 123, 255, 0.3)`
                                }
                            }}
                        >
                            {loading() ? (
                                <span style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'gap': '0.5rem' }}>
                                    <Spinner animation="border" size="sm" /> Creating...
                                </span>
                            ) : '🚀 Create Project'}
                        </button>
                    </div>
                </Show>

                <Show when={status()}>
                    <Alert
                        class="mt-4"
                        variant={status().startsWith('Success') ? 'success' : 'danger'}
                        style={{
                            'text-align': 'center',
                            marginTop: '1.5rem',
                            'border-radius': '8px',
                            'padding': '0.8rem 1rem',
                            'font-size': '0.95rem',
                            'background-color': status().startsWith('Success') ? 'rgba(0, 128, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
                            'color': status().startsWith('Success') ? '#a0ffa0' : '#ffafaf',
                            'border-color': status().startsWith('Success') ? 'rgba(0, 128, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)'
                        }}
                    >
                        {status()}
                    </Alert>
                </Show>
            </div>
        </div>
    );
}

render(() => <App />, document.getElementById('app'));
