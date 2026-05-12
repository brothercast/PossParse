// static/js/governance.js
// SSPEC Governance Controller - Manages Dependency Voids and Advocate micro-generations

import { showLoadingSpinner, hideLoadingSpinner } from './base_functions.js';

export function initGovernance(ssolId) {
    window.engageAdvocate = engageAdvocate;
}

/**
 * Triggers the Advocate micro-generation process to resolve a dependency void.
 * @param {string} voidId - The ID of the void being resolved.
 */
async function engageAdvocate(voidId) {
    console.log(`Engaging Advocate for void: ${voidId}`);
    
    const alertBox = document.querySelector(`button[onclick*="${voidId}"]`)?.closest('.rounded-3');
    let voidContext = "Dependency Void";
    
    if (alertBox) {
        // Read the actual text of the void to pass to the backend
        const voidTextEl = alertBox.querySelector('.font-body');
        if (voidTextEl) voidContext = voidTextEl.innerText;
        
        // Initiate scanning animation
        alertBox.style.opacity = '1';
        alertBox.classList.add('scanning-pulse'); // Add custom CSS class if desired
        const btn = alertBox.querySelector('button');
        if (btn) {
            btn.classList.replace('btn-outline-danger', 'btn-danger');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> SYSTEM ANALYZING...';
        }
    }

    try {
        const payload = {
            ssol_id: window.SSOL_ID,
            void_id: voidId,
            void_context: voidContext
        };

        const response = await fetch('/advocate/resolve_void', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            if (alertBox) {
                alertBox.classList.remove('scanning-pulse');
                alertBox.className = 'rounded-3 p-3 border-start border-3 border-success position-relative overflow-hidden mb-3 shadow-lg';
                alertBox.style.background = 'rgba(34, 197, 94, 0.05)';
                
                // Build Sub-Nodes Display
                let subNodesHtml = '';
                if (data.resolution.sub_nodes && data.resolution.sub_nodes.length > 0) {
                    subNodesHtml = `<div class="d-flex flex-wrap gap-2 mb-3 mt-2">`;
                    data.resolution.sub_nodes.forEach(node => {
                        subNodesHtml += `<span class="badge border border-success border-opacity-25 bg-success bg-opacity-10 text-success font-data x-small py-1 px-2 rounded-pill"><i class="fas fa-cube me-1"></i>${node.text}</span>`;
                    });
                    subNodesHtml += `</div>`;
                }

                // Build Impact Analysis
                let impactHtml = '';
                if (data.resolution.impact_analysis) {
                    impactHtml = `
                        <div class="mt-3 pt-3 border-top border-secondary border-opacity-25 w-100">
                            <div class="font-data x-small text-muted mb-2 tracking-widest opacity-75">IMPACT ANALYSIS</div>
                            <div class="d-flex flex-column gap-2">
                                <div class="d-flex align-items-start gap-2">
                                    <i class="fas fa-arrow-right text-success mt-1" style="font-size: 0.6rem;"></i>
                                    <div class="font-body text-white opacity-75" style="font-size: 0.75rem;"><strong class="text-success">Align:</strong> ${data.resolution.impact_analysis.align || ''}</div>
                                </div>
                                <div class="d-flex align-items-start gap-2">
                                    <i class="fas fa-arrow-right text-danger mt-1" style="font-size: 0.6rem;"></i>
                                    <div class="font-body text-white opacity-75" style="font-size: 0.75rem;"><strong class="text-danger">Decline:</strong> ${data.resolution.impact_analysis.decline || ''}</div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                alertBox.innerHTML = `
                    <div class="position-absolute top-0 start-0 w-100 h-100" style="background: linear-gradient(90deg, rgba(34,197,94,0.05) 0%, transparent 100%);"></div>
                    <div class="d-flex align-items-start gap-3 position-relative z-1 w-100">
                        <div class="bg-success bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1" style="width: 24px; height: 24px;">
                            <i class="fas fa-code-branch text-success" style="font-size: 0.7rem;"></i>
                        </div>
                        <div class="flex-grow-1 w-100">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="font-data x-small fw-bold text-success tracking-widest">ADVOCATE PATHWAY</span>
                                <span class="font-data x-small text-muted opacity-50">Just now</span>
                            </div>
                            <div class="font-body small text-white opacity-90 mb-2" style="font-size: 0.85rem; line-height: 1.4;">
                                ${data.resolution.summary}
                            </div>
                            
                            ${subNodesHtml}
                            
                            <div class="d-flex gap-2 w-100 mt-2">
                                <button class="btn btn-sm btn-success font-data x-small py-1 px-3 rounded-pill flex-grow-1 hover-scale transition-all" onclick="this.closest('.rounded-3').style.opacity=0; setTimeout(() => this.closest('.rounded-3').remove(), 300)">
                                    ALIGN
                                </button>
                                <button class="btn btn-sm btn-outline-danger font-data x-small py-1 px-3 rounded-pill flex-grow-1 hover-scale transition-all" onclick="this.closest('.rounded-3').style.opacity=0; setTimeout(() => this.closest('.rounded-3').remove(), 300)">
                                    DECLINE
                                </button>
                                <button class="btn btn-sm btn-outline-secondary font-data x-small py-1 px-3 rounded-pill hover-scale transition-all">
                                    COUNTER
                                </button>
                            </div>
                            
                            ${impactHtml}
                        </div>
                    </div>
                `;
            }
        } else {
            console.error("Advocate failed:", data.message);
            if (alertBox) {
                alertBox.classList.remove('scanning-pulse');
                alertBox.querySelector('button').innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> FAILED';
                alertBox.querySelector('button').classList.replace('btn-danger', 'btn-outline-danger');
            }
        }
    } catch (e) {
        console.error("Error engaging advocate:", e);
    }
}
