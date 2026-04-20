var lastScrollTop = 0;
var navbar = document.getElementById("navbar");

window.addEventListener("scroll", function() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > lastScrollTop) {
        navbar.style.top = "-80px";
    } else {
        navbar.style.top = "0";
    }
    lastScrollTop = scrollTop;
});

// Scroll animations with Intersection Observer
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.scroll-anim');
    animatedElements.forEach(el => observer.observe(el));
});

// MP4 Video autoplay/pause on scroll
const trailerVideo = document.getElementById('trailer-video');

console.log('Video element trouvé:', trailerVideo);

if (trailerVideo) {
    trailerVideo.muted = true;

    const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            console.log('ratio:', entry.intersectionRatio, '| intersecting:', entry.isIntersecting);
            if (entry.isIntersecting) {
                trailerVideo.play().then(() => {
                    console.log('✅ Video playing');
                }).catch(err => {
                    console.error('❌ Play bloqué:', err);
                });
            } else {
                trailerVideo.pause();
                console.log('⏸ Video paused');
            }
        });
    }, {
        threshold: [0, 0.1]
    });

    videoObserver.observe(trailerVideo);
    console.log('Observer attaché à:', trailerVideo.id);
}

// Image Modal - Click to Enlarge
const thumbnailContainer = document.querySelector('.thumbnail-container');
const screenshotContainers = document.querySelectorAll('.screenshot-container');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalDownloadBtn = document.getElementById('modalDownloadBtn');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalBackdrop = document.querySelector('.modal-backdrop');
const modalPrev = document.getElementById('modalPrev');
const modalNext = document.getElementById('modalNext');

const screenshots = Array.from(document.querySelectorAll('.screenshot-image'));
let currentIndex = 0;

function openModal(index) {
    currentIndex = index;
    const src = screenshots[currentIndex].src;
    modalImage.src = src;
    modalDownloadBtn.href = src;
    modalDownloadBtn.download = src.split('/').pop();
    if (modalPrev) modalPrev.disabled = currentIndex === 0;
    if (modalNext) modalNext.disabled = currentIndex === screenshots.length - 1;
    imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
}

if (thumbnailContainer) {
    thumbnailContainer.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) return;
        const imgSrc = this.querySelector('.thumbnail-image').src;
        modalImage.src = imgSrc;
        modalDownloadBtn.href = imgSrc;
        modalDownloadBtn.download = imgSrc.split('/').pop();
        if (modalPrev) modalPrev.style.display = 'none';
        if (modalNext) modalNext.style.display = 'none';
        imageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    });
}

screenshotContainers.forEach((container, index) => {
    container.addEventListener('click', function(e) {
        if (e.target.closest('.download-btn')) return;
        if (modalPrev) modalPrev.style.display = '';
        if (modalNext) modalNext.style.display = '';
        openModal(index);
    });
});

if (modalPrev) {
    modalPrev.addEventListener('click', () => {
        if (currentIndex > 0) openModal(currentIndex - 1);
    });
}

if (modalNext) {
    modalNext.addEventListener('click', () => {
        if (currentIndex < screenshots.length - 1) openModal(currentIndex + 1);
    });
}

if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
        if (imageModal) imageModal.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    });
}

if (modalBackdrop) {
    modalBackdrop.addEventListener('click', () => {
        if (imageModal) imageModal.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    });
}

document.addEventListener('keydown', (e) => {
    if (!imageModal || !imageModal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft' && modalPrev && modalPrev.style.display !== 'none') modalPrev.click();
    if (e.key === 'ArrowRight' && modalNext && modalNext.style.display !== 'none') modalNext.click();
    if (e.key === 'Escape' && imageModal) {
        imageModal.classList.remove('active');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
});


var swiper = new Swiper(".mySwiper", {
    spaceBetween: 0,
    loop: false,
    slidesPerView: 1,
    centeredSlides: true,
    autoplay: {
        delay: 10000,
        disableOnInteraction: false,
    },
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
});

const pauseBtn = document.getElementById("pauseBtn");
let isPaused = false;

const playIcon = `<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
    <rect x="0" y="0" width="3" height="12" rx="1" fill="currentColor"/>
    <rect x="7" y="0" width="3" height="12" rx="1" fill="currentColor"/>
</svg>`;

const pauseIcon = `<svg width="10" height="12" viewBox="0 0 10 12" fill="none">
    <path d="M0 0L10 6L0 12Z" fill="currentColor"/>
</svg>`;

if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
        if (isPaused) {
            swiper.autoplay.resume();
            pauseBtn.innerHTML = playIcon;
            pauseBtn.classList.remove('is-paused');
            const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
            if (activeBullet) activeBullet.style.setProperty("--animation-state", "running");
        } else {
            swiper.autoplay.pause();
            pauseBtn.innerHTML = pauseIcon;
            pauseBtn.classList.add('is-paused');
            const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
            if (activeBullet) activeBullet.style.setProperty("--animation-state", "paused");
        }
        isPaused = !isPaused;
    });
}

swiper.on("slideChange", () => {
    if (pauseBtn && isPaused) {
        isPaused = false;
        pauseBtn.innerHTML = playIcon;
    }
    
    setTimeout(() => {
        const activeBullet = document.querySelector(".swiper-pagination-bullet-active");
        if (activeBullet) {
            activeBullet.style.setProperty("--animation-state", "running");
            activeBullet.style.animation = "none";
            activeBullet.offsetHeight;
            activeBullet.style.animation = "";
        }
    }, 50);
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');

if (hamburgerBtn && sidebar && sidebarOverlay && sidebarClose) {
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
    });

    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
}

document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');

        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');

        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
        }
    });
});


// =============================================
// FICHIERS
// =============================================
const fileInput = document.getElementById('attachment');
const uploadedArea = document.querySelector('.uploaded-area');
let selectedFiles = [];

const fileSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 44 59" fill="none">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M25.6667 0H5.5C4.04131 0 2.64236 0.579462 1.61091 1.61091C0.579462 2.64236 0 4.04131 0 5.5V53.1667C0 54.6254 0.579462 56.0243 1.61091 57.0558C2.64236 58.0872 4.04131 58.6667 5.5 58.6667H38.5C39.9587 58.6667 41.3576 58.0872 42.3891 57.0558C43.4205 56.0243 44 54.6254 44 53.1667V18.3333H43.9853L25.6667 0ZM22 5.88133V21.0833C22 21.5893 22.4107 22 22.9167 22H38.1223C38.3036 21.9996 38.4806 21.9455 38.6311 21.8445C38.7816 21.7435 38.8987 21.6002 38.9678 21.4327C39.0369 21.2651 39.0547 21.0808 39.0191 20.9032C38.9835 20.7255 38.896 20.5623 38.7677 20.4343L23.5657 5.23233C23.4375 5.1038 23.274 5.01624 23.096 4.98073C22.9179 4.94522 22.7334 4.96338 22.5657 5.0329C22.3979 5.10241 22.2547 5.22016 22.154 5.3712C22.0533 5.52225 21.9997 5.6998 22 5.88133Z" fill="#472952"/>
</svg>`;

const deleteSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" style="cursor:pointer; flex-shrink:0;">
    <path d="M18 6L6 18M6 6l12 12" stroke="#A077AF" stroke-width="2" stroke-linecap="round"/>
</svg>`;

if (fileInput) {
    fileInput.addEventListener('change', function () {
        const newFiles = Array.from(this.files);
        newFiles.forEach(newFile => {
            const alreadyExists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size);
            if (!alreadyExists) selectedFiles.push(newFile);
        });
        renderFiles();
    });
}


// =============================================
// CSRF TOKEN — Charger le token au démarrage
// =============================================
let csrfTokenReady = false;

async function ensureCSRFToken(forceRefresh = false) {
    const csrfInput = document.getElementById('csrf_token');
    
    if (!forceRefresh && csrfInput && csrfInput.value && csrfTokenReady) {
        return true;
    }
    
    try {
        const response = await fetch('php/get-csrf-token.php', {
            credentials: 'include'  // ← ajouter
        });
        const data = await response.json();
        if (csrfInput && data.token) {
            csrfInput.value = data.token;
            csrfTokenReady = true;
            console.log('✅ CSRF token chargé');
            return true;
        }
    } catch (e) {
        console.error('Erreur chargement CSRF token:', e);
    }
    return false;
}

document.addEventListener('DOMContentLoaded', async function() {
    await ensureCSRFToken();
    
    try {
        const initResponse = await fetch('php/init-form.php', {
            credentials: 'include' 
        });
        if (initResponse.ok) {
            const initData = await initResponse.json();
            console.log('Form session initialized:', initData);
        }
    } catch (e) {
        console.error('Erreur initialisation TIME-TRAP:', e);
    }
    
    setTimeout(async () => {
        const csrfInput = document.getElementById('csrf_token');
        const response = await fetch('php/get-csrf-token.php');
        const data = await response.json();
        if (csrfInput && data.token) {
            csrfInput.value = data.token;
        }
    }, 55 * 60 * 1000);
});

// =============================================
// reCAPTCHA v3 — Générer le token avant soumission
// =============================================
async function generateRecaptchaToken() {
    if (typeof window.grecaptcha === 'undefined') {
        return '';
    }
    
    try {
        const token = await grecaptcha.execute('VOTRE_SITE_KEY', { action: 'contact' });
        return token;
    } catch (e) {
        console.warn('Erreur reCAPTCHA:', e);
        return '';
    }
}


function renderFiles() {
    uploadedArea.innerHTML = '';

    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;

    selectedFiles.forEach((file, index) => {
        let fileName = file.name;
        if (fileName.length >= 20) {
            const splitName = fileName.split('.');
            fileName = splitName[0].substring(0, 13) + '... .' + splitName[splitName.length - 1];
        }

        const fileSize = file.size < 1024 * 1024
            ? Math.floor(file.size / 1024) + ' KB'
            : (file.size / (1024 * 1024)).toFixed(5) + ' MB';

        const li = document.createElement('li');
        li.classList.add('row');
        li.innerHTML = `
            <div class="content">
                ${fileSVG}
                <div class="details">
                    <span class="name">${fileName}</span>
                    <span class="size">${fileSize}</span>
                </div>
            </div>
            ${deleteSVG}
        `;

        li.querySelector('svg:last-child').addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            renderFiles();
        });

        uploadedArea.appendChild(li);
    });
}


// =============================================
// FORMULAIRE — soumission + validation + overlay
// =============================================
(function () {
    const emailSection = document.querySelector('.email-section');
    const contactForm = document.querySelector('.contact-form');
    if (!emailSection || !contactForm) return;

    const overlay = document.getElementById('formSuccessOverlay');
    const wrapper = document.querySelector('.submit-wrapper');
    const btn = contactForm.querySelector('button');
    const requiredFields = contactForm.querySelectorAll('[required]');
    const emailField = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const btnOriginalHTML = btn.innerHTML;

    // =============================================
    // GESTION DES ERREURS UX — Bandeau inline
    // =============================================
    const errorBanner = document.getElementById('formErrorBanner');
    const errorMessage = document.getElementById('formErrorMessage');

    function showFormError(message, type = 'error') {
        errorBanner.className = 'form-error-banner visible ' + type;
        errorMessage.textContent = message;
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideFormError() {
        errorBanner.className = 'form-error-banner';
    }

    // Mapping codes HTTP → messages humains
    function getErrorMessage(status, serverMessage) {
        if (status === 429) return 'Too many attempts. Please wait an hour before trying again.';
        if (status === 403) {
            if (serverMessage && (serverMessage.includes('session') || serverMessage.includes('token') || serverMessage.includes('expiré'))) {
                // Recharge silencieusement le CSRF pour la prochaine tentative
                ensureCSRFToken(true);
                return 'Your session expired — please try submitting again.';
            }
            return 'Request blocked. Please refresh the page and try again.';
        }
        if (status >= 500) return 'Server error. Your message was not sent — please try again later.';
        if (serverMessage) return serverMessage;
        return 'Something went wrong. Please try again.';
    }

    // --- 1. VALIDATION ---
    function checkValidity() {
        const allValid = Array.from(requiredFields).every(field => {
            if (field.type === 'file') return true;
            const config = fieldConfig[field.id];
            if (!config) return field.value.trim() !== '';
            return config.validate(field.value.trim());
        });

        if (allValid) {
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
            wrapper.classList.remove('form-invalid');
        } else {
            btn.classList.add('disabled');
            btn.style.pointerEvents = 'none';
            wrapper.classList.add('form-invalid');
        }
    }

    // --- 2. ÉCOUTEURS DE VALIDATION ---
    // --- Icône d'erreur inline ---
    const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 16 16" fill="none" style="flex-shrink:0">
        <circle cx="8" cy="8" r="7.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M8 4.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="8" cy="11" r=".8" fill="currentColor"/>
    </svg>`;

    const fieldConfig = {
        'full-name': {
            empty:    'Please enter your full name.',
            invalid:  'Name must be at least 2 characters and contain no numbers.',
            validate: val => val.length >= 2 && !/\d/.test(val)
        },
        'email': {
            empty:    'Please enter your email address.',
            invalid:  'Please enter a valid email address (ex: name@domain.com).',
            validate: val => emailRegex.test(val)
        },
        'subject': {
            empty:    'Please enter a subject.',
            invalid:  'Subject must be at least 5 characters.',
            validate: val => val.length >= 5
        },
        'message': {
            empty:    'Please write your message.',
            invalid:  'Message must be at least 20 characters.',
            validate: val => val.length >= 20
        },
    };

    function showFieldError(field, msg) {
    field.classList.add('error-state');
    let errEl = field.parentElement.querySelector('.field-error');
    if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'field-error';
        field.parentElement.appendChild(errEl);
    }
    errEl.innerHTML = `${errorIcon} ${msg}`;
    }

    function clearFieldError(field) {
        field.classList.remove('error-state');
        const errEl = field.parentElement.querySelector('.field-error');
        if (errEl) errEl.remove();
    }

    function validateField(field) {
        const config = fieldConfig[field.id];
        if (!config) return;
        const val = field.value.trim();
        if (val === '') {
            clearFieldError(field);
        } else if (!config.validate(val)) {
            showFieldError(field, config.invalid);
        } else {
            clearFieldError(field);
        }
    }

    function validateFieldOnBlur(field) {
        const config = fieldConfig[field.id];
        if (!config) return;
        const val = field.value.trim();
        if (val === '') {
            showFieldError(field, config.empty);
        } else if (!config.validate(val)) {
            showFieldError(field, config.invalid);
        } else {
            clearFieldError(field);
        }
    }

    function clearAllFieldErrors() {
        Object.keys(fieldConfig).forEach(id => {
            const field = document.getElementById(id);
            if (field) clearFieldError(field);
        });
    }

    Object.keys(fieldConfig).forEach(id => {
        const field = document.getElementById(id);
        if (!field) return;
        field.addEventListener('input', () => {
            validateField(field);
            checkValidity();
        });
        field.addEventListener('blur', () => {
            validateFieldOnBlur(field);
            checkValidity();
        });
    });

    // --- 3. SOUMISSION DU FORMULAIRE ---
    emailSection.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (btn.classList.contains('disabled')) return;

        hideFormError();

                const submissionTimeInput = document.getElementById('submission_time');
        if (submissionTimeInput) {
            submissionTimeInput.value = Date.now();
        }

        // NOUVELLE VÉRIFICATION : Poids total des fichiers
        const MAX_TOTAL_SIZE = 15 * 1024 * 1024; // 15 Mo (ajuste selon post_max_size)
        let totalFilesSize = 0;
        selectedFiles.forEach(file => {
            totalFilesSize += file.size;
        });

        if (totalFilesSize > MAX_TOTAL_SIZE) {
            const sizeInMB = (totalFilesSize / (1024 * 1024)).toFixed(5);
            showFormError(`The total size of your files is too large (${sizeInMB} MB). Maximum allowed: 15 MB.`);
            return; // On arrête tout ici, pas d'envoi vers le serveur
        }

        // --- Début de l'envoi habituel ---
        btn.classList.add('disabled');
        btn.style.pointerEvents = 'none';
        btn.innerHTML = 'Sending...';

        // Cacher l'erreur précédente dès qu'on retente
        hideFormError();

        // Garder le status HTTP pour le mapping d'erreur
        let httpStatus = 0;

        try {
            const tokenReady = await ensureCSRFToken();
            if (!tokenReady) {
                throw new Error('Unable to load security token. Please refresh the page.');
            }
            
            const recaptchaToken = await generateRecaptchaToken();
            const recaptchaInput = document.getElementById('recaptcha_token');
            if (recaptchaInput && recaptchaToken) {
                recaptchaInput.value = recaptchaToken;
            }
            
            const formData = new FormData(emailSection);

            // Retire les fichiers de l'input et rajoute ceux de selectedFiles
            formData.delete('attachment');
            selectedFiles.forEach(file => formData.append('attachment[]', file));

            // Vérification taille fichiers côté client
            const maxSize = 5 * 1024 * 1024; // 5MB — limite pour un fichier individuel
            const totalMax = 15 * 1024 * 1024; // 15MB post_max_size

            let totalSize = 0;
            for (const file of selectedFiles) {
                if (file.size > maxSize) {
                    showFormError(`"${file.name}" exceeds the 5MB limit. Please compress or remove it.`);
                    btn.innerHTML = btnOriginalHTML;
                    checkValidity();
                    return;
                }
                totalSize += file.size;
            }
            if (totalSize > totalMax) {
                showFormError(`Total file size exceeds 15MB. Please reduce the number of files.`);
                btn.innerHTML = btnOriginalHTML;
                checkValidity();
                return;
            }

            // Réinitialise le timestamp juste avant l'envoi
            const submissionTimeInput = document.getElementById('submission_time');
            if (submissionTimeInput) {
                submissionTimeInput.value = Date.now();
            }

            const tooLargeFiles = selectedFiles.filter(f => f.size > 5 * 1024 * 1024);
            if (tooLargeFiles.length > 0) {
                const names = tooLargeFiles.map(f => f.name).join(', ');
                showFormError(`These files exceed 5MB : ${names}`);
                btn.innerHTML = btnOriginalHTML;
                checkValidity();
                return;
            }

            const response = await fetch('php/contact-form.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            // Sauvegarder le status pour le mapping d'erreur
            httpStatus = response.status;

            const text = await response.text();
            if (!text) {
                throw new Error('Empty response from server.');
            }

            const result = JSON.parse(text);

            if (result.success) {
                // Succès : vider le formulaire et afficher l'overlay
                hideFormError();
                if (overlay) overlay.classList.add('visible');
                contactForm.querySelectorAll('input, textarea').forEach(input => {
                    input.value = '';
                    if (input.type === 'file') input.value = null;
                });
                selectedFiles = [];
                if (uploadedArea) uploadedArea.innerHTML = '';
                clearAllFieldErrors();
                emailField.classList.remove('invalid');
                
                await ensureCSRFToken(true);
                
                setTimeout(() => { if (overlay) overlay.classList.remove('visible'); }, 3000);
            } else {
                // === MODIFIÉ : bandeau au lieu de alert ===
                showFormError(getErrorMessage(httpStatus, result.message));
            }
        } catch (error) {
            console.error('Erreur complète:', error);
            // === MODIFIÉ : bandeau au lieu de alert, avec détection réseau ===
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                showFormError('Network error — check your connection and try again.', 'warning');
            } else {
                showFormError(getErrorMessage(httpStatus, error.message));
            }
        } finally {
            btn.innerHTML = btnOriginalHTML;
            btn.classList.remove('disabled');
            btn.style.pointerEvents = 'auto';
            checkValidity();
        }
    });
    checkValidity();
})();